"use client";

import { useEffect } from "react";
import { inAppBrowser, rememberAdParams } from "@/lib/inAppBrowser";

/**
 * Keeps the ad's fbclid and utm tags for the session, in Instagram's and
 * Facebook's in-app browsers only, so the link that later opens the real
 * browser can carry them (lib/inAppBrowser.ts). Renders nothing, and does
 * nothing in any other browser.
 */
export default function RememberAdParams(): null {
  useEffect(() => {
    if (inAppBrowser(navigator.userAgent) !== null) {
      rememberAdParams(window.location.search);
    }
  }, []);

  return null;
}
