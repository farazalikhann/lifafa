import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { metaPixelEnabled, NEW_ACCOUNT_COOKIE } from "@/lib/metaPixel";
import { SIGNED_IN_COOKIE } from "@/lib/clarity";
import { AFTER_SIGN_IN_PARAM } from "@/lib/wizardSteps";

/**
 * The end of every sign in, shared by the two routes that finish one: the
 * return from Google (app/auth/callback/route.ts) and the step after an email
 * code (app/auth/email/route.ts). One copy, so a host signed in by email
 * lands exactly where a host signed in by Google does, with the same marks.
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
export function safeDestination(raw: string | null): string {
  if (raw === null || !raw.startsWith("/") || raw.startsWith("//")) {
    return DEFAULT_DESTINATION;
  }

  return raw;
}

/**
 * How recently an account must have been confirmed for this sign in to be the
 * one that made it.
 *
 * Supabase confirms an account when it first signs in, by Google or by an
 * email code, and never again: confirmed_at on the user just signed in is how
 * the auth flow itself tells a new host from a returning one. An hour is
 * generous for a round trip through Google or an inbox, and harmless for a
 * returning host, whose account was confirmed long before.
 */
const NEW_ACCOUNT_WINDOW_MS = 60 * 60 * 1000;

export function isNewAccount(user: User | null): boolean {
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
 *
 * `session`: an email code was accepted, but the server could not see the
 * sign in that followed (cookies blocked, or Supabase did not answer).
 */
export type SignInFailure = "cancelled" | "link" | "expired" | "browser" | "session";

/**
 * The two ways out of a sign-in route, built once per request around the
 * checked destination.
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
export function exits(origin: string, destination: string) {
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
      /*
        To the dashboard, marked as straight from a sign in: a host with no
        invitations is sent on from there to make one (app/dashboard/page.tsx),
        not left on an empty list. A card still unsaved in the browser does
        not come here: the sign-in page sends that host to /create
        (lib/signInCard.ts).
      */
      const landing =
        destination === DEFAULT_DESTINATION
          ? `${DEFAULT_DESTINATION}?${AFTER_SIGN_IN_PARAM}=1`
          : destination;
      const response = NextResponse.redirect(`${origin}${landing}`);

      /* For Clarity's login_success, read and cleared on the next page it runs on (lib/clarity.ts). */
      response.cookies.set(SIGNED_IN_COOKIE, "1", {
        maxAge: 600,
        path: "/",
        sameSite: "lax",
        secure: origin.startsWith("https:"),
      });

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
