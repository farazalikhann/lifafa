"use client";

import { useEffect, useState, type ReactElement } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import {
  clarityAllowedOn,
  clarityHostAllowed,
  claritySnippet,
  guardClarityNavigation,
} from "@/lib/clarity";

/**
 * Puts Microsoft Clarity on the pages lib/clarity.ts allows, on the
 * production domain only. Rendered once, by the root layout, and only when
 * the build has a Clarity id.
 *
 * Nothing is loaded until the first allowed page, so a guest who opens an
 * invitation never downloads it. Once loaded, lib/clarity.ts stops it before
 * any client-side move to a page it may not see.
 */
export default function Clarity(): ReactElement | null {
  const pathname = usePathname();
  /* The path Clarity was put on, or null before it is. */
  const [installedOn, setInstalledOn] = useState<string | null>(null);
  const installed = installedOn !== null;

  useEffect(() => {
    if (!installed && clarityAllowedOn(pathname) && clarityHostAllowed()) {
      guardClarityNavigation();
      setInstalledOn(pathname);
    }
  }, [pathname, installed]);

  if (!installed) {
    return null;
  }

  return (
    /*
      On /create, the ad's landing page, once the page has loaded, so its
      scripts are not fetched beside the gallery's pictures. Elsewhere as
      soon as the page has run, as before.
    */
    <Script
      id="ms-clarity"
      strategy={
        installedOn === "/create" || installedOn?.startsWith("/create/") === true
          ? "lazyOnload"
          : "afterInteractive"
      }
    >
      {claritySnippet()}
    </Script>
  );
}
