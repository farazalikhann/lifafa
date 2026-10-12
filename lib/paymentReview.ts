/**
 * A payment that arrived and was not applied: "under review".
 *
 * WHEN. The webhook confirms the money before it publishes anything (see
 * applyCapturedPayment in lib/db/applyPayment.ts). When what was captured is
 * not what the order asked for, or the order was priced for a cheaper template
 * than the invitation is on now, the invitation is not published and a person
 * has to settle it: publish it by hand from the admin, or refund it.
 *
 * HOW IT IS MARKED, with no column of its own: the order's row in `payments`
 * keeps its status, 'created', and is given the payment's id. A row is only
 * ever given one at the moment it becomes 'paid', so a 'created' row that has
 * one is exactly an order somebody has paid and nothing has been done about.
 * No migration, and nothing else in the app reads the pair any other way.
 *
 * WHAT THE HOST SEES from then on is the sentence below, wherever they would
 * have been told the invitation is unpaid or offered a way to pay: they have
 * paid, and must never be asked to again.
 *
 * No imports: the sentence is shown by client components too.
 */
export const PAYMENT_UNDER_REVIEW_MESSAGE =
  "We received your payment and are verifying it. Your invitation will be live shortly. If it is not live within a few hours, contact support.";
