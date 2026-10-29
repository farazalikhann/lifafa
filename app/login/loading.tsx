import type { ReactElement } from "react";
import Shimmer from "@/components/skeleton/Shimmer";
import Logo from "@/components/brand/Logo";

/**
 * What a host sees between tapping "Sign in" and the form arriving: the sign-in
 * page itself, its words already in place, the form drawn as blocks of the
 * same size (SignInForm), so nothing moves when it lands.
 */
export default function LoginLoading(): ReactElement {
  return (
    <main className="relative flex min-h-screen flex-col bg-[var(--lifafa-ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[60vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, var(--lifafa-bloom), transparent 70%)",
        }}
      />

      <header className="relative z-10 px-5 py-6 sm:px-8">
        <Logo />
      </header>

      <div
        role="status"
        aria-live="polite"
        className="relative z-10 flex flex-1 items-start justify-center px-5 pt-6 pb-16 sm:items-center sm:pt-0"
      >
        <span className="sr-only">Opening sign in…</span>
        <div className="w-full max-w-[400px]">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]">
            Sign in to Lifafa
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--lifafa-muted)]">
            Your invitations, your guest list, and every reply as it arrives.
          </p>

          <div className="mt-8">
            {/* Continue with Google. */}
            <Shimmer className="h-14 w-full rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
