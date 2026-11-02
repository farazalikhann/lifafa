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
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (!installed && clarityAllowedOn(pathname) && clarityHostAllowed()) {
      guardClarityNavigation();
      setInstalled(true);
    }
  }, [pathname, installed]);

  if (!installed) {
    return null;
  }

  return (
    <Script id="ms-clarity" strategy="afterInteractive">
      {claritySnippet()}
    </Script>
  );
}
