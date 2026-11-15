"use client";

import { useEffect, useState, type ComponentType, type ReactElement } from "react";
import { inAppBrowser, type InAppBrowser } from "@/lib/inAppBrowser";

type Sheet = ComponentType<{ browser: InAppBrowser }>;

/**
 * Where /create and the demos ask a visitor in Instagram's or Facebook's
 * browser, once per session, to open the page in Chrome (Safari on an
 * iPhone) for the smoothest experience: StartInChromeSheet.tsx.
 *
 * Renders nothing anywhere else, and nothing on the server. The sheet's code
 * is fetched only inside those two apps' browsers, so every other visitor
 * downloads none of it.
 */
export default function StartInChrome(): ReactElement | null {
  const [browser, setBrowser] = useState<InAppBrowser | null>(null);
  const [Sheet, setSheet] = useState<Sheet | null>(null);

  useEffect(() => {
    const found = inAppBrowser(navigator.userAgent);

    if (found === null) {
      return;
    }

    let live = true;

    void import("@/components/browser/StartInChromeSheet").then(
      (module) => {
        if (live) {
          setBrowser(found);
          setSheet(() => module.default);
        }
      },
      /* Not fetched (a dropped line): the page works as it is, without the sheet. */
      () => undefined,
    );

    return () => {
      live = false;
    };
  }, []);

  return browser === null || Sheet === null ? null : <Sheet browser={browser} />;
}
