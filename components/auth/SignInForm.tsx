"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/client";
import { isOnline } from "@/lib/loadNotice";

/**
 * Sign in with Google, and, on the sign-in page for a saved card, with an
 * email link too (`withEmail`).
 *
 * No password field, and no account to create: a host who has never been here
 * and a host returning press the same button. Google is the same Supabase
 * Auth, so a host who signed in another way before lands on the same
 * auth.users row when their Google address matches, and the host_id on their
 * events, and every RLS policy that compares it with auth.uid(), still matches.
 */

/** A light check only: Supabase decides what it accepts. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** What a refused email link request means, in words a host can act on. */
function emailErrorMessage(cause: { status?: number; message: string }): string {
  if (cause.status === 429 || /rate limit|security purposes|too many/i.test(cause.message)) {
    return "A sign in link was sent a moment ago. Check your inbox and spam folder, or wait a minute before asking for another.";
  }

  if (/invalid|validate email/i.test(cause.message)) {
    return "That email address was not accepted. Check it for typos and try again.";
  }

  return "Could not send the link, please try again.";
}

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
  withEmail = false,
  onGoogle,
  onEmail,
}: {
  /** Where to land after signing in. A path, already validated by the caller. */
  redirectTo: string;
  /** A reason code from the callback route, if it bounced someone back here. */
  initialError: string | null;
  /**
   * "Continue with email" under Google: a sign in link by email, for a host
   * who would rather not use Google. On the sign-in page for a saved card
   * (app/login/page.tsx); the plain page has Google alone.
   */
  withEmail?: boolean;
  /** Told when Google is pressed, and when the email option is opened. */
  onGoogle?: () => void;
  onEmail?: () => void;
}): ReactElement {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailValid = looksLikeEmail(email);
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

    /* Offline, the browser would leave for Google and land on its own error page: say so here instead. */
    if (!isOnline()) {
      setNotice(null);
      setError("You are offline. Connect to the internet, then try again.");
      return;
    }

    onGoogle?.();
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

  /**
   * The email link. The destination rides on the callback URL, because the
   * link is opened wherever the mail app hands it (often its own browser),
   * and the card's handoff id inside it brings the card back there too. The
   * callback verifies the link's token_hash, which needs nothing from this
   * browser (app/auth/callback/route.ts).
   */
  const handleEmailSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setTouched(true);

    if (!emailValid || isSending) {
      return;
    }

    if (!isOnline()) {
      setError("You are offline. Connect to the internet, then try again.");
      return;
    }

    setIsSending(true);
    setError(null);
    setNotice(null);

    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirectTo", redirectTo);

    try {
      const { error: sendError } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: callback.toString() },
      });

      if (sendError !== null) {
        console.error("[auth] could not send the sign in link:", sendError);
        setError(emailErrorMessage(sendError));
        return;
      }

      setSentTo(email.trim());
    } catch (cause: unknown) {
      console.error("[auth] sign in link request failed:", cause);
      setError("Could not reach the sign in service. Check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (sentTo !== null) {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 py-5 text-center">
        <p className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--lifafa-cream)]">
          Check your email
        </p>
        <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
          We sent a sign in link to{" "}
          <span className="font-medium break-all text-[var(--lifafa-cream)]">{sentTo}</span>. Open it on
          this phone and your card comes with you. Not there? Look in spam.
        </p>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setError(null);
          }}
          className="mx-auto min-h-11 rounded px-2 text-sm font-medium text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Use a different email
        </button>
      </div>
    );
  }

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

      {withEmail ? (
        emailOpen ? (
          <form onSubmit={(event) => void handleEmailSubmit(event)} noValidate className="mt-4 flex flex-col gap-2">
            <label htmlFor="signin-email" className="text-sm font-medium text-[var(--lifafa-cream)]">
              Your email
            </label>
            <input
              id="signin-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && email.length > 0 && !emailValid}
              aria-describedby={error === null ? undefined : "signin-error"}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 text-base text-[var(--lifafa-cream)] focus:border-[var(--lifafa-marigold)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--lifafa-marigold)]"
            />
            {touched && email.length > 0 && !emailValid ? (
              <p className="text-xs text-[var(--lifafa-rose)]">That does not look like an email address.</p>
            ) : null}
            <button
              type="submit"
              disabled={isSending}
              aria-busy={isSending}
              className="mt-1 min-h-12 w-full rounded-full border border-[var(--lifafa-marigold)] px-5 text-base font-semibold text-[var(--lifafa-marigold)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-wait disabled:opacity-70"
            >
              {isSending ? "Sending…" : "Email me a sign in link"}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              onEmail?.();
              setEmailOpen(true);
            }}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full border border-[var(--lifafa-hairline)] px-5 text-base font-semibold text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 7.5 12 13l9-5.5" />
              <rect x={3} y={5} width={18} height={14} rx={2.5} />
            </svg>
            Continue with email
          </button>
        )
      ) : null}

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
