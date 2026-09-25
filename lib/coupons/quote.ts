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
 * ₹1. Razorpay refuses `amount` below 100 outright. So a price is either ₹0 or
 * at least ₹1, never in between.
 *
 * A CODE THAT COVERS THE WHOLE PRICE MAKES IT ₹0, and a ₹0 invitation does not
 * go to Razorpay at all: activateWithFreeCoupon in lib/db/payments.ts activates
 * it and counts the use in one transaction (0014's redeem_free_coupon). A code
 * that leaves less than ₹1 but more than nothing — which only a flat code a few
 * paise short of the price could — is clamped up to ₹1, as before.
 */
export const RAZORPAY_MINIMUM_PAISE = 100;

/** What a coupon is worth against a given price. */
export interface CouponQuote {
  /** The code, uppercase, exactly as stored. */
  code: string;
  /** List price before anything was taken off. */
  basePaise: number;
  /**
   * What was actually taken off, after clamping. Either all of `basePaise` or
   * at most `basePaise - RAZORPAY_MINIMUM_PAISE`, and never negative.
   */
  discountPaise: number;
  /** What to charge. 0 (free, no Razorpay) or at least RAZORPAY_MINIMUM_PAISE. */
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
function rawDiscountPaise(
  discountType: CouponRow["discount_type"],
  discountValue: number,
  basePaise: number,
): number {
  if (discountType === "percent") {
    return Math.floor((basePaise * discountValue) / 100);
  }

  /* 'flat' — the value is already paise. */
  return discountValue;
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
  const raw = rawDiscountPaise(
    coupon.discount_type,
    coupon.discount_value,
    basePaise,
  );

  /*
    The most a discount may take off. `Math.max(0, …)` stops a nonsensical
    stored value producing a negative discount — which would be a surcharge. A
    code worth the whole price takes all of it; anything short of that keeps the
    final amount at or above Razorpay's floor.
  */
  const maximum =
    raw >= basePaise ? basePaise : Math.max(0, basePaise - RAZORPAY_MINIMUM_PAISE);
  const discountPaise = Math.min(Math.max(0, raw), maximum);

  return {
    code: coupon.code,
    basePaise,
    discountPaise,
    finalPaise: basePaise - discountPaise,
    clamped: raw > discountPaise,
  };
}

/**
 * Whether a coupon with these terms makes the invitation free.
 *
 * The same arithmetic as quoteWithCoupon, on the terms alone, so the admin form
 * can require a usage limit before the code exists. `discountValue` is as
 * stored: percent, or paise for a flat code.
 */
export function isFreeDiscount(
  discountType: CouponRow["discount_type"],
  discountValue: number,
  basePaise: number,
): boolean {
  return rawDiscountPaise(discountType, discountValue, basePaise) >= basePaise;
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
