import type { MetadataRoute } from "next";
import { canonicalSiteOrigin } from "@/lib/siteUrl";

/**
 * sitemap.xml: the short list of pages Lifafa actually wants found.
 *
 * WHAT IS IN IT is everything a stranger could usefully arrive on from a
 * search — the landing page, and the editor they are invited to open from it.
 * That is the whole public surface. There is no blog, no pricing page of its
 * own and no help centre; the pricing and the answers live in sections of the
 * landing page, and a URL fragment is not a page.
 *
 * WHAT IS OUT, and why each is out rather than merely forgotten:
 *
 *  - /i/[inviteCode]. A guest's invitation. Unlisted deliberately: the code is
 *    the only thing standing between a stranger and a family's address and
 *    guest list, and listing invitations would hand a crawler every one of
 *    them. They stay fetchable — a chat app must be able to unfurl the link —
 *    just never advertised.
 *  - /dashboard. Behind the host gate in middleware.ts, so a crawler gets a
 *    redirect to /login and nothing else. app/dashboard/layout.tsx says
 *    noindex as well, for anything that reaches the HTML another way.
 *  - /checkin/[token]. A one-time pass address. Disallowed in robots.ts and
 *    noindex on the page itself.
 *  - /admin. The owner's dashboard, fenced three ways; see app/robots.ts.
 *  - /login. Nothing to rank for, and every route that needs it links to it.
 *
 * Every URL is absolute and built on canonicalSiteOrigin(), because a sitemap
 * has no document to resolve a relative path against and a search engine
 * ignores entries on a host other than the one that served the file. That is
 * the bare domain: www.getlifafa.co.in redirects to it, and a sitemap of
 * redirects is a sitemap of wasted crawls.
 *
 * No `lastModified`. Both pages are marketing copy that changes when someone
 * edits them, and a date generated at build time would claim a change on every
 * deploy — which teaches a crawler to stop believing the field.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = canonicalSiteOrigin();

  return [
    {
      url: origin,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${origin}/create`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
