import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Marking an order paid and publishing its invitation. The webhook's only write.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS NOT IN lib/db/payments.ts, WHICH IS WHERE IT BELONGS OTHERWISE.
 *
 * That file is "use server", and in Next EVERY export of a "use server" module
 * becomes a registered Server Action — an endpoint with an id, callable over
 * HTTP. That is exactly right for createPaymentOrder, which a button has to be
 * able to call. It is exactly wrong for this function, which takes an order id
 * and a payment id and publishes an invitation without checking a signature,
 * because checking the signature is the caller's job.
 *
 * In practice its action id never reaches the browser, because no client
 * component imports it. But "the id is not published" is a weaker property than
 * "there is no endpoint", and this is the one function in the codebase where
 * the difference is worth a separate file: it is the single step that turns
 * money into a published invitation.
 *
 * A plain module, so it is reachable only by a server-side import. The route
 * handler imports it directly; nothing else imports it at all.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** What applying a captured payment did, so the route can log it precisely. */
export type CaptureOutcome =
  /** This delivery is what marked the invitation paid. */
  | { kind: "applied"; eventId: string }
  /** A row was found, already paid. A repeat delivery; nothing to do. */
  | { kind: "duplicate" }
  /** No payments row carries this order id. Logged, then ignored. */
  | { kind: "unknown" }
  /** The database refused. The only case the route answers non-2xx for. */
  | { kind: "error"; message: string };

/**
 * Applies a captured payment: the payments row first, then the event.
 *
 * ONLY EVER FROM A VERIFIED WEBHOOK. Nothing here re-checks the signature —
 * app/api/razorpay/webhook/route.ts has done that before calling, and this
 * function would happily publish any invitation it is handed. It must never be
 * called from the browser's success callback; see the note at the top of that
 * route for why the browser gets no say in whether money arrived.
 *
 * THE ADMIN CLIENT IS NOT OPTIONAL HERE. 0008's trigger silently discards any
 * write to events.is_paid from `anon` or `authenticated`, and 0009 grants no
 * update policy on payments to either. service_role is the only role Postgres
 * will accept these two statements from, which is the schema enforcing the same
 * rule this file is written around.
 *
 * IDEMPOTENT AT BOTH STEPS, because Razorpay retries a delivery it did not get
 * a 2xx for and will send the same capture more than once:
 *
 *  1. The payments update carries .eq("status", "created"). A row already paid
 *     does not match, so a second delivery updates nothing and gets back an
 *     empty array rather than overwriting paid_at with a later time.
 *  2. The events update carries .eq("is_paid", false), for the same reason.
 *
 * Neither is a read-then-write. The condition is part of the UPDATE statement,
 * so two deliveries arriving together are serialised by Postgres and exactly
 * one of them matches. A check in JavaScript between a select and an update
 * would leave a window where both could pass.
 */
export async function applyCapturedPayment(
  orderId: string,
  paymentId: string,
): Promise<CaptureOutcome> {
  const admin = createAdminClient();

  const { data: updated, error: paymentError } = await admin
    .from("payments")
    .update({
      razorpay_payment_id: paymentId,
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", orderId)
    .eq("status", "created")
    .select("id, event_id");

  if (paymentError !== null) {
    console.error("[razorpay] could not update the payment row:", paymentError);
    return { kind: "error", message: "payments update failed" };
  }

  if (updated.length === 0) {
    /*
      Either a repeat delivery or an order this deployment never created. Told
      apart with one more read, because the two mean different things to whoever
      reads the log: a duplicate is the system working, and an unknown order is
      either a stray webhook or a row that went missing.
    */
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("razorpay_order_id", orderId)
      .maybeSingle();

    return existing === null ? { kind: "unknown" } : { kind: "duplicate" };
  }

  const eventId = updated[0].event_id;

  /*
    The second write, and the one that actually publishes the invitation.

    Separate statements rather than one transaction: PostgREST has no
    transaction spanning two requests, and the ORDER matters more than the
    atomicity here. The payment row is the evidence, so it is written first. If
    this second update fails, the log names an order whose money arrived and
    whose invitation is still unpublished — a recoverable state someone can act
    on. The reverse, a published invitation with no payment behind it, is not.
  */
  const { error: eventError } = await admin
    .from("events")
    .update({ is_paid: true, payment_id: paymentId })
    .eq("id", eventId)
    .eq("is_paid", false);

  if (eventError !== null) {
    console.error(
      `[razorpay] payment ${paymentId} recorded but event ${eventId} was not published:`,
      eventError,
    );
    return { kind: "error", message: "events update failed" };
  }

  return { kind: "applied", eventId };
}
