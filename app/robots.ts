import type { MetadataRoute } from "next";
import { canonicalSiteOrigin } from "@/lib/siteUrl";

/**
 * robots.txt: what a crawler may fetch, and where the map is.
 *
 * ALLOWED is the public marketing surface — the landing page and /create — and
 * /i/[inviteCode], which must stay fetchable so a chat app can unfurl a link
 * into a preview. Invitations are unlisted rather than disallowed, for exactly
 * that reason; see app/sitemap.ts for the whole in-and-out.
 *
 * DISALLOWED, and the first of the three fences around each:
 *
 *  - /admin, the owner's dashboard.
 *  - /dashboard, a host's, whose URLs carry an event id and whose pages carry
 *    a guest list.
 *  - /checkin/, whose URLs each carry a guest's one-time pass token and have
 *    no business being fetched by anything but the guest holding one.
 *
 * WHY THREE FENCES, none of which is redundant:
 *
 *  1. This file tells a well-behaved crawler not to fetch the path at all.
 *  2. middleware.ts sends `X-Robots-Tag: noindex` on every /admin response,
 *     including the redirect a signed-out crawler would actually receive.
 *     A Disallow alone does not remove a URL that is already indexed, and a
 *     crawler that ignores robots.txt still sees the header.
 *  3. The page metadata says the same thing, which is what a tool reading the
 *     HTML rather than the headers will find: app/admin/layout.tsx,
 *     app/dashboard/layout.tsx and app/checkin/[token]/page.tsx.
 *
 * None of the three is a security control. They keep these pages out of search
 * results; what keeps anyone out of them is the pair of gates in middleware.ts.
 *
 * `sitemap` and `host` are absolute because robots.txt is read as a standalone
 * document, and both name the bare domain — www.getlifafa.co.in redirects to
 * it, so it is the one address that is never a hop. `host` states which of the
 * two is canonical for the crawlers that honour it; the redirect and the
 * `alternates.canonical` in app/layout.tsx say the same thing to the rest.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = canonicalSiteOrigin();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/dashboard", "/dashboard/", "/checkin/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
