"use client";

import { useEffect, useState, type ReactElement } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import {
  FBEVENTS_SRC,
  installMetaPixel,
  metaPixelNavigated,
  metaPixelSettled,
  pixelAllowedOn,
} from "@/lib/metaPixel";

/**
 * Puts the Meta Pixel on the pages lib/metaPixel.ts allows, and tells it about
 * every route change. Rendered once, by the root layout, inside a Suspense
 * boundary of its own: it reads the query (an `event` id there changes what
 * the pixel may see), and without the boundary that would take the static
 * landing page off the static path.
 *
 * fbevents.js is not put on a page until the first allowed one, so a guest
 * who opens an invitation never downloads it. Once it is on, it stays for the
 * life of the tab, as every script does, and lib/metaPixel.ts keeps it quiet
 * on any page it may not run on.
 */
export default function MetaPixel(): ReactElement | null {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!installed && pixelAllowedOn(pathname) && installMetaPixel()) {
      setInstalled(true);
    }

    metaPixelNavigated();
  }, [pathname, search, installed]);

  if (!installed) {
    return null;
  }

  return (
    <Script
      id="meta-pixel"
      src={FBEVENTS_SRC}
      strategy="lazyOnload"
      onLoad={metaPixelSettled}
      onError={metaPixelSettled}
    />
  );
}
