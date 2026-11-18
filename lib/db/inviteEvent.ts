import { cookies } from "next/headers";
import { cache } from "react";
import { ADMIN_PREVIEW_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/session";
import { isEventHost } from "@/lib/db/events";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbFailure, dbSuccess, type DbResult } from "@/lib/db/result";
import { isValidInviteCode } from "@/lib/inviteCode";
import { createClient } from "@/lib/supabase/server";
import { toStoredEvent, type StoredEvent } from "@/types/database";

/**
 * The guest-facing read, and the only anonymous path into events.
 *
 * Goes through the event_by_invite_code() function rather than a table select,
 * because anon has no SELECT policy on events at all — see the long note in
 * 0001_initial.sql. The function takes the code as an argument, so holding one
 * code reveals one event and the table cannot be walked.
 *
 * Returns null for an unknown code. That is a not-found, not a failure: most
 * unknown codes are a typo in a pasted link.
 *
 * NOT IN lib/db/events.ts, and that is the point. That file is "use server",
 * so every function it exports is an endpoint a browser can call, and this one
 * hands back any card by its code, paid or not. Here it is an ordinary server
 * function that only the server can reach. Guest-facing callers should not use
 * it directly: getGuestEvent below is the one that applies the payment rule.
 */
export async function readEventByInviteCode(
  code: string,
): Promise<DbResult<StoredEvent | null>> {
  /*
    Rejected before the round trip. Anything outside the code alphabet cannot
    match a real row, so this turns a mangled URL into a not-found without
    troubling the database.
  */
  if (!isValidInviteCode(code)) {
    return dbSuccess(null);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("event_by_invite_code", {
    p_invite_code: code,
  });

  if (error !== null) {
    return dbFailure(
      "readEventByInviteCode",
      error,
      "Could not open this invitation, please try again.",
    );
  }

  const row = data?.[0];

  if (row === undefined) {
    return dbSuccess(null);
  }

  /*
    The host's WhatsApp wording is theirs, not the card's: it goes no further
    than this server, whatever the card is rendered for.
  */
  const event = toStoredEvent(row);
  const { shareMessages: _hostOnly, ...config } = event.config;

  return dbSuccess({ ...event, config });
}

/**
 * What a visitor to /i/[inviteCode] may see, decided on the server.
 *
 *   active    Paid. The card, for everyone.
 *   preview   Unpaid, and the visitor is the signed-in host: the card with its
 *             watermark and a banner, so they can check it before paying.
 *   inactive  Unpaid, and anyone else. Nothing about the event at all — not
 *             its names, its date, its language — so this carries no event.
 *   missing   No card with this code.
 *   failed    The read itself failed.
 *
 * isEventHost asks the database under the visitor's own session, so RLS
 * decides who the host is. It is asked only for an unpaid card: a paid card,
 * which is every card a guest opens in normal use, costs no extra query.
 */
export type GuestEvent =
  | { kind: "active"; event: StoredEvent }
  | { kind: "preview"; event: StoredEvent }
  /* An unpaid card opened by a signed-in Lifafa admin; see adminPreviewOf. */
  | { kind: "adminPreview"; event: StoredEvent }
  | { kind: "inactive" }
  | { kind: "missing" }
  | { kind: "failed" };

async function resolveGuestEvent(code: string): Promise<GuestEvent> {
  const read = await readEventByInviteCode(code);

  if (!read.ok) {
    return { kind: "failed" };
  }

  if (read.data === null) {
    if (!isValidInviteCode(code)) {
      return { kind: "missing" };
    }

    /*
      From 0012 the database returns an unpaid card only to its host, so no row
      may still mean an unpaid card; this asks, and learns nothing else. Before
      0012 the function does not exist and the error reads as not found, which
      is right: then an unpaid card still comes back as a row, below.
    */
    const supabase = await createClient();
    const { data: pending } = await supabase.rpc("invite_is_pending", {
      p_invite_code: code,
    });

    if (pending !== true) {
      return { kind: "missing" };
    }

    return (await adminPreviewOf(code)) ?? { kind: "inactive" };
  }

  if (read.data.isPaid) {
    return { kind: "active", event: read.data };
  }

  if (await isEventHost(read.data.id)) {
    return { kind: "preview", event: read.data };
  }

  return (await adminPreviewOf(code)) ?? { kind: "inactive" };
}

/**
 * An unpaid card, for a signed-in Lifafa admin and nobody else: the row read
 * with the service client, since the database hands an unpaid card only to
 * its host. Null for everyone without a valid admin token on /i (see
 * ADMIN_PREVIEW_COOKIE_NAME), which is every guest.
 */
async function adminPreviewOf(code: string): Promise<GuestEvent | null> {
  const store = await cookies();
  const session = await verifyAdminToken(store.get(ADMIN_PREVIEW_COOKIE_NAME)?.value);

  if (session === null) {
    return null;
  }

  const { data, error } = await createAdminClient()
    .from("events")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();

  if (error !== null || data === null) {
    if (error !== null) {
      console.error("[db] adminPreviewOf:", error);
    }
    return null;
  }

  const event = toStoredEvent(data);
  /* The host's WhatsApp wording stays theirs, as in readEventByInviteCode. */
  const { shareMessages: _hostOnly, ...config } = event.config;

  return { kind: "adminPreview", event: { ...event, config } };
}

/**
 * The guest read, once per request.
 *
 * /i/[inviteCode] asks the same question while rendering one page: the layout
 * and the page for their metadata, and the page for the card. React's `cache`
 * scopes the answer to a single server request, so a second visitor — or the
 * same one refreshing after the host has paid — still gets a fresh read.
 */
export const getGuestEvent = cache(resolveGuestEvent);
