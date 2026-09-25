import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

/**
 * Who may use the editor's AI translate, and the record that they did.
 *
 * Server only: the route in app/api/translate/route.ts is the one caller. Reads
 * go through the host's own session, so RLS limits them to the host's own
 * events and usage rows; the one write goes through the service role, because
 * no client role may insert into translation_usage (see 0011).
 *
 * THE TWO RULES
 *
 *   One per card. A card with a usage row cannot translate again.
 *
 *   One unpaid card at a time. While another card of this host's used AI
 *   translate and is not paid, this one may not. Paying for it lifts the block.
 *
 * WHICH CARD A ROW BELONGS TO. A row carries the editor's id for the card
 * (`draft_id`, kept in event_draft.autoTranslation.cardId) and the invitation's
 * id when it had one. A row written on /create has no event id, so the card
 * is found through the draft id once it has been saved.
 *
 * A USED CARD THAT IS NOT A SAVED INVITATION — never saved, or since deleted —
 * blocks for UNSAVED_CARD_HOLD_MS and then stops. It can never be paid for, so
 * holding it for ever would lock the host out of AI translate for good over a
 * card they abandoned. A day matches how long an unsaved card is kept for them
 * through sign-in (PENDING_CARD_TTL_MS in lib/pendingCard.ts).
 */

const UNSAVED_CARD_HOLD_MS = 24 * 60 * 60 * 1000;

export type TranslateAllowance =
  /** `eventId` is the requested invitation, kept only if it is this host's. */
  | { kind: "allowed"; eventId: string | null }
  | { kind: "used" }
  /** `pendingEventId` is the unpaid card to point the host at, if it was saved. */
  | { kind: "blocked"; pendingEventId: string | null }
  | { kind: "error" };

type SessionClient = SupabaseClient<Database>;

/** The card id an event's draft carries, or null for one saved before it had one. */
function cardIdOf(draft: unknown): string | null {
  if (typeof draft !== "object" || draft === null) {
    return null;
  }

  const auto = (draft as { autoTranslation?: { cardId?: unknown } })
    .autoTranslation;

  return typeof auto?.cardId === "string" ? auto.cardId : null;
}

/**
 * Whether this host may translate this card now.
 *
 * `supabase` is the route's session client, already known to be signed in as
 * `userId`.
 */
export async function checkTranslateAllowance(
  supabase: SessionClient,
  userId: string,
  cardId: string,
  requestedEventId: string | null,
  now: number = Date.now(),
): Promise<TranslateAllowance> {
  const [usage, events] = await Promise.all([
    supabase
      .from("translation_usage")
      .select("draft_id, event_id, created_at")
      .eq("user_id", userId),
    /*
      Every invitation of this host's, with only what the rules need. A host
      has a handful, so matching draft ids here is cheaper than a query each.
    */
    supabase
      .from("events")
      .select("id, is_paid, event_draft")
      .eq("host_id", userId),
  ]);

  if (usage.error !== null || events.error !== null) {
    console.error(
      "[translate] allowance read failed:",
      usage.error?.message ?? events.error?.message,
    );
    return { kind: "error" };
  }

  const owned = events.data;
  /* A requested invitation that is not this host's is treated as none. */
  const eventId = owned.some((event) => event.id === requestedEventId)
    ? requestedEventId
    : null;

  /** The saved invitation a usage row belongs to, if there is one. */
  const eventFor = (row: { event_id: string | null; draft_id: string }) =>
    owned.find((event) => event.id === row.event_id) ??
    owned.find((event) => cardIdOf(event.event_draft) === row.draft_id) ??
    null;

  const isThisCard = (row: { event_id: string | null; draft_id: string }) =>
    row.draft_id === cardId ||
    (eventId !== null && eventFor(row)?.id === eventId);

  if (usage.data.some(isThisCard)) {
    return { kind: "used" };
  }

  for (const row of usage.data) {
    const event = eventFor(row);
    const blocks =
      event !== null
        ? !event.is_paid
        : now - Date.parse(row.created_at) < UNSAVED_CARD_HOLD_MS;

    if (blocks) {
      return { kind: "blocked", pendingEventId: event?.id ?? null };
    }
  }

  return { kind: "allowed", eventId };
}

/**
 * Records one successful translate. Through the service role: RLS gives no
 * client role an insert on this table.
 *
 * A duplicate (two requests for one card racing past the check) is not an
 * error — the unique index kept it to one row, which is the point.
 */
export async function recordTranslation(
  userId: string,
  cardId: string,
  eventId: string | null,
  charsSent: number,
): Promise<boolean> {
  const { error } = await createAdminClient()
    .from("translation_usage")
    .insert({
      user_id: userId,
      draft_id: cardId,
      event_id: eventId,
      chars_sent: charsSent,
    });

  if (error !== null && error.code !== "23505") {
    console.error("[translate] usage row not written:", error.message);
    return false;
  }

  return true;
}
