"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createRazorpayClient } from "@/lib/razorpay/client";
import {
  INVITATION_CURRENCY,
  INVITATION_PRICE_PAISE,
} from "@/lib/razorpay/pricing";
import { razorpayKeyId } from "@/lib/razorpay/keys";
import { dbFailure, dbSuccess, type DbResult } from "@/lib/db/result";

/**
 * Every read and write of public.payments, and the one place an order is made.
 *
 * TWO CLIENTS, AND WHICH ONE IS USED IS THE WHOLE SECURITY ARGUMENT.
 *
 * lib/supabase/server.ts carries the host's session cookie, so auth.uid()
 * resolves inside the RLS policies and the database decides whose rows these
 * are. That is what checks ownership below.
 *
 * lib/supabase/admin.ts holds service_role and bypasses RLS entirely. It is
 * needed here because 0009 grants NO insert or update policy to anyone: a
 * payment row cannot be written by a host's session however the request is
 * shaped, which is precisely the property asked for. So the server writes it —
 * and every use of the admin client in this file happens strictly AFTER the
 * host's own session has been asked who they are and whether the event is
 * theirs. Reversing that order would be handing out a key that skips RLS to a
 * caller nobody has identified.
 *
 * The same split governs events.is_paid, for a different reason: 0008's trigger
 * silently discards any write to it from anon or authenticated, so the
 * webhook's update genuinely cannot be done any other way.
 *
 * THE WEBHOOK'S OWN WRITE IS NOT IN THIS FILE. It is in lib/db/applyPayment.ts,
 * a plain module, because every export of a "use server" module becomes an
 * endpoint anyone can call — and "publish this invitation" is the one function
 * in the codebase that must not be one. See the note at the top of that file.
 */

/** What the browser needs to open a checkout, and nothing more. */
export interface CheckoutOrder {
  /** The Razorpay order id, e.g. "order_ABC123". */
  orderId: string;
  /** Paise. Sent so the checkout can display it; never read back from there. */
  amount: number;
  currency: string;
  /** The publishable key id. See lib/razorpay/keys.ts on why this is safe. */
  keyId: string;
}

/**
 * Creates a Razorpay order for one invitation and records it.
 *
 * THE AMOUNT IS NEVER AN ARGUMENT. It comes from INVITATION_PRICE_PAISE, on the
 * server, every time. A price that arrived from the browser would be a price
 * the buyer chose — this is a server action, and its arguments are whatever
 * crossed the wire, not whatever the button was rendered with.
 *
 * OWNERSHIP IS ESTABLISHED FIRST, and by the database rather than by this
 * function. The select below runs under the host's own session, so
 * events_select_own (0001) is what decides whether the row is visible at all: a
 * host asking about someone else's event gets no row back and is refused, and
 * the check cannot drift out of step with the policy because it *is* the
 * policy.
 *
 * AN ALREADY-PAID EVENT IS REFUSED, so a host cannot be charged twice for the
 * same invitation by leaving an old tab open and pressing the button in it.
 * This is a guard, not a guarantee: two checkouts opened in the same moment
 * both pass it. The guarantee is in the webhook, which will not apply a second
 * capture to an event already marked paid.
 */
export async function createPaymentOrder(
  eventId: string,
): Promise<DbResult<CheckoutOrder>> {
  const keyId = razorpayKeyId();

  /*
    Checked before anything else touches the network or the database. A
    deployment with no keys configured should say so plainly rather than fail
    somewhere deeper with a message about an HTTP 401 from Razorpay.
  */
  if (keyId === null) {
    return dbFailure(
      "createPaymentOrder/config",
      new Error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not set."),
      "Payments are not set up on this deployment yet.",
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return dbFailure(
      "createPaymentOrder/auth",
      authError,
      "You need to be signed in to publish an invitation.",
    );
  }

  /*
    Under the host's session, so RLS answers "is this yours" for us. The eq on
    host_id as well is belt and braces of the same kind lib/db/events.ts uses on
    its own update path: the policy is the real check, and naming the owner in
    the query too means a policy accidentally loosened one day does not
    immediately become a way to buy someone else's invitation.
  */
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, is_paid")
    .eq("id", eventId)
    .eq("host_id", user.id)
    .maybeSingle();

  if (eventError !== null) {
    return dbFailure(
      "createPaymentOrder/event",
      eventError,
      "Could not load this invitation, please try again.",
    );
  }

  if (event === null) {
    /*
      Deliberately the same answer whether the event does not exist or belongs
      to someone else. Telling a signed-in host which of the two it was is
      telling them which event ids are real.
    */
    return dbFailure(
      "createPaymentOrder/notFound",
      new Error(`No event ${eventId} for host ${user.id}`),
      "This invitation could not be found.",
    );
  }

  if (event.is_paid) {
    return dbFailure(
      "createPaymentOrder/alreadyPaid",
      new Error(`Event ${eventId} is already paid`),
      "This invitation has already been published.",
    );
  }

  let orderId: string;

  try {
    const razorpay = createRazorpayClient();

    const order = await razorpay.orders.create({
      amount: INVITATION_PRICE_PAISE,
      currency: INVITATION_CURRENCY,
      /*
        Razorpay caps the receipt at 40 characters. A uuid is 36, so the event
        id fits exactly and is the most useful thing to see in their dashboard:
        it is what a refund or a dispute would have to be traced back to.
      */
      receipt: eventId,
      /*
        Carried so a payment can be reconciled from Razorpay's side alone. The
        webhook does NOT trust these — it matches on the order id it stored
        itself — but a human reading a payment in their dashboard can see which
        invitation and which host it belonged to.
      */
      notes: { event_id: eventId, host_id: user.id },
    });

    orderId = order.id;
  } catch (cause: unknown) {
    return dbFailure(
      "createPaymentOrder/razorpay",
      cause,
      "Could not start the payment, please try again.",
    );
  }

  /*
    The admin client, because 0009 grants no insert policy to any browser role.
    Reached only now, with the host identified and the event confirmed theirs.
  */
  const admin = createAdminClient();

  const { error: insertError } = await admin.from("payments").insert({
    event_id: eventId,
    razorpay_order_id: orderId,
    amount: INVITATION_PRICE_PAISE,
    status: "created",
  });

  if (insertError !== null) {
    /*
      The order exists at Razorpay and we failed to write it down. Refusing here
      is the safe end of that: an unrecorded order is one the webhook cannot
      match, so letting the host pay against it would take their money and leave
      nothing able to mark the invitation paid. An unused order simply expires.
    */
    return dbFailure(
      "createPaymentOrder/insert",
      insertError,
      "Could not start the payment, please try again.",
    );
  }

  return dbSuccess({
    orderId,
    amount: INVITATION_PRICE_PAISE,
    currency: INVITATION_CURRENCY,
    keyId,
  });
}
