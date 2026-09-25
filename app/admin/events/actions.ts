"use server";

import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/admin/auth";
import {
  COMPLIMENTARY_REASON_MAX_LENGTH,
  type ActivateFreeResult,
} from "@/lib/admin/complimentary";
import { ADMIN_UNLOCK_HOURS } from "@/lib/eventLock";
import { INVITATION_PRICE_PAISE } from "@/lib/razorpay/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  ────────────────────────────────────────────────────────────────────────────
  The admin's two overrides of the lock after the event (lib/eventLock.ts),
  and activating an invitation for free.

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

  const { data: outcome, error } = await createAdminClient().rpc(
    "grant_complimentary",
    {
      p_event_id: eventId,
      p_reason: trimmed,
      p_granted_by: session.username,
      p_list_price: INVITATION_PRICE_PAISE,
    },
  );

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
