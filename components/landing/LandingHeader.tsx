import type { ReactElement } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

/**
 * The landing page's way back in.
 *
 * A returning host who has signed out lands on the hero and, until this
 * existed, had nothing to click: their invitations live behind /dashboard,
 * which bounces to /login, which they had to know to type. One control in the
 * corner is the whole fix.
 *
 * A SERVER COMPONENT, and that is the point of it. The signed-in state could
 * be read in the browser with useUser, but that hook starts every page as
 * "loading" and resolves a frame or two later, so a signed-in host would watch
 * "Sign in" turn into "My invitations" on every visit to the home page. Reading
 * the session here means the correct control is in the HTML.
 *
 * The cost is that `/` stops being statically rendered — cookies() makes the
 * route dynamic. That is the price of the state being right on first paint, and
 * the hero below is CSS-only either way.
 */

/**
 * Whether anyone is signed in, and never a throw.
 *
 * getUser() rather than getSession(), for the reason middleware.ts gives: a
 * session read believes the cookie, a user read revalidates it. Nothing here is
 * a gate — the worst a wrong answer does is show the wrong link — but two
 * places reading auth two different ways is how they drift apart.
 *
 * The try is for the one environment that legitimately has no keys:
 * next.config.ts deliberately lets `next dev` run without .env.local so a fresh
 * clone can open the editor, and createClient() throws there. The home page
 * greeting a new contributor with a stack trace would be a poor first
 * impression of the product. No configuration means no session, which is
 * exactly what signed out means.
 */
async function isSignedIn(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    return error === null && data.user !== null;
  } catch {
    return false;
  }
}

export default async function LandingHeader(): Promise<ReactElement> {
  const signedIn = await isSignedIn();

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
          className="flex min-h-11 items-center rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Lifafa
        </Link>

        {/*
          One control, and which one is settled on the server above. A text
          link rather than a button in both states: this is a way back to
          something the visitor already has, not the page's call to action —
          that lives in the hero and in the pricing section, and a second
          filled button up here would compete with it.

          min-h-11 on a link that is only ~20px of text is what makes the tap
          target 44px without drawing a 44px box.
        */}
        <Link
          href={signedIn ? "/dashboard" : "/login"}
          className="flex min-h-11 items-center rounded px-1 text-sm font-medium whitespace-nowrap text-[var(--lifafa-cream)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          {signedIn ? "My invitations" : "Sign in"}
        </Link>
      </div>
    </header>
  );
}
