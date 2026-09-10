"use server";

import { createClient } from "@/lib/supabase/server";
import { dbFailure, dbSuccess, type DbResult } from "@/lib/db/result";
import { toGuest } from "@/types/database";
import type { Guest, GuestReply } from "@/types/guest";

/**
 * Every read and write of public.guests.
 *
 * The asymmetry from the RLS policies runs right through this file: a host
 * reads and updates through the table, a guest writes through a function and
 * can read nothing at all.
 */

/** A reply as the invite form hands it over. */
export interface ReplyInput {
  name: string;
  /** Ten digits. Re-normalised in SQL regardless — the browser is not a trust boundary. */
  phone: string;
  status: GuestReply;
  /** Total people attending, including the guest. Always >= 1. */
  partySize: number;
  message: string;
}

/**
 * Records a guest's reply, or replaces the one their phone already left.
 *
 * Takes the invite code, not an event id, and calls submit_reply() — the
 * SECURITY DEFINER function from 0002_reply_upsert.sql. The reason is in that
 * file at length; the short version is that anon has INSERT and nothing else on
 * public.guests, so a second reply from the same phone hits the unique
 * constraint and there is no UPDATE policy to fall back on. Granting anon
 * UPDATE would let anyone with the link rewrite another guest's reply.
 *
 * Returns nothing on success. The function returns void by design, so this
 * write cannot be turned into a read of the guest list.
 */
export async function addOrUpdateReply(
  inviteCode: string,
  reply: ReplyInput,
): Promise<DbResult<null>> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("submit_reply", {
    p_invite_code: inviteCode,
    p_name: reply.name.trim(),
    p_phone: reply.phone,
    p_rsvp: reply.status,
    /*
      The form counts the guest themselves; the column counts only the people
      they bring. Clamped to the column's own 0..9 check so a malformed party
      size is refused here rather than as a constraint violation.
    */
    p_accompanying_count: Math.min(9, Math.max(0, reply.partySize - 1)),
    p_message: reply.message.trim(),
  });

  if (error !== null) {
    return dbFailure(
      "addOrUpdateReply",
      error,
      "Could not send your reply, please try again.",
    );
  }

  return dbSuccess(null);
}

/**
 * The guest list for one event, oldest reply first.
 *
 * Host-scoped by guests_select_host. An event the caller does not own returns
 * an empty list rather than an error, because RLS filters rows rather than
 * refusing the query — so an empty result means "nothing you may see", which
 * for a stranger is the correct and uninformative answer.
 */
export async function getGuestsForEvent(
  eventId: string,
): Promise<DbResult<Guest[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error !== null) {
    return dbFailure(
      "getGuestsForEvent",
      error,
      "Could not load your guest list, please try again.",
    );
  }

  return dbSuccess((data ?? []).map(toGuest));
}

/**
 * How many people have replied to one event, and nothing else about them.
 *
 * ONE REQUEST, NO ROWS. `head: true` with an exact count asks PostgREST for the
 * Content-Range header and no body, so the editor can warn a host that guests
 * are already holding this date without loading a guest list it has no way to
 * show and no business reading.
 *
 * Host-scoped by guests_select_host, exactly as getGuestsForEvent is, so an
 * event the caller does not own counts 0 rather than erroring — which is the
 * correct and uninformative answer for a stranger.
 */
export async function countGuestsForEvent(
  eventId: string,
): Promise<DbResult<number>> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("guests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error !== null) {
    return dbFailure(
      "countGuestsForEvent",
      error,
      "Could not count the replies, please try again.",
    );
  }

  /* Null when PostgREST returns no range header at all; no rows is 0 either way. */
  return dbSuccess(count ?? 0);
}

/**
 * Marks a guest arrived, or undoes it.
 *
 * The flag and its timestamp are written in the same statement, so the two can
 * never disagree — a row that says checked_in with no time, or a time with the
 * flag off, is not a state this can produce. The timestamp is minted here in
 * the action rather than during any render.
 *
 * Host-scoped by guests_update_host: a row on someone else's event matches no
 * policy, so the update touches nothing and reports it.
 */
export async function setCheckedIn(
  guestId: string,
  value: boolean,
): Promise<DbResult<Guest>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("guests")
    .update({
      checked_in: value,
      checked_in_at: value ? new Date().toISOString() : null,
    })
    .eq("id", guestId)
    .select("*")
    .maybeSingle();

  if (error !== null) {
    return dbFailure(
      "setCheckedIn",
      error,
      "Could not update this guest, please try again.",
    );
  }

  if (data === null) {
    return dbFailure(
      "setCheckedIn/noRow",
      `guest ${guestId} not updatable by this host`,
      "Could not update this guest, please try again.",
    );
  }

  return dbSuccess(toGuest(data));
}
