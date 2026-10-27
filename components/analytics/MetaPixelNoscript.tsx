import type { ReactElement } from "react";
import { metaPixelEnabled, metaPixelId } from "@/lib/metaPixel";

/**
 * Meta's PageView for a visitor with JavaScript off: an image only such a
 * browser fetches. Placed by hand on pages the pixel may run on that need no
 * script to read (the landing page and the policy pages), never on a guest's.
 * Meta takes the page from the Referer header, which the site's referrer
 * policy keeps to the origin. Nothing without a pixel id.
 */
export default function MetaPixelNoscript(): ReactElement | null {
  if (!metaPixelEnabled()) {
    return null;
  }

  return (
    <noscript>
      <img
        height="1"
        width="1"
        style={{ display: "none" }}
        alt=""
        src={`https://www.facebook.com/tr?id=${encodeURIComponent(metaPixelId())}&ev=PageView&noscript=1`}
      />
    </noscript>
  );
}
