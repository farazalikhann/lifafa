/**
 * Where a sign in should end: its `redirectTo`, or back to /create with a
 * card still unsaved in this browser, which /create then saves to the account
 * (lib/signInCard.ts). Asked by both ways in, as Google starts
 * (components/auth/SignInForm.tsx) and as the email code finishes
 * (components/auth/EmailCodeForm.tsx).
 *
 * lib/signInCard.ts is its own download, fetched on the sign-in page's first
 * tap (preloadSignInCard), so a page that is only read never fetches it and a
 * sign in rarely waits for it. Never throws: at worst the sign in goes where
 * it was going.
 */

export function preloadSignInCard(): void {
  void import("@/lib/signInCard").catch(() => {
    /* Fetched again when it is asked for. */
  });
}

export async function signInDestination(redirectTo: string): Promise<string> {
  try {
    const { afterSignInPath } = await import("@/lib/signInCard");
    return afterSignInPath(redirectTo);
  } catch {
    return redirectTo;
  }
}
