/**
 * What one invitation costs, as a number.
 *
 * The same ₹999 the landing page, the FAQ and the payment banner all state in
 * prose. Those are sentences written for a host and are left as sentences;
 * this is the figure arithmetic is done on, and the admin dashboard is the
 * first thing in the app that needs to multiply rather than print.
 *
 * WHY REVENUE IS DERIVED FROM IT RATHER THAN READ FROM A ROW. public.events
 * records whether an invitation was paid for — is_paid — and not what was paid.
 * There is no amount column, no order and no payment webhook yet, so the only
 * revenue figure the database can support is "paid invitations times the
 * price". That is exact while there is one price and no discounts, and it
 * stops being exact the day either changes. When a real payment lands, the
 * amount belongs on the row and the dashboard should read it from there.
 */
export const INVITATION_PRICE_INR = 999;

/**
 * A rupee figure with thousands separators, e.g. "₹1,23,456".
 *
 * en-IN, so the grouping is the Indian one — lakhs and crores, not thousands.
 * `Intl` is in every runtime this app targets, so this costs no dependency.
 */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
