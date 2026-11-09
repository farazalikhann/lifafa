/**
 * The rules a checkout's amount must keep: who may pay a test price, and when
 * a captured payment matches what it was for.
 *
 * A TEST PRICE IS A CHECKOUT UNDER ₹99. Invitations cost ₹699 and ₹999, and no
 * real offer takes one below ₹99. An amount under that exists only because the
 * owner made a coupon that takes nearly everything off (FARAZ99 is ₹998 off,
 * which leaves ₹1 on a ₹999 card) to try a real payment end to end. Such a
 * code is a coupon row like any other, so before this file anyone who learnt
 * it could publish a card for ₹1, and the ads were told a ₹1 Purchase.
 *
 * ONLY AN ALLOWLISTED ACCOUNT MAY PAY ONE: signed in, with a confirmed email
 * on TEST_PRICE_EMAILS, a server-only list (see .env.example). Unset, nobody
 * may. Checked on the server three times: previewCoupon and
 * createPaymentOrder in lib/db/payments.ts refuse the code to anyone else, and
 * the webhook (lib/db/applyPayment.ts, through captureRefusal below) holds a
 * test-price payment from anyone else for review instead of publishing it.
 *
 * NEVER REPORTED TO META. A test price is not a sale: no InitiateCheckout and
 * no Purchase. lib/db/confirmedPayment.ts never hands one to the dashboard,
 * and lib/metaPixel.ts refuses one again in the browser.
 *
 * ZERO IS NOT A TEST PRICE. A code covering the whole price never reaches
 * Razorpay (activateWithFreeCoupon) and never reports a Purchase.
 *
 * No imports, on purpose: scripts/check-checkout-price.mjs runs this file with
 * Node as it is, and lib/metaPixel.ts mirrors the line below.
 */
export const TEST_PRICE_BELOW_PAISE = 9900;

/** Whether an amount charged through Razorpay is a test price. */
export function isTestPrice(paise: number): boolean {
  return paise > 0 && paise < TEST_PRICE_BELOW_PAISE;
}

/** TEST_PRICE_EMAILS as a set: separated by commas or spaces, case ignored. */
export function parseTestPriceEmails(raw: string | null | undefined): ReadonlySet<string> {
  return new Set(
    (raw ?? "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.includes("@")),
  );
}

/**
 * Whether this account may pay a test price: its email confirmed and on the
 * list. Takes a Supabase user as it is.
 */
export function mayPayTestPrice(
  account: { email?: string | null; email_confirmed_at?: string | null } | null | undefined,
  allowed: ReadonlySet<string>,
): boolean {
  if (account === null || account === undefined) {
    return false;
  }

  const email = (account.email ?? "").trim().toLowerCase();
  const confirmed =
    typeof account.email_confirmed_at === "string" &&
    account.email_confirmed_at.length > 0;

  return email.length > 0 && confirmed && allowed.has(email);
}

/**
 * Why a captured payment must not publish its invitation, or null when it may.
 *
 * Every figure comes from a row the server wrote or Razorpay signed: nothing
 * from the browser. In order:
 *
 *  1. What was captured must be exactly what the order asked for.
 *  2. The order's list price (what it charged plus what its coupon took off)
 *     must be at least what the invitation's template costs now, so a card
 *     moved to a dearer template after ordering is not published on the
 *     cheaper order.
 *  3. An order made with a coupon must have been made before that coupon's
 *     end date. createPaymentOrder never makes one after (lib/coupons/usable.ts
 *     refuses the code), so this holds an order that got past it. An order made
 *     in time and paid a little after the end is honoured: its price was quoted
 *     and fixed while the offer was on.
 *  4. A test price must have been paid by an account allowed one.
 */
export function captureRefusal(check: {
  /** Paise Razorpay captured, from the signed webhook. */
  capturedPaise: number;
  /** Paise the order asked for, from the payments row. */
  orderPaise: number;
  /** Paise the order's coupon took off, from the payments row. */
  discountPaise: number;
  /** Paise the invitation's template costs now; null when the event is gone. */
  pricePaise: number | null;
  /** Whether the invitation's host may pay a test price. */
  hostMayPayTestPrice: boolean;
  /**
   * The order's coupon and when it ended, from the coupons row; null for an
   * order with no coupon, or a coupon with no end date.
   */
  coupon?: { code: string; endsAt: string | null } | null;
  /** When the order was made, from the payments row. */
  orderMadeAt?: string | null;
}): string | null {
  if (check.capturedPaise !== check.orderPaise) {
    return `captured ${check.capturedPaise} paise against an order for ${check.orderPaise}`;
  }

  const listPaise = check.orderPaise + check.discountPaise;

  if (check.pricePaise !== null && listPaise < check.pricePaise) {
    return `the order was priced at ${listPaise} paise and the invitation's template now costs ${check.pricePaise}`;
  }

  const endsAt = check.coupon?.endsAt ?? null;
  const madeAt = check.orderMadeAt ?? null;

  if (
    check.coupon != null &&
    endsAt !== null &&
    madeAt !== null &&
    Date.parse(madeAt) >= Date.parse(endsAt)
  ) {
    return `the order was made with ${check.coupon.code} at ${madeAt}, after it ended at ${endsAt}`;
  }

  if (isTestPrice(check.orderPaise) && !check.hostMayPayTestPrice) {
    return `a test price of ${check.orderPaise} paise, paid by an account not on TEST_PRICE_EMAILS`;
  }

  return null;
}
