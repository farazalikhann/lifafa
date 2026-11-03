"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import OpenInChromePrompt from "@/components/browser/OpenInChromePrompt";
import { HANDOFF_PARAM } from "@/components/browser/DraftHandoffRestore";
import { saveDraftHandoff } from "@/lib/handoff/actions";
import {
  inAppBrowser,
  rememberAdParams,
  withAdParams,
  type InAppBrowser,
} from "@/lib/inAppBrowser";
import { openInBrowserClick } from "@/lib/metaPixel";
import { readPendingCard } from "@/lib/pendingCard";

/**
 * On /login, for a visitor in Instagram's or Facebook's in-app browser: the
 * "Open in Chrome" prompt, at once, because Google will not sign anyone in
 * from here. Nobody else sees anything.
 *
 * Someone who pressed "Save and continue" in the wizard never lands here in
 * the app: they are sent straight to the real browser's /login. This is for
 * those who come to /login directly. Their link is this page as it is, with
 * the ad's tags. If a card happens to be waiting in this browser's storage it
 * is carried too, the same way the wizard carries it.
 *
 * "Stay here" lasts the session (sessionStorage, and this module when storage
 * is blocked).
 */

const STAYED_KEY = "lifafa.openInChrome.stayed";
/** How long the button waits for a waiting card to be saved before going without it. */
const SAVE_TIMEOUT_MS = 4000;

let stayedInMemory = false;

function hasStayed(): boolean {
  if (stayedInMemory) {
    return true;
  }

  try {
    return window.sessionStorage.getItem(STAYED_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberStayed(): void {
  stayedInMemory = true;

  try {
    window.sessionStorage.setItem(STAYED_KEY, "1");
  } catch {
    /* Private mode or blocked storage: the in-memory flag still holds. */
  }
}

/** This page's address, with a waiting card's id on it when one can be saved. */
async function linkFromHere(): Promise<string> {
  const url = new URL(window.location.href);
  url.searchParams.delete(HANDOFF_PARAM);

  const stash = readPendingCard();

  if (stash.kind === "card") {
    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), SAVE_TIMEOUT_MS);
    });

    try {
      const saved = await Promise.race([saveDraftHandoff(stash.card), timeout]);

      if (saved !== null && saved.ok) {
        url.searchParams.set(HANDOFF_PARAM, saved.id);
      }
    } catch {
      /* The link goes without the card. */
    }
  }

  return withAdParams(url.href);
}

export default function InAppLoginPrompt(): ReactElement | null {
  const [browser, setBrowser] = useState<InAppBrowser | null>(null);
  /** One save per visit, however many times the button is tapped. */
  const linkRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    const detected = inAppBrowser(navigator.userAgent);

    if (detected === null) {
      return;
    }

    rememberAdParams(window.location.search);

    if (!hasStayed()) {
      setBrowser(detected);
    }
  }, []);

  const getLink = useCallback((): Promise<string> => {
    linkRef.current ??= linkFromHere();
    return linkRef.current;
  }, []);

  if (browser === null) {
    return null;
  }

  return (
    <OpenInChromePrompt
      browser={browser}
      getLink={getLink}
      withCard={false}
      onTap={() =>
        openInBrowserClick({ platform: browser.platform, app: browser.app, step: "signin" })
      }
      onStay={() => {
        rememberStayed();
        setBrowser(null);
      }}
    />
  );
}
