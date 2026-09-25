"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createRazorpayClient } from "@/lib/razorpay/client";
import {
  INVITATION_CURRENCY,
  INVITATION_PRICE_PAISE,
} from "@/lib/razorpay/pricing";
import { razorpayKeyId } from "@/lib/razorpay/keys";
import {
  couponRefusalMessage,
  findUsableCoupon,
  normaliseCouponCode,
} from "@/lib/coupons/lookup";
import {
  RAZORPAY_MINIMUM_PAISE,
  quoteWithCoupon,
  type CouponQuote,
} from "@/lib/coupons/quote";
import { eventEndDate } from "@/lib/eventLock";
import { dbFailure, dbSuccess, postgresError, type DbResult } from "@/lib/db/result";
import type { PaymentInsert } from "@/types/database";

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

/**
 * The two ways a write naming a column the database does not have comes back.
 *
 * Postgres raises 42703 itself; PostgREST answers PGRST204 when the column is
 * absent from the schema cache it validates writes against, which is what an
 * insert usually hits first. The same pair lib/db/events.ts watches for.
 */
const UNDEFINED_COLUMN = "42703";
const SCHEMA_CACHE_MISS = "PGRST204";

/** Whether this failure is "0010 has not been applied yet" and nothing else. */
function missingCouponColumns(cause: unknown): boolean {
  const pg = postgresError(cause);

  if (pg === null) {
    return false;
  }

  if (pg.code !== UNDEFINED_COLUMN && pg.code !== SCHEMA_CACHE_MISS) {
    return false;
  }

  return (
    pg.message.includes("coupon_code") || pg.message.includes("discount_amount")
  );
}

/** What the browser needs to open a checkout, and nothing more. */
export interface CheckoutOrder {
  /** The Razorpay order id, e.g. "order_ABC123". */
  orderId: string;
  /**
   * Paise, computed on the server from the coupon row. Sent so the checkout can
   * display it; NEVER read back from there.
   *
   * Worth being exact about what protects this, because it looks like a number
   * travelling to the browser and back. It does not travel back. Razorpay's
   * checkout is opened with an `order_id`, and the amount Razorpay charges is
   * the amount attached to that order when it was created here — editing this
   * field in the browser changes what the checkout window displays and nothing
   * whatsoever about what is taken. The webhook then matches on the order id
   * and reads the row this file wrote.
   */
  amount: number;
  currency: string;
  /** The publishable key id. See lib/razorpay/keys.ts on why this is safe. */
  keyId: string;
  /** The coupon actually applied, or null. Uppercase, as stored. */
  couponCode: string | null;
  /** Paise taken off, as computed here. Zero when no coupon applied. */
  discountAmount: number;
}

/** What the "Have a coupon?" field gets back. */
export type CouponPreview =
  | {
      ok: true;
      /** The code as stored, uppercase, so the field can show it back. */
      code: string;
      /** Paise. What the invitation costs without the code. */
      basePaise: number;
      /** Paise taken off. */
      discountPaise: number;
      /** Paise. What the host will actually be charged. */
      finalPaise: number;
    }
  | { ok: false; error: string };

/**
 * Prices an invitation with a typed code, without committing to anything.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THE BROWSER MAY SEND: an event id and a code string. That is the entire
 * argument list, and it is the entire argument list on the order path too. No
 * amount, no discount, no final price — there is no parameter here for one, so
 * there is nothing for a forged request to overstate.
 *
 * WHY THIS IS BEHIND A SESSION AND AN OWNERSHIP CHECK, when "is this code
 * valid" sounds harmless: without them this is a public oracle that answers yes
 * or no about any string, and a coupon code is short enough to be worth
 * grinding at. Requiring a signed-in host who owns an unpaid invitation does
 * not make guessing impossible, but it makes it cost an account and an event.
 *
 * NOTHING IS RESERVED. This tells the host what a code is worth right now. The
 * use is counted only when money is captured; see applyCapturedPayment.
 * ────────────────────────────────────────────────────────────────────────────
 */
export async function previewCoupon(
  eventId: string,
  rawCode: string,
): Promise<CouponPreview> {
  const code = normaliseCouponCode(rawCode);

  if (code.length === 0) {
    return { ok: false, error: "Enter a code to apply." };
  }

  const owned = await requireUnpaidOwnedEvent(eventId);

  if (!owned.ok) {
    return { ok: false, error: owned.error };
  }

  const lookup = await findUsableCoupon(code);

  if (lookup.kind !== "ok") {
    return { ok: false, error: couponRefusalMessage(lookup.kind) };
  }

  const quote = quoteWithCoupon(lookup.coupon, INVITATION_PRICE_PAISE);

  return {
    ok: true,
    code: quote.code,
    basePaise: quote.basePaise,
    discountPaise: quote.discountPaise,
    finalPaise: quote.finalPaise,
  };
}

/**
 * "Is this event yours, and is it still unpaid?" — asked the same way by both
 * paths below.
 *
 * Extracted so the preview and the order cannot answer it differently. The
 * select runs under the HOST'S OWN SESSION, so events_select_own (0001) is what
 * decides visibility; the `.eq("host_id")` beside it is the second lock
 * lib/db/events.ts uses on its update path, for the same reason.
 */
async function requireUnpaidOwnedEvent(
  eventId: string,
): Promise<{ ok: true; hostId: string } | { ok: false; error: string }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return {
      ok: false,
      error: "You need to be signed in to publish an invitation.",
    };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, is_paid, event_draft")
    .eq("id", eventId)
    .eq("host_id", user.id)
    .maybeSingle();

  if (eventError !== null) {
    console.error("[db] requireUnpaidOwnedEvent:", eventError);
    return { ok: false, error: "Could not load this invitation, please try again." };
  }

  /*
    Deliberately the same answer whether the event does not exist or belongs to
    someone else. Telling a signed-in host which of the two it was is telling
    them which event ids are real.
  */
  if (event === null) {
    return { ok: false, error: "This invitation could not be found." };
  }

  if (event.is_paid) {
    return { ok: false, error: "This invitation has already been published." };
  }

  /*
    A DATE BEFORE PAYMENT. A paid invitation is locked the day after its event
    and may only move its date so far (lib/eventLock.ts), and both are measured
    from the date it was paid with; one paid with no date would be open for
    ever. So payment waits for one, here, on the server, for the order and the
    coupon preview alike.
  */
  if (eventEndDate(event.event_draft) === null) {
    return {
      ok: false,
      error:
        "Add the event date before you publish. It is shown on the invitation, and the invitation closes after it.",
    };
  }

  return { ok: true, hostId: user.id };
}

/**
 * Creates a Razorpay order for one invitation and records it.
 *
 * THE AMOUNT IS NEVER AN ARGUMENT, and a coupon does not make it one. It is
 * computed here, in this request, from INVITATION_PRICE_PAISE and — when a code
 * was typed — from the coupon row read out of the database a few lines below. A
 * price that arrived from the browser would be a price the buyer chose: this is
 * a server action, and its arguments are whatever crossed the wire, not
 * whatever the button was rendered with.
 *
 * The coupon changes which ROW is consulted and nothing else. There is no
 * parameter for an amount, a discount or a final price, so a forged request has
 * nothing to overstate; the worst it can do is name a code that does not exist,
 * which is refused.
 *
 * OWNERSHIP IS ESTABLISHED FIRST, and by the database rather than by this
 * function. requireUnpaidOwnedEvent selects under the host's own session, so
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
  /**
   * A coupon code the host typed, or null.
   *
   * A STRING, AND ONLY A STRING. This is the entire influence the browser has
   * over what it is charged: it names a code, and the server decides what that
   * code is worth by reading the row. Sending a different code changes which
   * row is read; there is no argument here that could change the arithmetic
   * applied to it, because the arithmetic takes the row and a server constant.
   *
   * An unusable code is REFUSED rather than ignored. Quietly falling back to
   * full price would open a checkout for ₹999 to a host who believes they are
   * paying ₹499 — the worst possible moment to be silently wrong.
   */
  rawCouponCode: string | null = null,
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

  /*
    Identity and ownership first, before a coupon is looked up and long before
    Razorpay is called. Shared with previewCoupon so the two cannot drift.
  */
  const owned = await requireUnpaidOwnedEvent(eventId);

  if (!owned.ok) {
    return dbFailure(
      "createPaymentOrder/event",
      new Error(`Event ${eventId} is not available for payment`),
      owned.error,
    );
  }

  /*
    ────────────────────────────────────────────────────────────────────────
    THE AMOUNT IS RECOMPUTED HERE, EVERY TIME, FROM THE DATABASE.

    Not carried over from the preview, not read from a hidden field, not taken
    from the argument list — there is no argument that could carry it. The
    coupon row is fetched again in this request, and quoteWithCoupon applies it
    to INVITATION_PRICE_PAISE, a server constant. A host who previewed a code
    an hour ago and had it deactivated in the meantime is refused now, because
    "now" is the only moment this function consults.
    ────────────────────────────────────────────────────────────────────────
  */
  let quote: CouponQuote | null = null;

  if (rawCouponCode !== null && normaliseCouponCode(rawCouponCode).length > 0) {
    const lookup = await findUsableCoupon(rawCouponCode);

    if (lookup.kind !== "ok") {
      return dbFailure(
        "createPaymentOrder/coupon",
        new Error(`Coupon ${normaliseCouponCode(rawCouponCode)}: ${lookup.kind}`),
        couponRefusalMessage(lookup.kind),
      );
    }

    quote = quoteWithCoupon(lookup.coupon, INVITATION_PRICE_PAISE);
  }

  /* No coupon is not a special case — it is a quote with nothing taken off. */
  const amount = quote?.finalPaise ?? INVITATION_PRICE_PAISE;
  const discountAmount = quote?.discountPaise ?? 0;
  const couponCode = quote?.code ?? null;

  /*
    A code that covers the whole price is activated by activateWithFreeCoupon,
    not paid for; Razorpay would refuse a ₹0 order anyway. Reaching here with
    one means the page's applied code is out of date.
  */
  if (amount < RAZORPAY_MINIMUM_PAISE) {
    return dbFailure(
      "createPaymentOrder/free",
      new Error(`Coupon ${couponCode ?? "(none)"} makes event ${eventId} free`),
      "This code makes the invitation free. Apply it again to activate it.",
    );
  }

  let orderId: string;

  try {
    const razorpay = createRazorpayClient();

    const order = await razorpay.orders.create({
      /* The server-computed figure, and the only one Razorpay is ever told. */
      amount,
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
      notes: {
        event_id: eventId,
        host_id: owned.hostId,
        /*
          Carried so a discounted payment can be explained from Razorpay's
          dashboard alone — "why is this one ₹499" is the first question a
          reconciliation asks. The webhook does NOT read these: it matches on
          the order id and trusts the payments row this file wrote.
        */
        ...(couponCode === null ? {} : { coupon_code: couponCode }),
      },
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

  const row: PaymentInsert = {
    event_id: eventId,
    razorpay_order_id: orderId,
    /*
      What Razorpay was actually told to charge, and what the affiliate report
      later sums. Never the list price when a coupon applied — a payments table
      recording ₹999 for an order that took ₹499 would misstate revenue for
      good.
    */
    amount,
    status: "created",
    coupon_code: couponCode,
    discount_amount: discountAmount,
  };

  let { error: insertError } = await admin.from("payments").insert(row);

  /*
    ────────────────────────────────────────────────────────────────────────
    THE COLUMNS MAY NOT EXIST YET, and this is the one place in the payment
    path where that would be catastrophic rather than cosmetic.

    An application deploy reaches production the moment it is pushed; the
    migration in supabase/migrations/0010_coupons.sql waits for somebody to
    paste it into the SQL editor. In between, this insert names two columns
    public.payments does not have, PostgREST refuses the whole row, and the
    branch below turns that into "could not start the payment" — for EVERY
    host, coupon or not, until the migration lands. A feature nobody is using
    yet would have taken the checkout down with it.

    So the row outlives the columns, exactly as createEvent's does for its own
    pending columns. Both are dropped together because a discount with no code
    beside it is not half a record, it is a confusing one.

    A coupon cannot have been applied on this path: findUsableCoupon reads
    public.coupons, which the same migration creates, so a deployment missing
    these columns refuses a typed code long before here. The warning covers the
    half-applied case anyway — it is exactly the state nobody would think to
    look for.
    ────────────────────────────────────────────────────────────────────────
  */
  if (missingCouponColumns(insertError)) {
    console.error(
      "[db] createPaymentOrder: payments.coupon_code / payments.discount_amount do not exist. Apply supabase/migrations/0010_coupons.sql. Recording this order without them.",
    );

    if (couponCode !== null) {
      console.error(
        `[db] createPaymentOrder: order ${orderId} was discounted by coupon ${couponCode} and that fact could not be recorded.`,
      );
    }

    delete row.coupon_code;
    delete row.discount_amount;

    ({ error: insertError } = await admin.from("payments").insert(row));
  }

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
    amount,
    currency: INVITATION_CURRENCY,
    keyId,
    couponCode,
    discountAmount,
  });
}

/**
 * Activates an invitation with a code that covers the whole price. No Razorpay.
 *
 * The same two arguments as the order path, and the same rule: the browser
 * names a code and the server decides what it is worth. Ownership is checked
 * under the host's own session first, exactly as for an order.
 *
 * THE DATABASE DOES THE REST, IN ONE TRANSACTION. redeem_free_coupon (0014)
 * locks the coupon row, re-checks that it is active, unexpired, limited and has
 * a use left, that it really covers the list price, and that the invitation is
 * still unpaid and has a date — then writes a ₹0 'coupon' payment row, marks
 * the event paid as the webhook does, and counts the use. Two hosts redeeming
 * the last use at once: the second waits on the lock and is refused.
 *
 * The lookup and quote below run first only so the host gets the same messages
 * as on the order path; the function does not trust them.
 */
export async function activateWithFreeCoupon(
  eventId: string,
  rawCouponCode: string,
): Promise<DbResult<{ code: string }>> {
  const owned = await requireUnpaidOwnedEvent(eventId);

  if (!owned.ok) {
    return dbFailure(
      "activateWithFreeCoupon/event",
      new Error(`Event ${eventId} is not available for activation`),
      owned.error,
    );
  }

  const lookup = await findUsableCoupon(rawCouponCode);

  if (lookup.kind !== "ok") {
    return dbFailure(
      "activateWithFreeCoupon/coupon",
      new Error(`Coupon ${normaliseCouponCode(rawCouponCode)}: ${lookup.kind}`),
      couponRefusalMessage(lookup.kind),
    );
  }

  const quote = quoteWithCoupon(lookup.coupon, INVITATION_PRICE_PAISE);

  if (quote.finalPaise !== 0) {
    return dbFailure(
      "activateWithFreeCoupon/not-free",
      new Error(`Coupon ${quote.code} leaves ${quote.finalPaise} paise to pay`),
      "That code does not cover the full price.",
    );
  }

  /* Reached only now, with the host identified and the event confirmed theirs. */
  const { data: outcome, error } = await createAdminClient().rpc(
    "redeem_free_coupon",
    {
      p_event_id: eventId,
      p_code: quote.code,
      p_list_price: INVITATION_PRICE_PAISE,
    },
  );

  if (error !== null) {
    return dbFailure(
      "activateWithFreeCoupon/rpc",
      error,
      "Could not activate the invitation, please try again.",
    );
  }

  if (outcome === "ok") {
    console.info(
      `[payments] event ${eventId} activated free with coupon ${quote.code}`,
    );
    return dbSuccess({ code: quote.code });
  }

  return dbFailure(
    "activateWithFreeCoupon/refused",
    new Error(`redeem_free_coupon(${quote.code}) answered ${String(outcome)}`),
    freeCouponRefusalMessage(outcome),
  );
}

/** The host's sentence for each reason redeem_free_coupon (0014) can refuse. */
function freeCouponRefusalMessage(outcome: string | null): string {
  switch (outcome) {
    case "unknown":
    case "inactive":
    case "expired":
    case "exhausted":
      return couponRefusalMessage(outcome);
    /* A free code with no usage limit is never honoured; see 0014. */
    case "no_limit":
      return couponRefusalMessage("inactive");
    case "not_free":
      return "That code does not cover the full price.";
    case "not_found":
      return "This invitation could not be found.";
    case "already_paid":
      return "This invitation has already been published.";
    case "no_date":
      return "Add the event date before you publish. It is shown on the invitation, and the invitation closes after it.";
    default:
      return "Could not activate the invitation, please try again.";
  }
}
