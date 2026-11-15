"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactElement } from "react";
import { usePathname } from "next/navigation";
import type { InAppBrowser } from "@/lib/inAppBrowser";
import {
  inAppTest,
  startSheetAllowedOn,
  startSheetBrowser,
  startSheetShown,
} from "@/lib/startInChrome";

type Sheet = ComponentType<{ browser: InAppBrowser; test: boolean }>;

/**
 * The "open in Chrome" sheet's gate, in the root layout (app/layout.tsx), so
 * it is on the first page a visitor from Instagram or Facebook opens,
 * whatever that page is: the bio link opens the home page. Which pages, and
 * once per session: lib/startInChrome.ts. The sheet: StartInChromeSheet.tsx.
 *
 * Asked again on every move to a new page, until the sheet has come up once:
 * a visit that starts on a page it never shows on (a guest's invitation)
 * meets it on the first one it may.
 *
 * Renders nothing anywhere else, and nothing on the server: the user agent is
 * read in an effect, after hydration. The sheet's code is fetched only inside
 * those two apps' browsers (or under the test switch), so every other visitor
 * downloads none of it.
 */
export default function StartInChrome(): ReactElement | null {
  const pathname = usePathname();
  const [found, setFound] = useState<{ browser: InAppBrowser; test: boolean; Sheet: Sheet } | null>(null);
  /** The sheet has been asked for: nothing more to decide for this page's life. */
  const asked = useRef(false);

  useEffect(() => {
    if (asked.current) {
      return;
    }

    const search = window.location.search;
    const browser = startSheetBrowser(navigator.userAgent, search);
    const test = inAppTest(search);

    if (browser === null || !startSheetAllowedOn(window.location.pathname, search) || (!test && startSheetShown())) {
      return;
    }

    asked.current = true;
    let live = true;

    void import("@/components/browser/StartInChromeSheet").then(
      (module) => {
        if (live) {
          setFound({ browser, test, Sheet: module.default });
        }
      },
      /* Not fetched (a dropped line): the page works as it is; the next page asks again. */
      () => {
        asked.current = false;
      },
    );

    return () => {
      live = false;
      asked.current = false;
    };
  }, [pathname]);

  if (found === null) {
    return null;
  }

  const { Sheet, browser, test } = found;
  return <Sheet browser={browser} test={test} />;
}
