import { createAdminClient } from "@/lib/supabase/admin";
import { templatePricePaise } from "@/templates/registry";

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
  /**
   * Money arrived that is not the money this invitation costs: see the check
   * at the top of applyCapturedPayment. Nothing was written.
   */
  | { kind: "mismatch"; eventId: string; reason: string }
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
  /** What Razorpay says was captured, in paise, from the signed webhook. */
  capturedPaise: number,
): Promise<CaptureOutcome> {
  const admin = createAdminClient();

  /*
    THE AMOUNT IS CONFIRMED BEFORE ANYTHING IS WRITTEN. Two questions, both
    answered from rows the server wrote or the host saved, neither from the
    browser:

    1. Was what was captured what the order asked for? The order's row holds
       the amount this server computed when it made the order.

    2. Was the order made for a template that costs at least what the
       invitation's template costs now? An order's list price is what was
       charged plus what its coupon took off. A host could make an order on a
       ₹699 template, move the unpaid card to a ₹999 one in another tab, and
       then pay the first order; that must not publish the dearer card. Moving
       to a cheaper template after ordering is the host's own loss and is let
       through.

    An order that fails either is left exactly as it was, so it can be put
    right by hand: the money is in Razorpay's records under this payment id.
  */
  const { data: order, error: orderError } = await admin
    .from("payments")
    .select("event_id, amount, discount_amount, status")
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (orderError !== null) {
    console.error("[razorpay] could not read the payment row:", orderError);
    return { kind: "error", message: "payments read failed" };
  }

  if (order !== null && order.status === "created") {
    const { data: event, error: eventReadError } = await admin
      .from("events")
      .select("card_config")
      .eq("id", order.event_id)
      .maybeSingle();

    if (eventReadError !== null) {
      console.error("[razorpay] could not read the event:", eventReadError);
      return { kind: "error", message: "events read failed" };
    }

    const listPaise = order.amount + (order.discount_amount ?? 0);
    const pricePaise = templatePricePaise(event?.card_config?.templateId);

    if (capturedPaise !== order.amount) {
      return {
        kind: "mismatch",
        eventId: order.event_id,
        reason: `captured ${capturedPaise} paise against an order for ${order.amount}`,
      };
    }

    if (event !== null && listPaise < pricePaise) {
      return {
        kind: "mismatch",
        eventId: order.event_id,
        reason: `the order was priced at ${listPaise} paise and the invitation's template now costs ${pricePaise}`,
      };
    }
  }

  const { data: updated, error: paymentError } = await admin
    .from("payments")
    .update({
      razorpay_payment_id: paymentId,
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("razorpay_order_id", orderId)
    .eq("status", "created")
    .select("id, event_id, coupon_code");

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
  const couponCode = updated[0].coupon_code;

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

  /*
    ──────────────────────────────────────────────────────────────────────────
    THE COUPON'S USE IS COUNTED HERE AND NOWHERE ELSE.

    Not when the host typed the code, not when the order was created — both of
    those are intentions, and a limited code consumed by intentions is a code
    exhausted by people who never paid. This line runs only on the branch where
    the payments update matched exactly one 'created' row, which is to say only
    when this delivery is the one that settled the order. A repeat delivery took
    the `updated.length === 0` path above and never reached it.

    LAST, AND DELIBERATELY. The invitation is published first. A counter that
    fails to tick is a reporting inaccuracy; an invitation that fails to publish
    is a host who paid for nothing.
    ──────────────────────────────────────────────────────────────────────────
  */
  if (couponCode !== null) {
    await countCouponUse(couponCode, paymentId);
  }

  return { kind: "applied", eventId };
}

/**
 * Advances a coupon's used_count by one, atomically, and never fails a payment.
 *
 * THE INCREMENT IS A DATABASE STATEMENT, NOT A READ AND A WRITE. redeem_coupon()
 * (0010) puts the limit check inside the UPDATE's own WHERE clause, so two
 * captures arriving together are serialised by Postgres and the second one
 * re-evaluates `used_count < max_uses` against the value the first just wrote.
 * Doing this in TypeScript — select the count, add one, update — would leave a
 * window between the check and the write that both could walk through.
 *
 * A FALSE ANSWER IS LOGGED, NOT ACTED ON, and the reason is worth stating
 * because it is the one real gap in this feature. `max_uses` is enforced when
 * the order is created; the use is counted when the money lands. Between those
 * two moments another host can capture the last remaining use. Both have then
 * paid a discounted price and only one is counted, so a code with max_uses = 10
 * can be honoured an eleventh time if two checkouts overlap on the last one.
 *
 * The alternative — refusing to publish an invitation whose money has already
 * been taken — is plainly worse. The overrun is bounded by how many checkouts
 * can be open at once, it is visible in the log line below, and the affiliate
 * report counts payments rather than used_count, so commission stays exact
 * either way.
 */
async function countCouponUse(
  couponCode: string,
  paymentId: string,
): Promise<void> {
  const admin = createAdminClient();

  const { data: counted, error } = await admin.rpc("redeem_coupon", {
    p_code: couponCode,
  });

  if (error !== null) {
    console.error(
      `[razorpay] payment ${paymentId} applied, but coupon ${couponCode} could not be counted:`,
      error,
    );
    return;
  }

  if (counted !== true) {
    console.warn(
      `[razorpay] payment ${paymentId} used coupon ${couponCode} after it stopped being redeemable — the code was honoured and the count was not advanced.`,
    );
  }
}
