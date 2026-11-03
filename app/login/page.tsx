import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import SignInForm from "@/components/auth/SignInForm";
import InAppLoginPrompt from "@/components/browser/InAppLoginPrompt";
import LegalFooter from "@/components/legal/LegalFooter";
import Logo from "@/components/Logo";
import { handoffFromSearch, isHandoffId, pathWithHandoff } from "@/lib/handoff/link";

export const metadata: Metadata = {
  title: "Sign in · Lifafa",
  description: "Sign in to Lifafa to build and manage your invitations.",
  /*
    Not indexed. A sign-in form has nothing to rank for, and an indexed one
    competes with the landing page for the same searches while offering a
    stranger a dead end. Every route that needs it links to it, which is the
    only way anyone should arrive. `follow` stays on so the links back to the
    landing page are still crawled.
  */
  robots: { index: false, follow: true },
};

/**
 * Only same-origin paths are carried through to the callback.
 *
 * Mirrors the check in app/auth/callback/route.ts. Both ends validate rather
 * than one trusting the other: this value reaches the callback by way of
 * Google, so by then it has been outside the app entirely.
 */
function safeRedirect(raw: string | undefined): string {
  if (raw === undefined || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }

  return raw;
}

/**
 * The return path with the card's id inside it, when this page was opened
 * with one from Instagram's or Facebook's browser (lib/handoff/link.ts).
 *
 * The id is already there on a link this build made. This also mends one made
 * before, which put the id on /login only, and one with no return path at
 * all: the card is brought back on /create, so that is where it goes.
 */
function withCarriedCard(redirectTo: string, handoff: string | null): string {
  if (handoff === null) {
    return redirectTo;
  }

  const onCreate = redirectTo === "/create" || redirectTo.startsWith("/create?");

  return pathWithHandoff(onCreate ? redirectTo : "/create", handoff);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string; handoff?: string | string[] }>;
}): Promise<ReactElement> {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirectTo);
  /* On /login itself, or only inside the return path: a failed sign in comes back with that alone. */
  const handoff = isHandoffId(params.handoff)
    ? params.handoff
    : handoffFromSearch(redirectTo.split("?")[1] ?? "");

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
            "radial-gradient(ellipse 70% 50% at 50% 0%, var(--lifafa-bloom), transparent 70%)",
        }}
      />

      <header className="relative z-10 px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="inline-flex items-center rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          <Logo />
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
            {/*
              A card carried over from Instagram's or Facebook's browser. It is
              safe on the server and is not touched here; /create saves it to
              the account once sign in brings the visitor back.
            */}
            {handoff !== null ? (
              <p
                role="status"
                className="mb-4 rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3 text-sm leading-relaxed text-[var(--lifafa-muted)]"
              >
                Your card is saved. Sign in to finish it.
              </p>
            ) : null}
            <SignInForm
              redirectTo={withCarriedCard(redirectTo, handoff)}
              initialError={params.error ?? null}
            />
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-[var(--lifafa-muted)]">
            By signing in you agree to the{" "}
            <Link
              href="/terms"
              prefetch={false}
              className="text-[var(--lifafa-cream)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Terms
            </Link>{" "}
            and the{" "}
            <Link
              href="/privacy"
              prefetch={false}
              className="text-[var(--lifafa-cream)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <LegalFooter className="relative z-10" />

      {/* Google will not sign anyone in from Instagram's or Facebook's browser. Those only. */}
      <InAppLoginPrompt />
    </main>
  );
}
