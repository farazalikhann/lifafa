"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isCheckinToken } from "@/lib/checkinPass";
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
 * Returns the guest's own check-in token when the reply is accepted, and null
 * otherwise. submit_reply() hands back that one value and never a row (0006),
 * so this write still cannot be turned into a read of the guest list.
 */
export async function addOrUpdateReply(
  inviteCode: string,
  reply: ReplyInput,
): Promise<DbResult<{ checkinToken: string | null }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("submit_reply", {
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

  /*
    A string only when the database says so. Before 0006 the function returns
    void, which arrives as null, and the guest simply sees no pass.
  */
  return dbSuccess({
    checkinToken: typeof data === "string" && data.length > 0 ? data : null,
  });
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

/**
 * What the door learns from one pass.
 *
 * `success` and `already` carry the guest, so a scanner can update the row it
 * is showing, and the event, so a page opened from a phone's camera can point
 * back at the right guest list. `not_owner` and `not_found` carry nothing at
 * all: a host scanning somebody else's pass learns only that it is not theirs.
 *
 * `wrong_event` is only ever returned when the caller named the event it is
 * checking guests in to. The dashboard scanner does, so a guest holding the
 * pass for the same host's other invitation is not quietly checked in there.
 */
export type PassCheckIn =
  | { kind: "success"; guest: Guest; eventId: string }
  | { kind: "already"; guest: Guest; eventId: string }
  | { kind: "not_found" }
  | { kind: "not_owner" }
  | { kind: "wrong_event" };

/** The one failure sentence the door shows, whichever query it was. */
const PASS_FAILURE = "Could not check this pass, please try again.";

/**
 * Which host a pass belongs to, asked past RLS.
 *
 * The one question the host's own session cannot answer: guests_select_host
 * filters another host's rows rather than refusing them, so "not yours" and
 * "not there" look identical from inside it. The service client answers that
 * and nothing more — the event id and its owner, never the guest's name, phone
 * or reply — and everything after it goes back through RLS as the host.
 *
 * "unknown" when the service key is not configured. The caller then falls back
 * to the host's session alone, where someone else's pass reads as not found
 * rather than not yours: a less helpful answer, but never a leak.
 */
async function passOwner(
  token: string,
): Promise<DbResult<{ eventId: string; hostId: string } | null | "unknown">> {
  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (cause: unknown) {
    console.error(
      "[db] passOwner: no service client, falling back to the host's session:",
      cause instanceof Error ? cause.message : cause,
    );
    return dbSuccess("unknown");
  }

  const { data: guest, error: guestError } = await admin
    .from("guests")
    .select("event_id")
    .eq("checkin_token", token)
    .maybeSingle();

  if (guestError !== null) {
    return dbFailure("passOwner/guest", guestError, PASS_FAILURE);
  }

  if (guest === null) {
    return dbSuccess(null);
  }

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("host_id")
    .eq("id", guest.event_id)
    .maybeSingle();

  if (eventError !== null) {
    return dbFailure("passOwner/event", eventError, PASS_FAILURE);
  }

  return dbSuccess(
    event === null ? null : { eventId: guest.event_id, hostId: event.host_id },
  );
}

/**
 * Checks a guest in from the token on their pass.
 *
 * Takes the signed-in user's id, as the door's own pages hand it over, but does
 * not take it on trust. This module is "use server", so every export here is
 * an endpoint a browser can call with any arguments it likes; the id is
 * compared with the session's own, and a mismatch is simply a caller who does
 * not own this pass.
 *
 * THE ORDER IS THE POINT: the token's shape, then the session, then who owns
 * the pass, then which event the caller is working, and only then the guest.
 * Nothing about a guest is read on anyone's behalf until the caller is known
 * to be their host.
 *
 * Safe with two phones at one door: the write only lands on a row that is
 * still not checked in, so the same pass scanned twice at once gives one
 * success and one "already", and never two arrival times.
 */
export async function checkInByToken(
  token: string,
  userId: string,
  expectedEventId?: string,
): Promise<DbResult<PassCheckIn>> {
  const normalised = token.trim().toLowerCase();

  if (!isCheckinToken(normalised)) {
    return dbSuccess({ kind: "not_found" });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null || user.id !== userId) {
    return dbSuccess({ kind: "not_owner" });
  }

  const owner = await passOwner(normalised);

  if (!owner.ok) {
    return owner;
  }

  if (owner.data === null) {
    return dbSuccess({ kind: "not_found" });
  }

  if (owner.data !== "unknown" && owner.data.hostId !== user.id) {
    return dbSuccess({ kind: "not_owner" });
  }

  /* As the host from here on: guests_select_host and guests_update_host are the second lock. */
  const { data: row, error: readError } = await supabase
    .from("guests")
    .select("*")
    .eq("checkin_token", normalised)
    .maybeSingle();

  if (readError !== null) {
    return dbFailure("checkInByToken/read", readError, PASS_FAILURE);
  }

  if (row === null) {
    /*
      Without the service client this is the only answer there is. With it, the
      owner was just confirmed and RLS still hid the row, which should never
      happen — so it fails closed.
    */
    return dbSuccess({
      kind: owner.data === "unknown" ? "not_found" : "not_owner",
    });
  }

  if (expectedEventId !== undefined && row.event_id !== expectedEventId) {
    return dbSuccess({ kind: "wrong_event" });
  }

  if (row.checked_in) {
    return dbSuccess({
      kind: "already",
      guest: toGuest(row),
      eventId: row.event_id,
    });
  }

  const { data: updated, error: updateError } = await supabase
    .from("guests")
    .update({ checked_in: true, checked_in_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("checked_in", false)
    .select("*")
    .maybeSingle();

  if (updateError !== null) {
    return dbFailure("checkInByToken/update", updateError, PASS_FAILURE);
  }

  if (updated !== null) {
    return dbSuccess({
      kind: "success",
      guest: toGuest(updated),
      eventId: updated.event_id,
    });
  }

  /* Another phone at the door got there between the read and the write. */
  const { data: latest, error: rereadError } = await supabase
    .from("guests")
    .select("*")
    .eq("id", row.id)
    .maybeSingle();

  if (rereadError !== null || latest === null) {
    return dbFailure(
      "checkInByToken/reread",
      rereadError ?? `guest ${row.id} vanished mid check-in`,
      PASS_FAILURE,
    );
  }

  return dbSuccess({
    kind: "already",
    guest: toGuest(latest),
    eventId: latest.event_id,
  });
}

/**
 * The door's entry point from a browser: checks a pass in as whoever is signed
 * in. The dashboard scanner and the /checkin page call this rather than
 * checkInByToken, so neither ever has to know, or send, a user id.
 */
export async function checkInPass(
  token: string,
  expectedEventId?: string,
): Promise<DbResult<PassCheckIn>> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error !== null || user === null) {
    return dbSuccess({ kind: "not_owner" });
  }

  return checkInByToken(token, user.id, expectedEventId);
}
