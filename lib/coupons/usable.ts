import type { CouponRow } from "@/types/database";

/**
 * Whether a stored coupon may be used at a given moment, and if not, why.
 *
 * The rules findUsableCoupon (lib/coupons/lookup.ts) applies to the row it has
 * read, kept apart from the read so they can be checked at any moment without
 * a database: scripts/check-checkout-price.mjs runs this file with Node and asks
 * it about a coupon after its end date.
 *
 * THE ORDER OF THE CHECKS IS THE ORDER OF THE MESSAGES: inactive first, then
 * expired, then exhausted, so a code that is all three reports the most
 * fundamental reason rather than an incidental one.
 *
 * Compared with `now` here and with the database's own clock in
 * redeem_coupon()'s WHERE clause (0010). Two clocks, allowed to disagree by the
 * width of a request: this one decides what the host is shown and charged, and
 * the database's decides whether the use is counted.
 */
export function couponRefusal(
  coupon: Pick<CouponRow, "is_active" | "expires_at" | "max_uses" | "used_count">,
  now: Date,
): "inactive" | "expired" | "exhausted" | null {
  if (!coupon.is_active) {
    return "inactive";
  }

  if (coupon.expires_at !== null && Date.parse(coupon.expires_at) <= now.getTime()) {
    return "expired";
  }

  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return "exhausted";
  }

  return null;
}
