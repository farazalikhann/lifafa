"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { adminSession } from "@/lib/admin/auth";
import {
  CARD_MUSIC_BUCKET,
  CARD_MUSIC_BUCKET_TYPES,
  CARD_MUSIC_MAX_BYTES,
  CARD_MUSIC_TYPES,
  cardMusicExtension,
  cardMusicRefusal,
  isCardMusicPath,
} from "@/lib/admin/cardMusic";
import {
  COMPLIMENTARY_REASON_MAX_LENGTH,
  type ActivateFreeResult,
} from "@/lib/admin/complimentary";
import { ADMIN_UNLOCK_HOURS } from "@/lib/eventLock";
import { templatePricePaise } from "@/templates/registry";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  ────────────────────────────────────────────────────────────────────────────
  The admin's two overrides of the lock after the event (lib/eventLock.ts),
  activating an invitation for free, and a card's own song (at the foot).

  Every export of this file is a public endpoint with a stable id, so each one
  checks the admin session first, and a call without one does nothing at all —
  no redirect and no error that would describe what is behind the gate. See
  app/admin/coupons/actions.ts, which these follow.

  Written through the service role. The events_guard_card_edits trigger (0013)
  puts back any value a host sends for these columns and lets the server's own
  writes through, which is what makes these the only way to change them.
  ────────────────────────────────────────────────────────────────────────────
*/

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The event id a form posted, if it is a well-formed one. */
function eventIdFrom(formData: FormData): string | null {
  const id = formData.get("eventId");
  return typeof id === "string" && UUID.test(id) ? id : null;
}

/** Lets the host edit an ended invitation for ADMIN_UNLOCK_HOURS from now. */
export async function unlockEventEditing(formData: FormData): Promise<void> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] unlockEventEditing called without a session.");
    return;
  }

  const id = eventIdFrom(formData);

  if (id === null) {
    console.warn("[admin] unlockEventEditing called with a malformed form.");
    return;
  }

  const until = new Date(Date.now() + ADMIN_UNLOCK_HOURS * 60 * 60 * 1000);
  const { error } = await createAdminClient()
    .from("events")
    .update({ edit_unlocked_until: until.toISOString() })
    .eq("id", id);

  if (error !== null) {
    console.error(`[admin] could not unlock event ${id}:`, error);
    return;
  }

  console.info(
    `[admin] ${session.username} unlocked event ${id} until ${until.toISOString()}`,
  );
  revalidatePath(`/admin/events/${id}`);
}

/** Gives a paid invitation its two date changes and three name changes back. */
export async function resetEventChangeCounts(formData: FormData): Promise<void> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] resetEventChangeCounts called without a session.");
    return;
  }

  const id = eventIdFrom(formData);

  if (id === null) {
    console.warn("[admin] resetEventChangeCounts called with a malformed form.");
    return;
  }

  const { error } = await createAdminClient()
    .from("events")
    .update({ date_change_count: 0, name_change_count: 0 })
    .eq("id", id);

  if (error !== null) {
    console.error(`[admin] could not reset change counts for event ${id}:`, error);
    return;
  }

  console.info(`[admin] ${session.username} reset change counts for event ${id}`);
  revalidatePath(`/admin/events/${id}`);
}

/**
 * Marks an unpaid invitation paid with nothing received, and says why.
 *
 * Called with plain arguments from components/admin/ActivateFreeButton.tsx, so
 * both are checked as strings here: they are whatever crossed the wire.
 *
 * grant_complimentary (0014) does the work in one transaction: a ₹0
 * 'complimentary' payment row with the reason, this admin's username and the
 * time, and the event marked paid exactly as the webhook marks it — through
 * the service role, so 0013's trigger records original_end_date.
 */
export async function activateEventForFree(
  eventId: unknown,
  reason: unknown,
): Promise<ActivateFreeResult> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] activateEventForFree called without a session.");
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (typeof eventId !== "string" || !UUID.test(eventId)) {
    return { ok: false, error: "That event id is not valid." };
  }

  const trimmed = typeof reason === "string" ? reason.trim() : "";

  if (trimmed.length === 0) {
    return { ok: false, error: "Give a short reason, for example Friend or Testing." };
  }

  if (trimmed.length > COMPLIMENTARY_REASON_MAX_LENGTH) {
    return {
      ok: false,
      error: `Keep the reason under ${COMPLIMENTARY_REASON_MAX_LENGTH} characters.`,
    };
  }

  /*
    What is being given away: the price of the template this invitation is
    on, which is what the free row records as its discount. A card that
    cannot be read is priced as Classic, and the function below still refuses
    an id that names no event.
  */
  const admin = createAdminClient();
  const { data: card } = await admin
    .from("events")
    .select("card_config")
    .eq("id", eventId)
    .maybeSingle();

  const { data: outcome, error } = await admin.rpc("grant_complimentary", {
    p_event_id: eventId,
    p_reason: trimmed,
    p_granted_by: session.username,
    p_list_price: templatePricePaise(card?.card_config?.templateId),
  });

  if (error !== null) {
    console.error(`[admin] could not activate event ${eventId} for free:`, error);
    return { ok: false, error: "Could not activate this event. Please try again." };
  }

  switch (outcome) {
    case "ok":
      console.info(
        `[admin] ${session.username} activated event ${eventId} for free (${trimmed})`,
      );
      revalidatePath("/admin/complimentary");
      revalidatePath(`/admin/events/${eventId}`);
      return { ok: true };
    case "already_paid":
      return { ok: false, error: "This event is already active." };
    case "not_found":
      return { ok: false, error: "No event with that id." };
    case "no_date":
      return {
        ok: false,
        error: "This event has no date yet. The host needs to add one first.",
      };
    case "bad_reason":
      return { ok: false, error: "Give a short reason, for example Friend or Testing." };
    default:
      console.error(
        `[admin] grant_complimentary(${eventId}) answered ${String(outcome)}`,
      );
      return { ok: false, error: "Could not activate this event. Please try again." };
  }
}

/*
  ────────────────────────────────────────────────────────────────────────────
  A card's own song (lib/admin/cardMusic.ts).

  Three steps, so the file never passes through this server: a Vercel function
  takes a request body of a few megabytes at most, and a song is up to eight.

    1. prepareCustomMusicUpload: the admin session, the file's name and size,
       and an event that exists; then a signed upload address for one new
       path in the public CARD_MUSIC_BUCKET, good for that path only.
    2. The browser sends the file straight to Storage on that address.
    3. setCustomMusic: the admin session again, a path this flow made for this
       event, a file that is really there and within the limits; then the
       card's musicUrl, and nothing else, is set to its public address.

  removeCustomMusic sets musicUrl back to null.

  NOTHING ELSE ABOUT THE CARD CHANGES. The stored card_config is read and
  written back whole with one key replaced, through the service role, so the
  lock trigger (0013) lets it through on a paid card, an ended one or a locked
  one, and counts no date or name change: event_draft is not in the write.
  is_paid, the payment and the lock columns are not in it either. The write
  only lands if the row is still the one that was read (updated_at), so a host
  saving at the same moment cannot have their save undone by this one.

  The bucket is public to read, so a guest's phone fetches the song with no
  key. Nobody can write to it but the service role: it has no Storage policy
  at all, and a signed upload address is made only here, behind the session.
  ────────────────────────────────────────────────────────────────────────────
*/

/** What the panel is told when something it cannot fix went wrong. */
const MUSIC_FAILED = "Could not save the music. Please try again.";

export type PrepareMusicUploadResult =
  | {
      ok: true;
      /** The stored name, `<eventId>/<timestamp>.<ext>`. */
      path: string;
      /** The signed upload's token, for uploadToSignedUrl. */
      token: string;
      /** The type the file must be sent as. */
      contentType: string;
    }
  | { ok: false; error: string };

export type CustomMusicResult =
  | { ok: true; musicUrl: string | null }
  | { ok: false; error: string };

type AdminClient = ReturnType<typeof createAdminClient>;

/** The bucket, made on first use exactly as lib/handoff/actions.ts makes its own. */
async function ensureMusicBucket(admin: AdminClient): Promise<boolean> {
  const made = await admin.storage.createBucket(CARD_MUSIC_BUCKET, {
    public: true,
    fileSizeLimit: CARD_MUSIC_MAX_BYTES,
    allowedMimeTypes: [...CARD_MUSIC_BUCKET_TYPES],
  });

  if (made.error !== null && !/already exists/i.test(made.error.message)) {
    console.error("[admin] could not make the card music bucket:", made.error);
    return false;
  }

  return true;
}

/** Whether an event with this id exists; null when the read failed. */
async function eventExists(admin: AdminClient, eventId: string): Promise<boolean | null> {
  const { data, error } = await admin
    .from("events")
    .select("id")
    .eq("id", eventId)
    .maybeSingle();

  if (error !== null) {
    console.error(`[admin] could not read event ${eventId}:`, error);
    return null;
  }

  return data !== null;
}

/** Step 1: a signed address to upload one song for one event to. */
export async function prepareCustomMusicUpload(
  eventId: unknown,
  fileName: unknown,
  bytes: unknown,
): Promise<PrepareMusicUploadResult> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] prepareCustomMusicUpload called without a session.");
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (typeof eventId !== "string" || !UUID.test(eventId)) {
    return { ok: false, error: "That event id is not valid." };
  }

  const name = typeof fileName === "string" ? fileName : "";
  const size = typeof bytes === "number" ? bytes : Number.NaN;
  const refusal = cardMusicRefusal(name, size);
  const extension = cardMusicExtension(name);

  if (refusal !== null || extension === null) {
    return { ok: false, error: refusal ?? "Only .mp3 and .m4a files can be used." };
  }

  const admin = createAdminClient();
  const exists = await eventExists(admin, eventId);

  if (exists === null) {
    return { ok: false, error: MUSIC_FAILED };
  }

  if (!exists) {
    return { ok: false, error: "No event with that id." };
  }

  /* A new name every time: see lib/admin/cardMusic.ts. */
  const path = `${eventId}/${Date.now()}.${extension}`;
  const sign = () => admin.storage.from(CARD_MUSIC_BUCKET).createSignedUploadUrl(path);

  try {
    let { data, error } = await sign();

    /* The first song anywhere: make the public bucket, then try once more. */
    if (error !== null && /not found/i.test(error.message)) {
      if (!(await ensureMusicBucket(admin))) {
        return { ok: false, error: MUSIC_FAILED };
      }

      ({ data, error } = await sign());
    }

    if (error !== null || data === null) {
      console.error(`[admin] could not sign a music upload for ${eventId}:`, error);
      return { ok: false, error: MUSIC_FAILED };
    }

    return {
      ok: true,
      path: data.path,
      token: data.token,
      contentType: CARD_MUSIC_TYPES[extension],
    };
  } catch (cause: unknown) {
    console.error(`[admin] music upload for ${eventId} failed:`, cause);
    return { ok: false, error: MUSIC_FAILED };
  }
}

/**
 * Sets card_config.musicUrl, and only that, on one event. Null takes the music
 * off. See the note above the three actions.
 */
async function writeMusicUrl(
  admin: AdminClient,
  eventId: string,
  musicUrl: string | null,
): Promise<CustomMusicResult> {
  /* Twice at most: once more if a host's save landed between the read and the write. */
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: row, error: readError } = await admin
      .from("events")
      .select("card_config, updated_at")
      .eq("id", eventId)
      .maybeSingle();

    if (readError !== null) {
      console.error(`[admin] could not read event ${eventId}:`, readError);
      return { ok: false, error: MUSIC_FAILED };
    }

    if (row === null) {
      return { ok: false, error: "No event with that id." };
    }

    const { data: written, error } = await admin
      .from("events")
      .update({ card_config: { ...row.card_config, musicUrl } })
      .eq("id", eventId)
      .eq("updated_at", row.updated_at)
      .select("id");

    if (error !== null) {
      console.error(`[admin] could not set the music of event ${eventId}:`, error);
      return { ok: false, error: MUSIC_FAILED };
    }

    if ((written ?? []).length === 1) {
      return { ok: true, musicUrl };
    }
  }

  return {
    ok: false,
    error: "The host was saving this card at the same moment. Try again.",
  };
}

/** Step 3: the uploaded song becomes the card's music. */
export async function setCustomMusic(
  eventId: unknown,
  path: unknown,
): Promise<CustomMusicResult> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] setCustomMusic called without a session.");
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (
    typeof eventId !== "string" ||
    !UUID.test(eventId) ||
    typeof path !== "string" ||
    !isCardMusicPath(eventId, path)
  ) {
    return { ok: false, error: "That upload is not valid. Upload the song again." };
  }

  const admin = createAdminClient();
  const storage = admin.storage.from(CARD_MUSIC_BUCKET);
  const fileName = path.slice(eventId.length + 1);

  /*
    The file is really there, and within the limits, before any card points
    at it. The bucket enforces both on the way in; asked again here because a
    card playing a missing file is a silent card, and nobody would know.
  */
  const { data: listed, error: listError } = await storage.list(eventId, {
    search: fileName,
    limit: 10,
  });

  if (listError !== null) {
    console.error(`[admin] could not find the music for ${eventId}:`, listError);
    return { ok: false, error: MUSIC_FAILED };
  }

  const file = (listed ?? []).find((entry) => entry.name === fileName);
  const size = Number(file?.metadata?.size ?? 0);

  if (file === undefined || size <= 0) {
    return { ok: false, error: "The upload did not arrive. Upload the song again." };
  }

  if (size > CARD_MUSIC_MAX_BYTES) {
    await storage.remove([path]);
    return { ok: false, error: "That file is over 8 MB." };
  }

  const musicUrl = storage.getPublicUrl(path).data.publicUrl;
  const result = await writeMusicUrl(admin, eventId, musicUrl);

  if (result.ok) {
    console.info(`[admin] ${session.username} set custom music on event ${eventId}: ${path}`);
    revalidatePath(`/admin/events/${eventId}`);
    after(() => sweepOldMusic(eventId, path));
  }

  return result;
}

/** Takes the music off the card: musicUrl back to null. */
export async function removeCustomMusic(eventId: unknown): Promise<CustomMusicResult> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] removeCustomMusic called without a session.");
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (typeof eventId !== "string" || !UUID.test(eventId)) {
    return { ok: false, error: "That event id is not valid." };
  }

  const result = await writeMusicUrl(createAdminClient(), eventId, null);

  if (result.ok) {
    console.info(`[admin] ${session.username} removed the music of event ${eventId}`);
    revalidatePath(`/admin/events/${eventId}`);
    after(() => sweepOldMusic(eventId, null));
  }

  return result;
}

/** How old a song no card plays must be before it is deleted. */
const OLD_MUSIC_MS = 24 * 60 * 60 * 1000;

/**
 * Deletes this event's earlier songs once nothing plays them: every file in
 * its folder but the one now on the card, uploaded more than a day ago (so an
 * upload still in flight in another tab is never taken). Never throws.
 */
async function sweepOldMusic(eventId: string, keep: string | null): Promise<void> {
  try {
    const storage = createAdminClient().storage.from(CARD_MUSIC_BUCKET);
    const { data } = await storage.list(eventId, { limit: 100 });
    const cutoff = Date.now() - OLD_MUSIC_MS;
    const old = (data ?? [])
      .map((file) => `${eventId}/${file.name}`)
      .filter((path) => path !== keep && isCardMusicPath(eventId, path))
      .filter((path) => Number(path.slice(eventId.length + 1, -4)) < cutoff);

    if (old.length > 0) {
      await storage.remove(old);
    }
  } catch (cause: unknown) {
    console.error(`[admin] could not sweep old music for ${eventId}:`, cause);
  }
}
