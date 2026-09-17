/**
 * What the coupon form and its server actions agree to pass between them.
 *
 * ITS OWN FILE FOR THE SAME HARD REASON lib/admin/loginState.ts has one: a
 * module marked "use server" may export nothing but async functions, because
 * every export becomes a callable endpoint. A shape and an initial value cannot
 * live beside the actions that use them.
 *
 * Imported by a client component, so there is nothing secret here and nothing
 * that reads the environment or the database.
 */

export interface CouponFormState {
  /** What went wrong, or null. */
  error: string | null;
  /** The code that was just created, so the form can confirm it by name. */
  created: string | null;
}

export const COUPON_FORM_INITIAL_STATE: CouponFormState = {
  error: null,
  created: null,
};
