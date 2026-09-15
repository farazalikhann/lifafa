"use client";

import {
  useEffect,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Google sign in first, magic-link sign in beneath it.
 *
 * No password field, and no account to create: a host who has never been here
 * and a host returning both type the same thing and get the same link. That is
 * why the button says "Send me a sign in link" rather than offering a choice
 * between signing in and signing up — there is no distinction to make.
 *
 * Google is the same Supabase Auth, not a second system. A Google sign in with
 * the address a host already used for a magic link lands on the same
 * auth.users row, so the host_id on their events, and every RLS policy that
 * compares it with auth.uid(), still matches.
 */

/**
 * Deliberately permissive.
 *
 * The only real test of an address is whether the link arrives, so this exists
 * to catch a missing @ or a trailing comma — the slips worth catching before a
 * round trip. Anything stricter starts rejecting valid addresses, and a host
 * whose real email this form refuses has no way past it.
 */
function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Messages for the reasons the callback route can hand back. */
const ERROR_MESSAGES: Record<string, string> = {
  link: "That sign in link could not be read. Please request a new one.",
  expired:
    "That sign in link has expired or has already been used. Please request a new one.",
  browser:
    "That sign in was started in a different browser from this one. Please try again here.",
  config: "Sign in is not available right now. Please try again shortly.",
};

/**
 * Backing out of Google's consent screen is a choice, not a failure, so it
 * gets a quiet note rather than the error treatment.
 */
const CANCELLED_NOTICE =
  "Google sign in was cancelled. You can try again, or use your email below.";

/** The Google "G", in Google's own colours. Inline so it costs no request. */
function GoogleMark(): ReactElement {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className="h-[18px] w-[18px] shrink-0"
    >
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
  );
}

/**
 * A refused request, in words a host can act on.
 *
 * Supabase's own messages are written for developers — "email rate limit
 * exceeded", "For security purposes, you can only request this after 42
 * seconds" — and the commonest by far is a host tapping send again because the
 * first email had not arrived yet. That one gets its own sentence; everything
 * else gets a plain retry, with the real message left in the console.
 */
function signInErrorMessage(cause: { status?: number; message: string }): string {
  if (
    cause.status === 429 ||
    /rate limit|security purposes|too many/i.test(cause.message)
  ) {
    return "A sign in link was sent a moment ago. Check your inbox and spam folder, or wait a minute before asking for another.";
  }

  if (/invalid|validate email/i.test(cause.message)) {
    return "That email address was not accepted. Check it for typos and try again.";
  }

  return "Could not send the link, please try again.";
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
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    initialError === "cancelled" ? CANCELLED_NOTICE : null,
  );
  const [error, setError] = useState<string | null>(
    initialError === null || initialError === "cancelled"
      ? null
      : (ERROR_MESSAGES[initialError] ??
        "Something went wrong signing you in. Please request a new link."),
  );

  const trimmed = email.trim();
  const isValid = looksLikeEmail(trimmed);

  /*
    Pressing Back on Google's screen can restore this page from the back/forward
    cache with its state intact, which would leave the Google button disabled
    on "Redirecting" with nothing in flight. A restored page is a fresh chance
    to press it.
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
      Same callback as the magic link, and the destination rides on it the same
      way, so a host sent here from /create goes back to /create.

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
      setError("Could not start Google sign in. Please try again.");
      setIsRedirecting(false);
    }
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (!isValid || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    /*
      The destination rides on the callback URL rather than in local state,
      because the link is opened in whatever tab the host's mail client hands
      it to — often not this one, sometimes not even this browser. Nothing this
      component remembers survives that hop.

      The Supabase email templates append `&token_hash=…&type=email` straight
      onto this URL, so it must always leave here with a query string already
      on it. Dropping the redirectTo parameter would break every link.
    */
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirectTo", redirectTo);

    /*
      Caught as well as checked. supabase-js reports most failures as a value,
      but a request that never leaves the device can still throw — and without
      this the button stayed on "Sending…" for good, with nothing to press.
    */
    try {
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: callback.toString() },
      });

      if (signInError !== null) {
        console.error("[auth] could not send the sign in link:", signInError);
        setError(signInErrorMessage(signInError));
        return;
      }

      setSentTo(trimmed);
    } catch (cause: unknown) {
      console.error("[auth] sign in request failed:", cause);
      setError(
        "Could not reach the sign in service. Check your connection and try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  /* ── Confirmation ── */
  if (sentTo !== null) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--lifafa-marigold)]/40"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--lifafa-marigold)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
          >
            <path d="M3 7.5 12 13l9-5.5" />
            <rect x={3} y={5} width={18} height={14} rx={2.5} />
          </svg>
        </div>

        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-balance text-[var(--lifafa-cream)]">
          Check your email.
        </h2>

        <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
          We sent a sign in link to{" "}
          <span className="font-medium text-[var(--lifafa-cream)]">
            {sentTo}
          </span>
          .
        </p>

        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            setError(null);
          }}
          className="mx-auto min-h-11 rounded px-2 text-sm font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Use a different email
        </button>
      </div>
    );
  }

  /* ── The form ── */
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
        className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 text-base font-semibold text-[var(--lifafa-cream)] transition-[transform,border-color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px enabled:hover:border-[var(--lifafa-marigold)] disabled:cursor-wait disabled:opacity-70"
      >
        <GoogleMark />
        {isRedirecting ? "Redirecting to Google…" : "Continue with Google"}
      </button>

      <div className="my-7 flex items-center gap-4">
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-[var(--lifafa-hairline)]"
        />
        <span className="text-xs font-medium tracking-[0.14em] text-[var(--lifafa-muted)] uppercase">
          or sign in with email
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-[var(--lifafa-hairline)]"
        />
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} noValidate>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="signin-email"
            className="text-sm font-medium text-[var(--lifafa-cream)]"
          >
            Your email
          </label>
          <input
            id="signin-email"
            type="email"
            required
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && email.length > 0 && !isValid}
            aria-describedby={error === null ? undefined : "signin-error"}
            className="min-h-12 w-full rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 text-base text-[var(--lifafa-cream)] transition-colors duration-150 placeholder:text-[var(--lifafa-muted)]/60 focus:border-[var(--lifafa-marigold)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--lifafa-marigold)]"
            placeholder="you@example.com"
          />

          {/* Only once they have left the field, and only if they typed something. */}
          {touched && email.length > 0 && !isValid ? (
            <p className="text-xs text-[var(--lifafa-marigold)]">
              That does not look like an email address.
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={!isValid || isSending}
          className="mt-6 min-h-[52px] w-full rounded-xl px-4 text-base font-semibold transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px disabled:cursor-not-allowed"
          style={{
            backgroundColor:
              isValid && !isSending ? "var(--lifafa-marigold)" : "transparent",
            border:
              isValid && !isSending
                ? "1px solid transparent"
                : "1px solid var(--lifafa-hairline)",
            color:
              isValid && !isSending
                ? "var(--lifafa-ink)"
                : "var(--lifafa-muted)",
          }}
        >
          {isSending ? "Sending…" : "Send me a sign in link"}
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

        <p className="mt-5 text-center text-xs leading-relaxed text-[var(--lifafa-muted)]">
          No password needed. We will email you a link that signs you straight
          in.
        </p>
      </form>
    </div>
  );
}
