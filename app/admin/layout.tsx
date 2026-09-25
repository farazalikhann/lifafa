import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { adminSession } from "@/lib/admin/auth";

/**
 * The shell every /admin page sits in.
 *
 * DELIBERATELY NOT LIFAFA. The host-facing app is dark, warm and set in
 * Fraunces; this is white, grey and set in whatever `--font-sans` resolves to.
 * That is not indifference to the design — it is the design. An internal tool
 * that looks like the product is a tool somebody screenshots into a deck by
 * mistake, and more usefully, the moment this page stops looking like Lifafa
 * is the moment it stops being confused with a host's dashboard at a glance.
 *
 * The root layout paints the body dark, so this repaints it. `min-h-screen`
 * with its own background is what keeps the dark from showing through beneath
 * short pages.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE CHROME MOVED HERE FROM THE PAGES, and that is what makes a slow query
 * survivable. Every page used to render its own header, so while one was
 * loading there was no header, no navigation and nothing on screen at all —
 * indistinguishable from a page that had failed. Now the nav and the header are
 * rendered by the layout, which Next keeps mounted across a navigation and
 * across a `loading.tsx`, so a slow page shows a skeleton inside its own frame.
 *
 * WHY THE SESSION IS READ HERE AND NOT PASSED DOWN. The shell needs a username.
 * Reading the cookie in the layout costs one HMAC verification that the page
 * below is about to perform anyway, and it is not a second gate: `adminSession`
 * returns null rather than redirecting, and the pages still call
 * requireAdminSession themselves. A layout is the wrong place to enforce a
 * gate — Next does not re-run it on every navigation within the segment, so a
 * check here would be a check that can go stale.
 * ────────────────────────────────────────────────────────────────────────────
 */

export const metadata: Metadata = {
  title: "Admin · Lifafa",
  /*
    The third of the three fences described in app/robots.ts. Next turns this
    into <meta name="robots" content="noindex, nofollow"> — which is what a
    tool reading the HTML finds, where robots.txt and the X-Robots-Tag header
    are what a crawler and a proxy respectively find.
  */
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>): Promise<ReactElement> {
  const session = await adminSession();

  return (
    <div className="min-h-screen bg-zinc-50 font-[family-name:var(--font-sans)] text-zinc-900">
      {/*
        No session means /admin/login, which is the one page under this layout
        that is open — and the one page that must not show a sidebar full of
        links to things the reader cannot open, or a "sign out" button for a
        session they do not have. Middleware has already refused every other
        path, so this branch is the login page and nothing else.
      */}
      {session === null ? (
        children
      ) : (
        <AdminShell username={session.username}>{children}</AdminShell>
      )}
    </div>
  );
}
