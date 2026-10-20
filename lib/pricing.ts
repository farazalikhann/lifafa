/**
 * What an invitation costs.
 *
 * TWO PRICES, BY TEMPLATE. A card in the Traditions Collection is ₹699 and one
 * in the Premium Collection is ₹999. Each template carries its own price
 * (`price` on TemplateConfig, in paise), and these two constants are the only
 * figures those are ever set from.
 *
 * PAISE, ALWAYS, wherever arithmetic is done. Razorpay takes amounts in
 * currency subunits, the payments table stores them, and a price in rupees
 * anywhere in that path is a conversion waiting to be forgotten. Rupees are
 * for a sentence on screen and nothing else; `formatPrice` is the one place
 * the two meet.
 *
 * NOTHING HERE DECIDES WHAT A HOST IS CHARGED. That is worked out on the
 * server, at the moment an order is made, from the template the saved
 * invitation is on; see templatePricePaise in templates/registry.ts and
 * createPaymentOrder in lib/db/payments.ts. Everything that imports this file
 * to show a price is showing a label.
 *
 * No imports, on purpose: the admin's coupon form reads the lowest price in
 * the browser, and must not bring the template registry with it.
 */
export const TRADITIONS_PRICE_PAISE = 69900;
export const PREMIUM_PRICE_PAISE = 99900;

/** The least any invitation costs: what "starting at" means, and what a coupon is free against. */
export const LOWEST_PRICE_PAISE = Math.min(
  TRADITIONS_PRICE_PAISE,
  PREMIUM_PRICE_PAISE,
);

/** Rupees, as a whole number, in India's own grouping: ₹1,499. */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * A price in paise written with "Rs", for the landing page: 69900 is "Rs 699".
 *
 * The rupee sign is outside the basic Latin set the site's two fonts load
 * first, and showing it on the first screen fetches a second file of each
 * font, more than the hero's picture, on the slow connection that page is
 * built for. "Rs" is read the same way and costs nothing.
 */
export function formatPriceRs(paise: number): string {
  return `Rs ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(paise / 100),
  )}`;
}

/** A price in paise as it is shown: 69900 is "₹699". */
export function formatPrice(paise: number): string {
  return formatInr(Math.round(paise / 100));
}
