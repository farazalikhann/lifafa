import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found — Lifafa",
};

/**
 * The answer for an address nothing in the app matches.
 *
 * Without this file Next draws its own 404 — a black page in a system font —
 * which reads as having left Lifafa altogether. The most likely visitor here is
 * a guest whose link was cut short in a forward, so the page says what probably
 * happened and offers the way back, in the same bloom and type the sign-in and
 * error screens open with.
 *
 * An unknown invite code never reaches this: /i/[inviteCode] answers that
 * itself, with wording about the invitation rather than about a page.
 */
export default function NotFound(): ReactElement {
  return (
    <main className="relative flex min-h-screen flex-col bg-[var(--lifafa-ink)]">
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
          <p className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-muted)] uppercase">
            Page not found
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]">
            There is nothing at this address.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--lifafa-muted)]">
            If someone sent you this link, part of it may have been cut off
            along the way. Ask them to send it again.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Back to home
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center rounded-full border border-[var(--lifafa-hairline)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              My invitations
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
