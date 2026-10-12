import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Which invitations have a payment under review (lib/paymentReview.ts).
 *
 * NOT A "use server" FILE, on purpose: every export of one is an endpoint a
 * browser can call, and these read `payments` with the service role, since a
 * host's own session has no way to see that table's rows. They are for server
 * pages and server actions that have ALREADY read the event under the host's
 * session, so the ids they pass are ids that host is entitled to ask about.
 *
 * TWO ANSWERS TO A FAILED READ, for the two kinds of caller. A page is told
 * "not under review", which is what it showed before this existed. The order
 * path asks through reviewState, which says "unknown", and refuses: a host who
 * has already paid must not be charged again because a read failed.
 */

/** The ids, of those given, with a payment waiting to be reviewed; null when it could not be read. */
async function readUnderReview(
  eventIds: readonly string[],
): Promise<ReadonlySet<string> | null> {
  if (eventIds.length === 0) {
    return new Set();
  }

  const { data, error } = await createAdminClient()
    .from("payments")
    .select("event_id")
    .in("event_id", [...eventIds])
    .eq("status", "created")
    .not("razorpay_payment_id", "is", null);

  if (error !== null) {
    console.error("[db] readUnderReview:", error);
    return null;
  }

  return new Set(data.map((row) => row.event_id));
}

/** For a page: the ids, of those given, to show the verifying notice for. */
export async function eventsUnderReview(
  eventIds: readonly string[],
): Promise<ReadonlySet<string>> {
  return (await readUnderReview(eventIds)) ?? new Set();
}

/** For a page showing one invitation. */
export async function isUnderReview(eventId: string): Promise<boolean> {
  return (await eventsUnderReview([eventId])).has(eventId);
}

/** For the order path, which must tell "no" from "could not find out". */
export async function reviewState(
  eventId: string,
): Promise<"clear" | "review" | "unknown"> {
  const found = await readUnderReview([eventId]);

  if (found === null) {
    return "unknown";
  }

  return found.has(eventId) ? "review" : "clear";
}
