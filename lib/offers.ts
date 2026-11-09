/**
 * The offer on the payment step: WEDDING10, 10% off any invitation until the
 * end of 30 November 2026, India time.
 *
 * A REAL OFFER, AND THE COUPON IS WHAT MAKES IT ONE. The discount is the
 * WEDDING10 row in the coupons table, created in the admin's coupon form with
 * that day as its expiry; the server checks the row's own end date when the
 * code is previewed, when the order is made and when the payment is captured
 * (lib/coupons/usable.ts, lib/checkoutPrice.ts). This file only says which code
 * the payment step offers and until when, so nothing is offered after the day
 * the coupon itself stops working.
 *
 * THE END IS THE SAME INSTANT THE COUPON ENDS. The admin form keeps a coupon to
 * the end of the day it is given, 23:59:59 IST (app/admin/coupons/actions.ts),
 * and 30 November given there is exactly `endsAt` below.
 *
 * No imports, on purpose: scripts/check-checkout-price.mjs runs this file with
 * Node as it is.
 */

export interface Offer {
  /** The coupon it offers, uppercase, as stored. */
  code: string;
  /** The moment it ends, with its offset: ISO 8601. */
  endsAt: string;
  /** The banner's two lines on the payment step (components/dashboard/CouponField.tsx). */
  title: string;
  text: string;
}

export const WEDDING10_OFFER: Offer = {
  code: "WEDDING10",
  endsAt: "2026-11-30T23:59:59+05:30",
  title: "Limited time offer",
  text: "Get 10% off with code WEDDING10. Valid till 30 November.",
};

/** What the payment step is handed: the banner's words and the code its button applies. */
export type OfferBanner = Pick<Offer, "code" | "title" | "text">;

/** Whether the offer is still on at this moment. Asked of the server's clock, never the browser's. */
export function offerOpen(offer: Offer, now: Date): boolean {
  return now.getTime() < Date.parse(offer.endsAt);
}
