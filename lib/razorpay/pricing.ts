/**
 * What an invitation costs Razorpay-side, and the one place the figure is set.
 *
 * SEPARATE FROM lib/pricing.ts, which holds INVITATION_PRICE_INR = 999 for the
 * admin dashboard's arithmetic and the sentences a host reads. This is the same
 * price in the only unit the payment path may use, derived from that one rather
 * than typed again — two independently maintained copies of a price is how a
 * host ends up charged something the page never said.
 *
 * PAISE, ALWAYS. Razorpay's API takes amounts in currency subunits: ₹999 is
 * 99900. Rupees anywhere in the payment path would mean a conversion at every
 * boundary and a rounding argument at each one, and the moment one of them is
 * missed a host is charged a hundredth of the price — or a hundred times it.
 *
 * Safe in the browser, and deliberately so: the checkout needs to display the
 * figure. It is NEVER read from the browser on the way back. The server action
 * in lib/db/payments.ts sets the amount from this constant when it creates the
 * order, and the amount Razorpay confirms is the amount Razorpay was told.
 */

import { INVITATION_PRICE_INR } from "@/lib/pricing";

/** ₹999 as 99900 paise. */
export const INVITATION_PRICE_PAISE = INVITATION_PRICE_INR * 100;

/** The only currency Lifafa charges in. */
export const INVITATION_CURRENCY = "INR";
