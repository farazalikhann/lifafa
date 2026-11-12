import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import type { SavedCardStatus } from "@/components/auth/SavedCardPreview";
import SignInForm from "@/components/auth/SignInForm";
import { findTemplate } from "@/templates/registry";
import { LOGIN_PLACEHOLDERS } from "@/lib/loginPlaceholders";
import { inAppBrowser } from "@/lib/inAppBrowser";
import LegalFooter from "@/components/legal/LegalFooter";
import Logo from "@/components/Logo";
import { handoffFromSearch, isHandoffId, pathWithHandoff } from "@/lib/handoff/link";

/* Its own download: the plain sign-in page never fetches the card version's code. */
const CardLogin = dynamic(() => import("@/components/auth/CardLogin"));

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

  return pathWithHandoff(isCreatePath(redirectTo) ? redirectTo : "/create", handoff);
}

/** Whether a return path goes back to the card maker, /create. */
function isCreatePath(path: string): boolean {
  return path === "/create" || path.startsWith("/create?");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
    handoff?: string | string[];
    /** The design of a card stashed in this browser, named by the wizard (components/wizard/Wizard.tsx). */
    design?: string | string[];
  }>;
}): Promise<ReactElement> {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirectTo);
  /* On /login itself, or only inside the return path: a failed sign in comes back with that alone. */
  const handoff = isHandoffId(params.handoff)
    ? params.handoff
    : handoffFromSearch(redirectTo.split("?")[1] ?? "");

  /*
    A card waiting: handed over from Instagram's or Facebook's browser (the
    handoff), or stashed in this browser on its way back to /create. The page
    is then about that card (components/auth/CardLogin.tsx). The page is sent
    without waiting to look the card up: the page itself asks once it is up,
    and says so plainly if the card is not there (SavedCardPreview).
  */
  const forCard = handoff !== null || isCreatePath(redirectTo);
  const status: SavedCardStatus = handoff === null ? "local" : "handoff";
  /*
    The design's gallery picture, drawn at once while the card itself loads,
    from the design the link names (`design`: the in-app handoff and the
    wizard both add it).
  */
  const template = typeof params.design === "string" ? findTemplate(params.design) : null;
  const placeholder = template === null ? null : (LOGIN_PLACEHOLDERS[template.id] ?? null);
  /*
    Instagram's or Facebook's browser, where Google will not sign anyone in:
    the email code comes first there (SignInForm). Read from the request, not
    in the browser, so the order is right from the first paint.
  */
  const inApp = inAppBrowser((await headers()).get("user-agent") ?? "");

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
          {forCard ? (
            <CardLogin
              status={status}
              handoff={handoff}
              placeholder={placeholder}
              redirectTo={withCarriedCard(redirectTo, handoff)}
              initialError={params.error ?? null}
              inApp={inApp}
            />
          ) : (
          <>
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]">
            Sign in to Lifafa
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--lifafa-muted)]">
            Your invitations, your guest list, and every reply as it arrives.
          </p>

          <div className="mt-8">
            <SignInForm
              redirectTo={withCarriedCard(redirectTo, handoff)}
              initialError={params.error ?? null}
              inApp={inApp}
            />
          </div>
          </>
          )}

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
    </main>
  );
}
