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
  /* The path the pixel was put on, or null before it is. */
  const [installedOn, setInstalledOn] = useState<string | null>(null);
  const installed = installedOn !== null;

  useEffect(() => {
    if (!installed && pixelAllowedOn(pathname) && installMetaPixel()) {
      setInstalledOn(pathname);
    }

    metaPixelNavigated();
  }, [pathname, search, installed]);

  if (!installed) {
    return null;
  }

  /*
    On /create, the ad's landing page, fbevents.js waits for the page to have
    loaded: its PageView and ViewContent do not wait for it (lib/metaPixel.ts),
    and its 100 kB would otherwise be fetched beside the gallery's pictures.
    Everywhere else, as soon as the page has run, so an event that does wait
    for it, a Purchase among them, waits no longer than it did.
  */
  const strategy =
    installedOn === "/create" || installedOn?.startsWith("/create/") === true
      ? "lazyOnload"
      : "afterInteractive";

  return (
    <Script
      id="meta-pixel"
      src={FBEVENTS_SRC}
      strategy={strategy}
      onLoad={metaPixelSettled}
      onError={metaPixelSettled}
    />
  );
}
