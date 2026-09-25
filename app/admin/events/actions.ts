"use server";

import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/admin/auth";
import { ADMIN_UNLOCK_HOURS } from "@/lib/eventLock";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  ────────────────────────────────────────────────────────────────────────────
  The admin's two overrides of the lock after the event (lib/eventLock.ts).

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
