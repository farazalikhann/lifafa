import type { Metadata } from "next";
import { Suspense, type CSSProperties, type ReactNode } from "react";
import Clarity from "@/components/analytics/Clarity";
import MetaPixel from "@/components/analytics/MetaPixel";
import { clarityEnabled } from "@/lib/clarity";
import { PAIR_FONT_STACKS } from "@/lib/fontPairs";
import { metaPixelEnabled } from "@/lib/metaPixel";
import { canonicalSiteOrigin } from "@/lib/siteUrl";
import "./fonts/fonts.css";
import "./globals.css";

/*
  Every face the card and the site use is declared once, in app/fonts/fonts.css,
  from font files committed beside it (app/fonts/files/), and named on :root
  as a --font-* variable; lib/fontPairs.ts builds the card pairs on them.
  Nothing is fetched from Google at build time.

  Declaring a face costs a guest nothing: a browser fetches the file behind an
  @font-face only when some text on the page is set in it, and only for the
  unicode range that text falls in. So a card in the Royal pair pulls Great
  Vibes and Cormorant and never touches Cinzel or Bodoni, and the Devanagari
  cut of a face is fetched only by a page that sets Devanagari. No face is
  preloaded, and every one is display: swap.
*/

/*
  The site's address, fixed at build time and so safe in static metadata.

  metadataBase is what turns a relative image path in any page's metadata into
  the absolute URL that Open Graph and Twitter both require — a scraper has no
  page to resolve a relative path against. It is never left undefined now: an
  unset metadataBase makes Next fall back to localhost and emit a warning, and
  an og:image on localhost is a preview that never loads.

  The invite route still sets its own from the request, so the image a chat
  unfurls sits on the same origin as the link it came from even where nothing
  is configured; see app/i/[inviteCode]/layout.tsx.
*/
const siteOrigin = canonicalSiteOrigin();

/** Meta's proof that the site is ours, when Business Manager has asked for one. */
const metaDomainVerification = (
  process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION ?? ""
).trim();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Lifafa | Digital invitations with an up-to-date guest count",
  description:
    "Create a digital invitation for your celebration, share one link, and know exactly how many guests are coming before the day arrives.",
  /*
    Every page tells the next one only which site it came from, never which
    page. A same-site referrer is otherwise the whole address, and the Meta
    Pixel reports the referrer with each event: a host or guest arriving on the
    landing page from /i/<code> or /dashboard/<id> would hand it the invite
    code or the invitation's id. Other sites were already sent only the origin.
  */
  referrer: "strict-origin",
  /*
    The brand icons (public/brand/). The SVG first for browsers that take one,
    the 32px PNG for those that do not, and the larger PNGs for home screens.
  */
  icons: {
    icon: [
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  ...(metaDomainVerification.length > 0
    ? { other: { "facebook-domain-verification": metaDomainVerification } }
    : {}),
  /*
    NO `alternates.canonical` HERE, deliberately. Metadata is inherited: a
    canonical set on the root layout becomes every page's canonical, so /create
    would announce the landing page as its real address and ask to be dropped
    from the index. Each indexable page names its own — see app/page.tsx and
    app/create/layout.tsx — and they all resolve against the metadataBase above,
    so there is still only one host in play.
  */
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    /*
      The pair stacks sit on the same element as the font variables they
      name (:root, app/fonts/fonts.css), so each var() resolves here and is
      inherited already resolved.
    */
    <html
      lang="en-IN"
      style={PAIR_FONT_STACKS as CSSProperties}
    >
      <body className="bg-[var(--lifafa-ink)] font-[family-name:var(--font-sans)] text-[var(--lifafa-cream)] antialiased">
        {children}
        {/*
          Nothing at all without a pixel id. With one, it renders nothing on the
          server either: its boundary is what it shows until it runs in the
          browser, where lib/metaPixel.ts decides whether this page may have it.
        */}
        {metaPixelEnabled() ? (
          <Suspense fallback={null}>
            <MetaPixel />
          </Suspense>
        ) : null}
        {/* Hosts' pages on the production domain only; see lib/clarity.ts. */}
        {clarityEnabled() ? <Clarity /> : null}
      </body>
    </html>
  );
}
