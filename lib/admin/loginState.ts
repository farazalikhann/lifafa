/**
 * What the admin login form and its server action agree to pass between them.
 *
 * ITS OWN FILE FOR A HARD REASON, not a stylistic one. A module marked
 * "use server" may export nothing but async functions — every export becomes a
 * callable endpoint, and a plain value cannot be one. So the shape and the
 * initial value cannot live beside `signIn` in app/admin/actions.ts, and a
 * build that tried would fail rather than misbehave.
 *
 * Imported by a client component, so there is nothing secret here and nothing
 * that reads the environment. It is a shape and an empty value.
 */

export interface AdminLoginState {
  /** The message to show, or null before anything has been submitted. */
  error: string | null;
}

export const ADMIN_LOGIN_INITIAL_STATE: AdminLoginState = { error: null };
