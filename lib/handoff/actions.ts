"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { after } from "next/server";
import { requestIp } from "@/lib/admin/rateLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasCardOutline, type PendingCard } from "@/lib/pendingCard";

/**
 * Carries an unsaved card from Instagram's or Facebook's in-app browser to
 * Chrome or Safari.
 *
 * The in-app browser's storage (lib/pendingCard.ts) cannot be read from the
 * real one. When the visitor taps "Save and continue" there, the card is
 * saved here under a short random id, the id rides on the link to /login in
 * the real browser (components/browser/useInAppHandoff.tsx), and /login
 * claims it (components/browser/DraftHandoffRestore.tsx).
 *
 * SUPABASE STORAGE, PRIVATE. One JSON file per card in the `draft-handoffs`
 * bucket, which is never public and is only touched here, with the service
 * role. The bucket makes itself the first time it is needed, so there is no
 * migration to run. A card holds text and ids only: the editor has no photo
 * upload, and a photo border is a built-in picture named by id.
 *
 * ONE DAY, ONE USE. A claim deletes the file, and one older than a day is
 * refused and deleted. Every save also sweeps away the oldest expired files.
 *
 * Both exports are public endpoints, as every export of a "use server" module
 * is, so nothing they receive is trusted: the id must have the exact shape
 * this file makes, the card must have a card's outline and stay under a size
 * limit, and each address may save a few cards in ten minutes.
 */

const BUCKET = "draft-handoffs";
const TTL_MS = 24 * 60 * 60 * 1000;
/** A card is a few kilobytes; this leaves room for long translated text. */
const MAX_BYTES = 200_000;
/** 12 random bytes: 16 characters of base64url. */
const ID_SHAPE = /^[A-Za-z0-9_-]{16}$/;

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

/** Deletes the oldest files that have passed their day. Never throws. */
async function sweepExpired(): Promise<void> {
  try {
    const storage = createAdminClient().storage.from(BUCKET);
    const { data } = await storage.list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "asc" },
    });
    const cutoff = Date.now() - TTL_MS;
    const expired = (data ?? [])
      .filter((file) => file.created_at && Date.parse(file.created_at) < cutoff)
      .map((file) => file.name);

    if (expired.length > 0) {
      await storage.remove(expired);
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

/**
 * Takes the card saved under `id`, deleting it: it can be claimed once.
 * `missing` covers a wrong id, one already claimed and one past its day.
 */
export async function claimDraftHandoff(
  id: unknown,
): Promise<{ ok: true; card: PendingCard } | { ok: false; reason: "missing" | "failed" }> {
  if (typeof id !== "string" || !ID_SHAPE.test(id)) {
    return { ok: false, reason: "missing" };
  }

  try {
    const storage = createAdminClient().storage.from(BUCKET);
    const { data, error } = await storage.download(fileName(id));

    if (error !== null || data === null) {
      return { ok: false, reason: "missing" };
    }

    const parsed: unknown = JSON.parse(await data.text());
    await storage.remove([fileName(id)]);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("savedAt" in parsed) ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > TTL_MS ||
      !("card" in parsed) ||
      !hasCardOutline(parsed.card)
    ) {
      return { ok: false, reason: "missing" };
    }

    return { ok: true, card: parsed.card };
  } catch (cause: unknown) {
    console.error("[handoff] claim failed:", cause);
    return { ok: false, reason: "failed" };
  }
}
