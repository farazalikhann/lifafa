"use client";

import { useEffect, type ReactElement } from "react";
import Link from "next/link";

/**
 * What a host sees when a route's error boundary catches something.
 *
 * Shared by app/error.tsx and app/create/error.tsx so a failure looks the same
 * wherever it happens, and so the two boundaries only have to differ in what
 * they say.
 *
 * The rule this component exists to keep: the host reads a sentence, and the
 * developer reads the error. `error.message` is never drawn — it is a
 * developer's string, sometimes naming an environment variable or a database
 * column, and neither is a host's business or any use to them. It goes to the
 * console instead, in full, so nothing is swallowed.
 */
export default function ErrorScreen({
  error,
  reset,
  title,
  description,
  context,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** The headline. One line, in the host's terms. */
  title: string;
  /** What happened and what it means for them, in a sentence or two. */
  description: string;
  /** Which boundary caught it, so the console line says where to look. */
  context: string;
}): ReactElement {
  /*
    The real error, in full, where a developer will actually find it.

    In an effect rather than during render: a render can be attempted more than
    once, and an error worth reading once is noise when it is logged four times.
  */
  useEffect(() => {
    console.error(`[lifafa] ${context}:`, error);
  }, [context, error]);

  return (
    <main className="relative flex min-h-screen flex-col bg-[var(--lifafa-ink)]">
      {/*
        The same warm bloom the landing hero and the sign-in page open with. A
        failure is still a Lifafa page, and dropping to a bare error screen is
        how a small problem starts to feel like a broken product.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,163,61,0.10), transparent 70%)",
        }}
      />

      <header className="relative z-10 px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="rounded font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Lifafa
        </Link>
      </header>

      <div className="relative z-10 flex flex-1 items-start justify-center px-5 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-[440px]">
          {/*
            role="alert" so a screen reader announces this on arrival. The
            boundary swaps the whole subtree, which is a navigation as far as
            the eye is concerned but nothing a screen reader would report.
          */}
          <div role="alert">
            <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--lifafa-muted)]">
              {description}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/*
              reset() re-renders the segment this boundary wraps. For a passing
              problem that is the whole fix; for a lasting one it fails again
              and lands back here, which is the honest answer rather than a
              spinner that never resolves.
            */}
            <button
              type="button"
              onClick={reset}
              className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Try again
            </button>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--lifafa-hairline)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Back to home
            </Link>
          </div>

          {/*
            The digest, when React produced one. It is a hash and nothing else —
            no message, no stack — which makes it the one part of a failure that
            is safe to show and worth quoting when a host writes in.
          */}
          {error.digest === undefined ? null : (
            <p className="mt-8 border-t border-[var(--lifafa-hairline)] pt-4 text-xs leading-relaxed text-[var(--lifafa-muted)]">
              If you need to tell us about this, quote{" "}
              <span className="font-mono text-[var(--lifafa-cream)]">
                {error.digest}
              </span>
              .
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
