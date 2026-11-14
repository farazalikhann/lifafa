"use client";

import { useEffect, useState, type ReactElement } from "react";
import dynamic from "next/dynamic";
import { loadClient, preloadClient } from "@/lib/supabase/loadClient";
import { preloadSignInCard, signInDestination } from "@/lib/auth/signInDestination";
import { isOnline } from "@/lib/loadNotice";
import { clarityEvent } from "@/lib/clarity";
import { rememberAdParams, type InAppBrowser } from "@/lib/inAppBrowser";
import EmailCodeForm, { MailMark } from "@/components/auth/EmailCodeForm";
import { PRIMARY_SIGNIN_BUTTON, SECONDARY_SIGNIN_BUTTON } from "@/components/auth/styles";

/* Its own download, fetched only when a visitor in an app's browser asks for Google. */
const InAppLoginPrompt = dynamic(() => import("@/components/browser/InAppLoginPrompt"));

/**
 * Sign in with Google, or with a 6-digit code sent by email.
 *
 * No password field, and no account to create: a host who has never been here
 * and a host returning do the same thing. Both are the same Supabase Auth, so
 * a host lands on the same auth.users row whichever way they come, when the
 * address matches, and the host_id on their events, and every RLS policy that
 * compares it with auth.uid(), still matches.
 *
 * THE ORDER. Google first, the email code second. In Instagram's and
 * Facebook's browsers (`inApp`, read from the user agent by the page, so it is
 * right from the first paint), Google refuses to sign anyone in, so the email
 * code comes first and Google second, as "Open in Chrome for Google" (or
 * Safari), which opens the existing prompt (InAppLoginPrompt).
 */

/** Messages for the reasons the callback route can hand back. */
const ERROR_MESSAGES: Record<string, string> = {
  link: "That sign in could not be completed. Please try again.",
  expired: "That sign in has expired. Please try again.",
  browser:
    "That sign in was started in a different browser from this one. Please try again here.",
  config: "Sign in is not available right now. Please try again shortly.",
  session:
    "Your code was right, but this browser did not keep you signed in. Please try again, or open this page in Chrome or Safari.",
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

/** One short line under a way in: what it asks of the host. */
function Hint({ id, children }: { id: string; children: string }): ReactElement {
  return (
    <p id={id} className="mt-2 text-center text-xs leading-relaxed text-[var(--lifafa-muted)]">
      {children}
    </p>
  );
}

/** "or", between the two ways in. */
function Or(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="my-5 flex items-center gap-3 text-xs font-medium tracking-[0.08em] text-[var(--lifafa-muted)] uppercase"
    >
      <span className="h-px flex-1 bg-[var(--lifafa-hairline)]" />
      or
      <span className="h-px flex-1 bg-[var(--lifafa-hairline)]" />
    </div>
  );
}

export default function SignInForm({
  redirectTo,
  initialError,
  inApp,
}: {
  /** Where to land after signing in. A path, already validated by the caller. */
  redirectTo: string;
  /** A reason code from the callback route, if it bounced someone back here. */
  initialError: string | null;
  /** Instagram's or Facebook's browser, read from the request's user agent; null elsewhere. */
  inApp: InAppBrowser | null;
}): ReactElement {
  const [isRedirecting, setIsRedirecting] = useState(false);
  /** Elsewhere, the email code opens at a tap on "Get a code on email". */
  const [emailOpen, setEmailOpen] = useState(false);
  /** In an app's browser: the "Open in Chrome" prompt, at a tap. */
  const [chromeOpen, setChromeOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(
    initialError === "cancelled" ? CANCELLED_NOTICE : null,
  );
  const [error, setError] = useState<string | null>(
    initialError === null || initialError === "cancelled"
      ? null
      : (ERROR_MESSAGES[initialError] ??
        "Something went wrong signing you in. Please try again."),
  );

  /* The ad's tags, kept for the link to the real browser (lib/inAppBrowser.ts). */
  useEffect(() => {
    if (inApp !== null) {
      rememberAdParams(window.location.search);
    }
  }, [inApp]);

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

  /*
    The sign-in client is the biggest script on this page and only the button
    needs it, so it does not come with the page (lib/supabase/loadClient.ts).
    It is fetched at the visitor's first touch or key, which is usually the
    press on the button itself, a moment before its click: not in an idle
    moment, where starting it would be a task of its own just when a tap
    could land.
  */
  useEffect(() => {
    const events = ["pointerdown", "keydown"] as const;
    const fetchClient = (): void => {
      preloadClient();
      /* And what finds a card waiting in this browser, which every sign in asks. */
      preloadSignInCard();
      for (const name of events) {
        window.removeEventListener(name, fetchClient, true);
      }
    };

    for (const name of events) {
      window.addEventListener(name, fetchClient, { capture: true, passive: true });
    }

    return () => {
      for (const name of events) {
        window.removeEventListener(name, fetchClient, true);
      }
    };
  }, []);

  const handleGoogleSignIn = async (): Promise<void> => {
    if (isRedirecting) {
      return;
    }

    /* Offline, the browser would leave for Google and land on its own error page: say so here instead. */
    if (!isOnline()) {
      setNotice(null);
      setError("You are offline. Connect to the internet, then try again.");
      return;
    }

    clarityEvent("login_google_click");
    setIsRedirecting(true);
    setError(null);
    setNotice(null);

    /*
      The destination rides on the callback URL, so a host sent here from
      /create goes back to /create.

      This page's own origin, not SITE_ORIGIN. The PKCE verifier cookie is
      written on the origin that pressed the button, and the exchange in
      app/auth/callback/route.ts can only read it on that same origin. A
      callback on any other domain fails every time.
    */
    const callback = new URL("/auth/callback", window.location.origin);
    /*
      A card still unsaved in this browser goes with the sign in, wherever
      this page was opened from: back to /create, which saves it to the
      account at once (lib/signInCard.ts).
    */
    callback.searchParams.set("redirectTo", await signInDestination(redirectTo));

    try {
      const supabase = await loadClient();
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

  const googleButton = (
    <button
      type="button"
      onClick={() => void handleGoogleSignIn()}
      disabled={isRedirecting}
      aria-busy={isRedirecting}
      aria-describedby={error === null ? "signin-google-hint" : "signin-error signin-google-hint"}
      className={PRIMARY_SIGNIN_BUTTON}
    >
      {/* The mark gives way to a spinner the moment it is pressed. */}
      {isRedirecting ? (
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
        </span>
      ) : (
        <GoogleMark />
      )}
      {isRedirecting ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );

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

      {/* Inline, never an alert: a dialog interrupts and cannot be re-read. */}
      {error !== null ? (
        <p
          id="signin-error"
          role="alert"
          className="mb-4 rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-4 py-3 text-sm text-[var(--lifafa-cream)]"
        >
          {error}
        </p>
      ) : null}

      {inApp === null ? (
        <>
          {googleButton}
          <Hint id="signin-google-hint">Fastest. One tap with your Google account.</Hint>
          <Or />
          {emailOpen ? (
            <EmailCodeForm redirectTo={redirectTo} primary={false} autoFocus />
          ) : (
            <button
              type="button"
              onClick={() => setEmailOpen(true)}
              aria-describedby="signin-email-hint"
              className={SECONDARY_SIGNIN_BUTTON}
            >
              <MailMark />
              Get a code on email
            </button>
          )}
          <Hint id="signin-email-hint">No password. We email you a 6-digit code.</Hint>
        </>
      ) : (
        <>
          <EmailCodeForm redirectTo={redirectTo} primary autoFocus={false} />
          <Hint id="signin-email-hint">Works right here. We email you a 6-digit code.</Hint>
          <Or />
          <button
            type="button"
            onClick={() => setChromeOpen(true)}
            aria-describedby="signin-browser-hint"
            className={SECONDARY_SIGNIN_BUTTON}
          >
            <GoogleMark />
            {inApp.platform === "android" ? "Open in Chrome for Google" : "Open in Safari for Google"}
          </button>
          <Hint id="signin-browser-hint">
            {inApp.platform === "android"
              ? "Opens Chrome, then pick your Google account."
              : "Opens Safari, then pick your Google account."}
          </Hint>
          {chromeOpen ? (
            <InAppLoginPrompt browser={inApp} onClose={() => setChromeOpen(false)} />
          ) : null}
        </>
      )}
    </div>
  );
}
