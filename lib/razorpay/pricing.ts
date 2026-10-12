/**
 * The currency every order is placed in.
 *
 * What an order is FOR is no longer here: an invitation's price is its
 * template's (`price` on TemplateConfig, from lib/pricing.ts), read on the
 * server from the saved invitation by templatePricePaise in
 * templates/registry.ts. See createPaymentOrder in lib/db/payments.ts.
 */

/** The only currency Lifafa charges in. */
export const INVITATION_CURRENCY = "INR";
