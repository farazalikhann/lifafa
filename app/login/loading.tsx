import type { ReactElement } from "react";
import Shimmer from "@/components/skeleton/Shimmer";

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
        <span className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)]">
          Lifafa
        </span>
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
            {/* Continue with Google, the divider, the email field, and Send. */}
            <Shimmer className="h-[52px] w-full rounded-xl" />
            <div className="my-7 flex items-center gap-4">
              <span aria-hidden="true" className="h-px flex-1 bg-[var(--lifafa-hairline)]" />
              <span aria-hidden="true" className="h-px flex-1 bg-[var(--lifafa-hairline)]" />
            </div>
            <div className="flex flex-col gap-2">
              <Shimmer className="h-3.5 w-24 rounded-full" />
              <Shimmer className="h-12 w-full rounded-xl" />
            </div>
            <Shimmer className="mt-6 h-[52px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </main>
  );
}
