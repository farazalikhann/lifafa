import type { CouponRow } from "@/types/database";

/**
 * What a coupon does to a price. The one place a discount is ever computed.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE RULE THIS FILE EXISTS TO ENFORCE: the browser sends a code, and nothing
 * else. Not an amount, not a discount, not a final price. Every number below is
 * derived from a coupon row that was read out of the database a moment earlier
 * and from INVITATION_PRICE_PAISE, which is a server constant. There is no
 * parameter here that a request could supply.
 *
 * That is why this is a pure function of a row rather than a method on a
 * request: it cannot read anything it was not given, so there is no version of
 * it that accidentally trusts input. The two callers — the "apply" action that
 * previews a price and the order creation that charges it — both go through it,
 * which is what makes the preview and the charge provably the same arithmetic
 * rather than two implementations that agree today.
 * ────────────────────────────────────────────────────────────────────────────
 */

/**
 * The smallest order Razorpay will accept, in paise.
 *
 * ₹1. Razorpay refuses `amount` below 100 outright, so a 100% code, or a flat
 * code worth more than the invitation, would otherwise produce an order that
 * cannot be created and a host staring at an error with no idea why.
 *
 * WHAT THE CLAMP MEANS IN PRACTICE, because it is a real edge and not a
 * formality: a code generous enough to zero the price charges ₹1 instead. The
 * host is shown ₹1 before they pay, so nobody is surprised at the till, and the
 * admin who wrote the code can see the same figure. There is no free path —
 * "publish without paying" is not something this feature can grant, because
 * publishing is downstream of a captured payment and a captured payment needs
 * money to have moved.
 */
export const RAZORPAY_MINIMUM_PAISE = 100;

/** What a coupon is worth against a given price. */
export interface CouponQuote {
  /** The code, uppercase, exactly as stored. */
  code: string;
  /** List price before anything was taken off. */
  basePaise: number;
  /**
   * What was actually taken off, after clamping. Never more than
   * `basePaise - RAZORPAY_MINIMUM_PAISE`, and never negative.
   */
  discountPaise: number;
  /** What to charge. Never below RAZORPAY_MINIMUM_PAISE. */
  finalPaise: number;
  /**
   * Whether the clamp changed the answer — the code was worth more than it was
   * allowed to take off. Shown to the admin, not to the host: the host just
   * sees a price.
   */
  clamped: boolean;
}

/**
 * The discount a coupon is worth, before any clamping.
 *
 * Percent is rounded DOWN, so a 33% discount on 99900 takes 32967 and not
 * 32967.00000000001 — and, where it matters, so that rounding never invents a
 * paisa of discount that was not offered. `Math.floor` rather than `Math.round`
 * for that reason: the house rounds towards the house, and the alternative is a
 * final amount that does not reconcile against the percentage in the admin UI.
 */
function rawDiscountPaise(coupon: CouponRow, basePaise: number): number {
  if (coupon.discount_type === "percent") {
    return Math.floor((basePaise * coupon.discount_value) / 100);
  }

  /* 'flat' — the value is already paise. */
  return coupon.discount_value;
}

/**
 * Prices one invitation with one coupon applied.
 *
 * Takes the coupon ROW, not a code: by the time anything gets here the code has
 * already been looked up, and the values used are the stored ones. A caller
 * holding only a string cannot call this, which is the intended shape.
 *
 * Does NOT check whether the coupon is usable — that is
 * lib/coupons/lookup.ts's job, and it runs first. This function answers "what
 * is it worth", on the assumption the answer to "may it be used" is already
 * yes. Splitting the two means the arithmetic has one job and the eligibility
 * rules have one place.
 */
export function quoteWithCoupon(
  coupon: CouponRow,
  basePaise: number,
): CouponQuote {
  const raw = rawDiscountPaise(coupon, basePaise);

  /*
    The most a discount may ever take off. Both ends matter: `Math.max(0, …)`
    stops a nonsensical stored value producing a negative discount — which
    would be a surcharge — and the ceiling is what keeps the final amount at or
    above Razorpay's floor.
  */
  const maximum = Math.max(0, basePaise - RAZORPAY_MINIMUM_PAISE);
  const discountPaise = Math.min(Math.max(0, raw), maximum);

  return {
    code: coupon.code,
    basePaise,
    discountPaise,
    finalPaise: basePaise - discountPaise,
    clamped: raw > discountPaise,
  };
}

/** How a coupon's worth reads in a sentence: "20% off" or "₹200 off". */
export function describeDiscount(
  discountType: CouponRow["discount_type"],
  discountValue: number,
): string {
  return discountType === "percent"
    ? `${discountValue}% off`
    : `₹${Math.round(discountValue / 100).toLocaleString("en-IN")} off`;
}
