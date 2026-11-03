import type { ReactElement } from "react";
import Link from "next/link";
import AccountLink from "@/components/landing/AccountLink";
import Logo from "@/components/brand/Logo";

/**
 * The landing page's way back in.
 *
 * A returning host who has signed out lands on the hero and, until this
 * existed, had nothing to click: their invitations live behind /dashboard,
 * which bounces to /login, which they had to know to type. One control in the
 * corner is the whole fix.
 *
 * Which control it is, "Sign in" or "My invitations", is decided in the
 * browser (AccountLink). It was decided here once, from the session cookie,
 * and reading a cookie made the home page render on every visit: no cache, a
 * server round trip before the first byte, and two Supabase auth checks for a
 * signed-in host. Now the page is static and served from the edge; a
 * signed-in host sees "Sign in" for the moment before AccountLink runs.
 */

export default function LandingHeader(): ReactElement {
  return (
    /*
      Fixed rather than sticky, and translucent rather than solid: the hero is a
      full viewport of centred type with a warm bloom behind it, and a bar that
      scrolled away with it would not be there when a visitor decided they
      wanted it. The blur lets the bloom through so the bar reads as part of the
      hero rather than as a strip laid over it.

      z-50 clears everything the landing page draws; nothing there is fixed.
    */
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--lifafa-hairline)]/60 bg-[var(--lifafa-ink)]/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-1.5 sm:px-8">
        <Link
          href="/"
          className="flex min-h-11 items-center rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          <Logo />
        </Link>

        {/*
          One control, and which one is settled in the browser (above). A text
          link rather than a button in both states: this is a way back to
          something the visitor already has, not the page's call to action —
          that lives in the hero and in the pricing section, and a second
          filled button up here would compete with it.

          min-h-11 on a link that is only ~20px of text is what makes the tap
          target 44px without drawing a 44px box.
        */}
        <AccountLink className="flex min-h-11 items-center rounded px-1 text-sm font-medium whitespace-nowrap text-[var(--lifafa-cream)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]" />
      </div>
    </header>
  );
}
