import type { Metadata } from "next";

/**
 * The brand's link preview (public/brand/og-image-1200x630.png): the logo and
 * the line under it, for the landing page, the design gallery and the policy
 * and contact pages.
 *
 * NEVER in the root layout. Metadata is inherited, and an invitation link
 * (/i) decides its own preview: the card's image once it is paid and only a
 * plain wordmark before, so no event detail shows for an unpaid invitation.
 * A default set higher up would leak into every /i page that sets none.
 */
export const BRAND_SHARE_IMAGE = {
  url: "/brand/og-image-1200x630.png",
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
