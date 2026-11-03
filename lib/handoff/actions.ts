"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { requestIp } from "@/lib/admin/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEvent } from "@/lib/db/events";
import { isHandoffId } from "@/lib/handoff/link";
import { hasCardOutline, toPendingCard, type PendingCard } from "@/lib/pendingCard";
import { createClient } from "@/lib/supabase/server";

/**
 * Carries an unsaved card from Instagram's or Facebook's in-app browser to
 * Chrome or Safari, and into the visitor's account.
 *
 * The in-app browser's storage (lib/pendingCard.ts) cannot be read from the
 * real one, and the real one may not be the browser the trip ends in either:
 * Google can hand the return to a Custom Tab, a new tab or another browser.
 * So the server copy is the card, and no browser's storage is trusted to hold
 * it. When the visitor taps "Save and continue" there, the card is saved here
 * under a short random id, and the id rides on every URL of the trip
 * (lib/handoff/link.ts): the Chrome or Safari link, /login, the sign-in's
 * return path, and /create after it. There, signed in, the card is adopted:
 * saved as an invitation in the account (adoptDraftHandoff).
 *
 * SUPABASE STORAGE, PRIVATE. One JSON file per card in the `draft-handoffs`
 * bucket, which is never public and is only touched here, with the service
 * role. The bucket makes itself the first time it is needed, so there is no
 * migration to run. A card holds text and ids only: the editor has no photo
 * upload, and a photo border is a built-in picture named by id.
 *
 * ONE DAY, ONE USE. Nothing reads a card without saving it to an account:
 * opening /login does not touch it. The file is deleted only once the
 * invitation is written, and a short receipt (`adopted/<id>.json`) is left
 * that names the account and the invitation, so the same visitor reloading
 * the page is sent to the same invitation instead of a second copy, and
 * anyone else gets nothing. A card older than a day is refused and deleted.
 * Every save also sweeps away the oldest expired files.
 *
 * Every export is a public endpoint, as every export of a "use server" module
 * is, so nothing they receive is trusted: the id must have the exact shape
 * this file makes, the card must have a card's outline and stay under a size
 * limit, each address may save a few cards in ten minutes, and adopting needs
 * a signed-in account.
 */

const BUCKET = "draft-handoffs";
const TTL_MS = 24 * 60 * 60 * 1000;
/** A card is a few kilobytes; this leaves room for long translated text. */
const MAX_BYTES = 200_000;
/** Where a card adopted into an account leaves its receipt. */
const ADOPTED_DIR = "adopted";
/** Where an adoption in progress holds its lock. */
const LOCK_DIR = "locks";
/** A lock older than this was left by a request that died; it is taken over. */
const LOCK_STALE_MS = 60 * 1000;

const SAVES_PER_WINDOW = 10;
const WINDOW_MS = 10 * 60 * 1000;
/** Best effort, per instance, like the Help bot's limiter (lib/help/rateLimit.ts). */
const recentSaves = new Map<string, number[]>();

function takeSlot(ip: string): boolean {
  const now = Date.now();
  const times = (recentSaves.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);

  if (times.length >= SAVES_PER_WINDOW) {
    recentSaves.set(ip, times);
    return false;
  }

  times.push(now);
  recentSaves.delete(ip);
  recentSaves.set(ip, times);

  while (recentSaves.size > 10_000) {
    const oldest = recentSaves.keys().next();

    if (oldest.done === true) {
      break;
    }

    recentSaves.delete(oldest.value);
  }

  return true;
}

interface StoredHandoff {
  card: PendingCard;
  savedAt: number;
}

function fileName(id: string): string {
  return `${id}.json`;
}

/**
 * Deletes the oldest files that have passed their day: cards, receipts and
 * locks left behind. Never throws.
 */
async function sweepExpired(): Promise<void> {
  try {
    const storage = createAdminClient().storage.from(BUCKET);
    const cutoff = Date.now() - TTL_MS;

    for (const folder of ["", ADOPTED_DIR, LOCK_DIR]) {
      const { data } = await storage.list(folder, {
        limit: 100,
        sortBy: { column: "created_at", order: "asc" },
      });
      /* A folder is listed with no created_at, so it is never picked. */
      const expired = (data ?? [])
        .filter((file) => file.created_at && Date.parse(file.created_at) < cutoff)
        .map((file) => (folder === "" ? file.name : `${folder}/${file.name}`));

      if (expired.length > 0) {
        await storage.remove(expired);
      }
    }
  } catch (cause: unknown) {
    console.error("[handoff] sweep failed:", cause);
  }
}

/**
 * Saves a card and returns the id to put on the link. `ok: false` means the
 * link goes without one: the visitor still reaches Chrome, just without
 * their card.
 */
export async function saveDraftHandoff(
  card: unknown,
): Promise<{ ok: true; id: string } | { ok: false }> {
  if (!hasCardOutline(card)) {
    return { ok: false };
  }

  const stored: StoredHandoff = { card, savedAt: Date.now() };
  const body = JSON.stringify(stored);

  if (body.length > MAX_BYTES) {
    return { ok: false };
  }

  if (!takeSlot(requestIp(await headers()))) {
    return { ok: false };
  }

  const id = randomBytes(12).toString("base64url");

  try {
    const storage = createAdminClient().storage;
    const upload = () =>
      storage.from(BUCKET).upload(fileName(id), body, {
        contentType: "application/json",
        upsert: false,
      });

    let { error } = await upload();

    /* The first save anywhere: make the private bucket, then try once more. */
    if (error !== null && /bucket not found/i.test(error.message)) {
      const made = await storage.createBucket(BUCKET, {
        public: false,
        fileSizeLimit: MAX_BYTES,
        allowedMimeTypes: ["application/json"],
      });

      if (made.error !== null && !/already exists/i.test(made.error.message)) {
        console.error("[handoff] could not make the bucket:", made.error);
        return { ok: false };
      }

      ({ error } = await upload());
    }

    if (error !== null) {
      console.error("[handoff] could not save the card:", error);
      return { ok: false };
    }
  } catch (cause: unknown) {
    console.error("[handoff] save failed:", cause);
    return { ok: false };
  }

  after(sweepExpired);

  return { ok: true, id };
}

type Storage = ReturnType<ReturnType<typeof createAdminClient>["storage"]["from"]>;

/** What adopting a card leaves behind: whose it now is, and where. */
interface Receipt {
  userId: string;
  eventId: string;
  step: string | null;
  adoptedAt: number;
}

/** A JSON file from the bucket, parsed; null when it is not there or will not parse. */
async function readJson(storage: Storage, path: string): Promise<unknown> {
  const { data, error } = await storage.download(path);

  if (error !== null || data === null) {
    return null;
  }

  try {
    return JSON.parse(await data.text()) as unknown;
  } catch {
    return null;
  }
}

async function readReceipt(storage: Storage, id: string): Promise<Receipt | null> {
  const parsed = await readJson(storage, `${ADOPTED_DIR}/${fileName(id)}`);

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Partial<Receipt>).userId !== "string" ||
    typeof (parsed as Partial<Receipt>).eventId !== "string"
  ) {
    return null;
  }

  const receipt = parsed as Receipt;

  return {
    userId: receipt.userId,
    eventId: receipt.eventId,
    step: typeof receipt.step === "string" ? receipt.step : null,
    adoptedAt: typeof receipt.adoptedAt === "number" ? receipt.adoptedAt : 0,
  };
}

/**
 * Takes the lock on one card, so two requests for it (a reload while the
 * first is still saving, two tabs) cannot save it twice. Creating a file
 * that must not exist yet is the lock; one left by a request that died is
 * taken over.
 */
async function takeLock(storage: Storage, id: string): Promise<boolean> {
  const path = `${LOCK_DIR}/${fileName(id)}`;
  const lock = () =>
    storage.upload(path, JSON.stringify({ at: Date.now() }), {
      contentType: "application/json",
      upsert: false,
    });

  if ((await lock()).error === null) {
    return true;
  }

  const held = await readJson(storage, path);
  const at =
    typeof held === "object" && held !== null && "at" in held && typeof held.at === "number"
      ? held.at
      : 0;

  if (Date.now() - at < LOCK_STALE_MS) {
    return false;
  }

  await storage.remove([path]);
  return (await lock()).error === null;
}

async function dropLock(storage: Storage, id: string): Promise<void> {
  await storage.remove([`${LOCK_DIR}/${fileName(id)}`]);
}

export type AdoptResult =
  /** The card is an invitation in this account. `step` is where it was left. */
  | { ok: true; eventId: string; step: string | null }
  | {
      ok: false;
      /**
       * signed-out: nobody is signed in, and the card is left as it was.
       * missing: no such card, past its day, or adopted by another account.
       * busy: another request is saving it right now; ask again shortly.
       * failed: something broke; the card is left as it was.
       */
      reason: "signed-out" | "missing" | "busy" | "failed";
    };

/**
 * Saves the card under `id` as an invitation in the signed-in account, and
 * only then deletes it: the one way a card leaves the bucket, apart from its
 * day running out.
 *
 * Asked again for a card this same account has already adopted, it answers
 * with that invitation rather than making a second one. Any other account
 * gets `missing`, so a card is never shown to anyone but the one who adopts
 * it first.
 */
export async function adoptDraftHandoff(id: unknown): Promise<AdoptResult> {
  if (!isHandoffId(id)) {
    return { ok: false, reason: "missing" };
  }

  let userId: string;

  try {
    const { data, error } = await (await createClient()).auth.getUser();

    if (error !== null || data.user === null) {
      return { ok: false, reason: "signed-out" };
    }

    userId = data.user.id;
  } catch (cause: unknown) {
    console.error("[handoff] could not read the session:", cause);
    return { ok: false, reason: "failed" };
  }

  const fromReceipt = (receipt: Receipt | null): AdoptResult =>
    receipt !== null && receipt.userId === userId
      ? { ok: true, eventId: receipt.eventId, step: receipt.step }
      : { ok: false, reason: "missing" };

  let storage: Storage;

  try {
    storage = createAdminClient().storage.from(BUCKET);

    /* Already adopted: the same visitor back again, or someone else. */
    const earlier = await readReceipt(storage, id);

    if (earlier !== null) {
      return fromReceipt(earlier);
    }

    if (!(await takeLock(storage, id))) {
      return { ok: false, reason: "busy" };
    }
  } catch (cause: unknown) {
    console.error("[handoff] adopt failed before the lock:", cause);
    return { ok: false, reason: "failed" };
  }

  try {
    const stored = await readJson(storage, fileName(id));

    if (stored === null) {
      /* Adopted between the first look and the lock, or never there at all. */
      return fromReceipt(await readReceipt(storage, id));
    }

    if (
      typeof stored !== "object" ||
      !("savedAt" in stored) ||
      typeof stored.savedAt !== "number" ||
      Date.now() - stored.savedAt > TTL_MS ||
      !("card" in stored) ||
      !hasCardOutline(stored.card)
    ) {
      await storage.remove([fileName(id)]);
      return { ok: false, reason: "missing" };
    }

    const card = toPendingCard(stored.card);
    const saved = await createEvent(
      card.draft,
      /* The wizard's, as a card restored in the browser is (restoredSnapshot in lib/newCard.ts). */
      { ...card.config, editor: "wizard" },
      card.coverAnimation ?? "",
      { showWeather: card.showWeather === true, themeId: card.weatherTheme ?? "" },
      card.qrCheckinEnabled === true,
    );

    if (!saved.ok) {
      /* The card stays where it is, to be tried again. */
      console.error("[handoff] could not save the card to the account:", saved.error);
      return { ok: false, reason: "failed" };
    }

    const receipt: Receipt = {
      userId,
      eventId: saved.data.id,
      step: card.step ?? null,
      adoptedAt: Date.now(),
    };
    const written = await storage.upload(
      `${ADOPTED_DIR}/${fileName(id)}`,
      JSON.stringify(receipt),
      { contentType: "application/json", upsert: true },
    );

    if (written.error !== null) {
      console.error("[handoff] could not write the receipt:", written.error);
    }

    /* Saved to the account: only now is the card itself deleted. */
    await storage.remove([fileName(id)]);

    return { ok: true, eventId: receipt.eventId, step: receipt.step };
  } catch (cause: unknown) {
    console.error("[handoff] adopt failed:", cause);
    return { ok: false, reason: "failed" };
  } finally {
    await dropLock(storage, id).catch(() => undefined);
  }
}
