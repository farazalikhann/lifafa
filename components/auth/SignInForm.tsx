"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Magic-link sign in.
 *
 * No password field, and no account to create: a host who has never been here
 * and a host returning both type the same thing and get the same link. That is
 * why the button says "Send me a sign in link" rather than offering a choice
 * between signing in and signing up — there is no distinction to make.
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
  config: "Sign in is not available right now. Please try again shortly.",
};

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
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    initialError === null
      ? null
      : (ERROR_MESSAGES[initialError] ??
        "Something went wrong signing you in. Please request a new link."),
  );

  const trimmed = email.trim();
  const isValid = looksLikeEmail(trimmed);

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (!isValid || isSending) {
      return;
    }

    setIsSending(true);
    setError(null);

    const supabase = createClient();

    /*
      The destination rides on the callback URL rather than in local state,
      because the link is opened in whatever tab the host's mail client hands
      it to — often not this one, sometimes not even this browser. Nothing this
      component remembers survives that hop.
    */
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("redirectTo", redirectTo);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: callback.toString() },
    });

    setIsSending(false);

    if (signInError !== null) {
      setError(
        signInError.message.length > 0
          ? signInError.message
          : "Could not send the link, please try again.",
      );
      return;
    }

    setSentTo(trimmed);
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
        No password needed. We will email you a link that signs you straight in.
      </p>
    </form>
  );
}
