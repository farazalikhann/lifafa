import { cache } from "react";
import { findUsableCoupon } from "@/lib/coupons/lookup";
import { WEDDING10_OFFER, offerOpen, type OfferBanner } from "@/lib/offers";

/**
 * The offer the payment step shows right now, or null.
 *
 * DECIDED ON THE SERVER, AT THIS REQUEST. Both pages that show the payment step
 * (the dashboard and the wizard's last step) are rendered per request, so the
 * banner is there in the first HTML when the offer is on and absent when it is
 * not: nothing appears or goes after the page has drawn, and no browser clock
 * is consulted.
 *
 * ON ONLY WHILE THE CODE WORKS. Two things must both be true: the offer's own
 * end has not passed (lib/offers.ts), and its coupon is a usable row now, by
 * the same rule the preview and the order apply (findUsableCoupon). So the
 * banner never offers a code that would be refused: not before the coupon has
 * been made in the admin, not after it is switched off, and not after it ends.
 *
 * A server module: it reads the coupons table with the service-role key, through
 * lib/coupons/lookup.ts, which refuses to load in a browser.
 */
/* Once per request: the page that shows the banner can start it early, beside its other reads. */
export const liveOffer = cache(async (): Promise<OfferBanner | null> => {
  if (!offerOpen(WEDDING10_OFFER, new Date())) {
    return null;
  }

  const lookup = await findUsableCoupon(WEDDING10_OFFER.code);

  if (lookup.kind !== "ok") {
    return null;
  }

  return {
    code: WEDDING10_OFFER.code,
    title: WEDDING10_OFFER.title,
    text: WEDDING10_OFFER.text,
  };
});
