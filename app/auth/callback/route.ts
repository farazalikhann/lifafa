import type { NextRequest } from "next/server";
import { isAuthPKCECodeVerifierMissingError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { exits, isNewAccount, safeDestination } from "@/lib/auth/signInExits";

/**
 * Where a return from Google lands.
 *
 * Google sign in comes back as a PKCE `code`, exchanged below for a session.
 * The verifier cookie is written by the tab that pressed the button, and
 * Google sends that same tab straight back here. This is a route handler
 * rather than a page because it has to write the session cookies.
 *
 * Its exits are shared with the email code's own finish
 * (app/auth/email/route.ts) in lib/auth/signInExits.ts.
 */

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const { fail, succeed } = exits(
    origin,
    safeDestination(searchParams.get("redirectTo")),
  );

  /*
    Supabase reports a refused sign in with its own error parameters
    rather than a code. Carried through as our own readable reason instead of
    echoing theirs, which is written for developers.
  */
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  /*
    A host who backs out of Google's consent screen. Google reports it as
    `access_denied`, and Supabase passes that on with no `error_code`. Supabase
    also uses `access_denied` for a banned user or disabled signups, but always
    adds an `error_code` to those, so they fall through to the error below.
  */
  if (
    searchParams.get("error") === "access_denied" &&
    searchParams.get("error_code") === null
  ) {
    return fail("cancelled");
  }

  if (providerError !== null) {
    console.error("[auth] provider returned an error:", providerError);
    return fail("link");
  }

  const supabase = await createClient();

  if (code === null) {
    return fail("link");
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error !== null) {
    /*
      Told apart from an expired code because the fix is different: the code
      was fine, it arrived in a browser that never started this sign in.
    */
    if (isAuthPKCECodeVerifierMissingError(error)) {
      console.error("[auth] code opened in a different browser:", error);
      return fail("browser");
    }

    console.error("[auth] code exchange failed:", error);
    return fail("expired");
  }

  return succeed(isNewAccount(data.user));
}
