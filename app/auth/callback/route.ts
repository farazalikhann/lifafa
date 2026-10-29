import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthPKCECodeVerifierMissingError,
  type User,
} from "@supabase/supabase-js";
import { metaPixelEnabled, NEW_ACCOUNT_COOKIE } from "@/lib/metaPixel";
import { createClient } from "@/lib/supabase/server";

/**
 * Where a return from Google lands.
 *
 * Google sign in comes back as a PKCE `code`, exchanged below for a session.
 * The verifier cookie is written by the tab that pressed the button, and
 * Google sends that same tab straight back here. This is a route handler
 * rather than a page because it has to write the session cookies.
 */

const DEFAULT_DESTINATION = "/dashboard";

/**
 * Only same-origin paths are honoured as a destination.
 *
 * `redirectTo` arrives in a URL, which means an attacker can put anything in
 * it. Without this check a link to our own domain could bounce a freshly
 * signed-in host to somewhere else entirely — an open redirect, and a
 * convincing one precisely because the first hop was genuine. A value must
 * start with a single slash: "//evil.example" is protocol-relative and would
 * leave the site.
 */
function safeDestination(raw: string | null): string {
  if (raw === null || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_DESTINATION;
  }

  return raw;
}


/**
 * How recently an account must have been confirmed for this sign in to be the
 * one that made it.
 *
 * Supabase confirms an account when Google first signs it in, and never
 * again: confirmed_at on the user this route has just signed in is how the
 * auth flow itself tells a new host from a returning one. An hour is generous
 * for a round trip through Google, and harmless for a returning host, whose
 * account was confirmed long before.
 */
const NEW_ACCOUNT_WINDOW_MS = 60 * 60 * 1000;

function isNewAccount(user: User | null): boolean {
  const confirmed = user?.confirmed_at ?? user?.email_confirmed_at;

  if (confirmed === undefined) {
    return false;
  }

  const age = Date.now() - Date.parse(confirmed);

  /* A minute's grace for a clock that runs ahead of Supabase's. */
  return age > -60_000 && age < NEW_ACCOUNT_WINDOW_MS;
}

/**
 * Why a sign in came back to the login page. Each one is a message in
 * components/auth/SignInForm.tsx.
 */
type SignInFailure = "cancelled" | "link" | "expired" | "browser";

/**
 * The two ways out of this route, built once per request around the checked
 * destination.
 *
 * EVERY EXIT CARRIES THE DESTINATION, failures included, and this is the only
 * place that decides so. A failure used to be a bare /login?error=… on every
 * branch but one, which dropped the host's `redirectTo` on the floor: they
 * signed in again from there and landed on the dashboard, not back on /create
 * where their unsaved card was waiting. Now no branch builds a redirect of its
 * own, so no branch can leave the destination off.
 *
 * `succeed` joins origin and path as a string rather than resolving one against
 * the other. The destination is only ever a path, and a path handed to
 * `new URL(path, origin)` can still name a host of its own.
 */
function exits(origin: string, destination: string) {
  return {
    fail(reason: SignInFailure): NextResponse {
      const loginUrl = new URL("/login", origin);
      loginUrl.searchParams.set("error", reason);
      loginUrl.searchParams.set("redirectTo", destination);
      return NextResponse.redirect(loginUrl);
    },
    /*
      A new account's first sign in is marked for the ads' CompleteRegistration,
      in a cookie holding nothing but "1", which the next host page reads and
      clears (lib/metaPixel.ts). Not when there is no pixel to tell.
    */
    succeed(newAccount: boolean): NextResponse {
      const response = NextResponse.redirect(`${origin}${destination}`);

      if (newAccount && metaPixelEnabled()) {
        response.cookies.set(NEW_ACCOUNT_COOKIE, "1", {
          maxAge: 600,
          path: "/",
          sameSite: "lax",
          secure: origin.startsWith("https:"),
        });
      }

      return response;
    },
  };
}

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
