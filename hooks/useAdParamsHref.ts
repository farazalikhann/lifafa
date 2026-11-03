"use client";

import { useCallback, useEffect, useState } from "react";
import { withAdParamsPath } from "@/lib/inAppBrowser";

/**
 * Puts the ad's tags (fbclid and the utm ones) on links from one page of the
 * site to another, so they follow a visitor from the home page to a demo and
 * on to /create. The tags come from the page's own address, or from the ones
 * kept for the session (lib/inAppBrowser.ts).
 *
 * Returns the path unchanged until the page is up, so the server's HTML and
 * the first render agree; the links take their tags a moment later.
 */
export function useAdParamsHref(): (path: string) => string {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return useCallback((path: string) => (ready ? withAdParamsPath(path) : path), [ready]);
}
