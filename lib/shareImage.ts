import type { Metadata } from "next";
import { DEFAULT_SITE_ORIGIN } from "@/lib/siteUrl";

/**
 * The brand's link preview (public/og-image.png): the logo and the line under
 * it, for the landing page, the design gallery and the policy and contact
 * pages. An absolute address on the canonical domain, so every scraper
 * fetches the one image whichever deployment it found the link on.
 *
 * NOT in the root layout's metadata. Metadata is inherited, and an invitation
 * link (/i) decides its own preview: the card's image once it is paid and only
 * a plain wordmark before, so no event detail shows for an unpaid invitation.
 *
 * The same picture is app/opengraph-image.png, the Open Graph image for pages
 * that name none (the dashboard, sign-in). Every /i page names its own, which
 * replaces it, and a new /i branch must too. There is deliberately no
 * app/twitter-image.png: /i sets no Twitter tags, so it would inherit that one
 * and X would show the brand instead of the card.
 */
export const BRAND_SHARE_IMAGE = {
  url: `${DEFAULT_SITE_ORIGIN}/og-image.png`,
  width: 1200,
  height: 630,
  alt: "Lifafa, wedding invitations that tell you who is coming",
} as const;

/** Open Graph and Twitter tags for a marketing page, with the brand image. */
export function marketingShare(
  title: string,
  description: string,
  path: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: "Lifafa",
      title,
      description,
      url: path,
      images: [BRAND_SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [BRAND_SHARE_IMAGE],
    },
  };
}
