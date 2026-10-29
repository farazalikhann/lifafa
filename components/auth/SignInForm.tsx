"use client";

import { useEffect, useState, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Sign in with Google, and nothing else.
 *
 * No password field, and no account to create: a host who has never been here
 * and a host returning press the same button. Google is the same Supabase
 * Auth, so a host who signed in another way before lands on the same
 * auth.users row when their Google address matches, and the host_id on their
 * events, and every RLS policy that compares it with auth.uid(), still matches.
 */

/** Messages for the reasons the callback route can hand back. */
const ERROR_MESSAGES: Record<string, string> = {
  link: "That sign in could not be completed. Please try again.",
  expired: "That sign in has expired. Please try again.",
  browser:
    "That sign in was started in a different browser from this one. Please try again here.",
  config: "Sign in is not available right now. Please try again shortly.",
};

/**
 * Backing out of Google's consent screen is a choice, not a failure, so it
 * gets a quiet note rather than the error treatment.
 */
const CANCELLED_NOTICE =
  "Google sign in was cancelled. You can try again whenever you are ready.";

/**
 * The Google "G", in Google's own colours, on the white disc Google asks for
 * when the mark sits on a coloured button. Inline so it costs no request.
 */
function GoogleMark(): ReactElement {
  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white"
    >
      <svg viewBox="0 0 48 48" focusable="false" className="h-[18px] w-[18px]">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
    </span>
  );
}

export default function SignInForm({
  redirectTo,
  initialError,
}: {
  /** Where to land after signing in. A path, already validated by the caller. */
  redirectTo: string;
  /** A reason code from the callback route, if it bounced someone back here. */
  initialError: string | null;
}): ReactElement {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    initialError === "cancelled" ? CANCELLED_NOTICE : null,
  );
  const [error, setError] = useState<string | null>(
    initialError === null || initialError === "cancelled"
      ? null
      : (ERROR_MESSAGES[initialError] ??
        "Something went wrong signing you in. Please try again."),
  );

  /*
    Pressing Back on Google's screen can restore this page from the back/forward
    cache with its state intact, which would leave the button disabled on
    "Redirecting" with nothing in flight. A restored page is a fresh chance to
    press it.
  */
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        setIsRedirecting(false);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleGoogleSignIn = async (): Promise<void> => {
    if (isRedirecting) {
      return;
    }

    setIsRedirecting(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    /*
      The destination rides on the callback URL, so a host sent here from
      /create goes back to /create.

      This page's own origin, not SITE_ORIGIN. The PKCE verifier cookie is
      written on the origin that pressed the button, and the exchange in
      app/auth/callback/route.ts can only read it on that same origin. A
      callback on any other domain fails every time.
    */
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirectTo", redirectTo);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.toString() },
      });

      if (oauthError !== null) {
        console.error("[auth] could not start Google sign in:", oauthError);
        setError("Could not start Google sign in. Please try again.");
        setIsRedirecting(false);
      }

      /*
        On success the browser is already leaving for Google, so the button
        stays disabled until the page unloads.
      */
    } catch (cause: unknown) {
      console.error("[auth] Google sign in request failed:", cause);
      setError(
        "Could not reach the sign in service. Check your connection and try again.",
      );
      setIsRedirecting(false);
    }
  };

  return (
    <div>
      {notice !== null ? (
        <p
          role="status"
          className="mb-4 rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3 text-sm text-[var(--lifafa-muted)]"
        >
          {notice}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={isRedirecting}
        aria-busy={isRedirecting}
        aria-describedby={error === null ? undefined : "signin-error"}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--lifafa-marigold)] px-5 text-base font-semibold text-[var(--lifafa-ink)] shadow-sm transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px disabled:cursor-wait disabled:opacity-70"
      >
        <GoogleMark />
        {isRedirecting ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      {/* Inline, never an alert: a dialog interrupts and cannot be re-read. */}
      {error !== null ? (
        <p
          id="signin-error"
          role="alert"
          className="mt-4 rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-4 py-3 text-sm text-[var(--lifafa-cream)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
