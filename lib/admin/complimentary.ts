/**
 * What the "Activate for free" control and its server action agree on.
 *
 * ITS OWN FILE for the reason lib/admin/couponForm.ts has one: a "use server"
 * module may export only async functions, and the client component needs these
 * values. Nothing here reads the environment or the database.
 */

/** The longest reason accepted. 0014's payments_method_shape says the same. */
export const COMPLIMENTARY_REASON_MAX_LENGTH = 80;

/** Offered as suggestions in the reason box. Any short text is accepted. */
export const COMPLIMENTARY_REASON_SUGGESTIONS: readonly string[] = [
  "Friend",
  "Family",
  "Testing",
  "Influencer",
  "Support",
];

/** What activateEventForFree answers. */
export type ActivateFreeResult = { ok: true } | { ok: false; error: string };
