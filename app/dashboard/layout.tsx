import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Nothing but metadata. It renders its children untouched and adds nothing to
 * the DOM — the same shape as app/i/[inviteCode]/layout.tsx, and for the same
 * reason: a layout is the only place to say something about a whole subtree.
 *
 * KEEPING THE HOST'S DASHBOARD OUT OF SEARCH, on the same three-fence pattern
 * app/robots.ts describes for /admin:
 *
 *  1. robots.ts disallows /dashboard, so a well-behaved crawler never fetches.
 *  2. This file sets noindex in the metadata, which is what a tool reading the
 *     HTML finds — and what handles a URL that is already in an index, since a
 *     Disallow alone cannot remove one.
 *  3. Nothing is in the sitemap; see app/sitemap.ts.
 *
 * None of the three is what keeps anyone OUT of a dashboard. That is the host
 * gate in middleware.ts, which redirects a signed-out visitor to /login before
 * a page renders, plus Row Level Security deciding which rows a signed-in one
 * can see. These three only govern what gets indexed.
 *
 * It matters here more than it looks: a dashboard URL carries an event id, and
 * an indexed one would put a host's guest list a search away for anyone who
 * ever pasted the link somewhere public.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
