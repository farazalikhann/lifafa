/**
 * Whether this browser holds a Supabase session cookie at all.
 *
 * @supabase/ssr keeps the session in cookies the browser can read (it is not
 * made httpOnly here: lib/supabase/client.ts reads them), named
 * sb-<project>-auth-token, split into .0, .1 when long. With none, the server
 * cannot find a session either: createEvent would answer `signedOut`, after a
 * round trip to the server that cost a signed-out visitor 1 to 2 seconds,
 * and 11 to 15 on a cold function, before /login. So "Save and continue" goes
 * straight to sign in then. With one, the server still decides: a cookie
 * can hold an expired session, and createEvent checks it.
 */
export function hasSessionCookie(): boolean {
  return /(?:^|;\s*)sb-[^=;]*-auth-token(?:\.\d+)?=/.test(document.cookie);
}
