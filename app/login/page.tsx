import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import SignInForm from "@/components/auth/SignInForm";

export const metadata: Metadata = {
  title: "Sign in — Lifafa",
  description: "Sign in to Lifafa to build and manage your invitations.",
};

/**
 * Only same-origin paths are carried through to the callback.
 *
 * Mirrors the check in app/auth/callback/route.ts. Both ends validate rather
 * than one trusting the other: this value reaches the callback through the
 * email link, so by then it has been outside the app entirely.
 */
function safeRedirect(raw: string | undefined): string {
  if (raw === undefined || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }

  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}): Promise<ReactElement> {
  const params = await searchParams;

  return (
    <main className="relative flex min-h-screen flex-col bg-[var(--lifafa-ink)]">
      {/*
        The same warm bloom the landing hero opens with, so arriving here does
        not feel like leaving the product for a utility page.
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
        <div className="w-full max-w-[400px]">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]">
            Sign in to Lifafa
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--lifafa-muted)]">
            Your invitations, your guest list, and every reply as it arrives.
          </p>

          <div className="mt-8">
            <SignInForm
              redirectTo={safeRedirect(params.redirectTo)}
              initialError={params.error ?? null}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
