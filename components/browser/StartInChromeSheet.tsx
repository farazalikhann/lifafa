"use client";

import { useEffect, useState, type ReactElement } from "react";
import OpenInChromePrompt from "@/components/browser/OpenInChromePrompt";
import { paperSans } from "@/components/theme/fonts";
import { readCardAutosave } from "@/lib/cardAutosave";
import { clarityEvent } from "@/lib/clarity";
import { HANDOFF_PARAM } from "@/lib/handoff/link";
import { withAdParams, type InAppBrowser } from "@/lib/inAppBrowser";
import { readPendingCard, stashOriginFromUrl } from "@/lib/pendingCard";
import { AFTER_SIGN_IN_PARAM } from "@/lib/wizardSteps";

/** Set for the session once the sheet has been shown, so it is shown once. */
const SHOWN_KEY = "lifafa.inApp.startSheetShown";
/** The same, where the browser keeps no session storage. */
let shownInMemory = false;

function alreadyShown(): boolean {
  if (shownInMemory) {
    return true;
  }

  try {
    return window.sessionStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

function markShown(): void {
  shownInMemory = true;

  try {
    window.sessionStorage.setItem(SHOWN_KEY, "1");
  } catch {
    /* Private mode or blocked storage: the in-memory mark still holds for this page. */
  }
}

/**
 * Whether this is the start of a visit, where moving to the real browser
 * loses nothing. Not on the way back from sign in or from a handoff, not on a
 * saved card's payment screen, and not while a card is kept in this browser:
 * that card would not come along, so the host stays with it here.
 */
function atTheStart(): boolean {
  const params = new URLSearchParams(window.location.search);

  if (
    params.has(HANDOFF_PARAM) ||
    params.has(AFTER_SIGN_IN_PARAM) ||
    params.has("event") ||
    stashOriginFromUrl(window.location.search) !== null
  ) {
    return false;
  }

  try {
    return readPendingCard().kind !== "card" && readCardAutosave() === null;
  } catch {
    return false;
  }
}

/**
 * "For the smoothest experience, open in Chrome": the first thing a visitor
 * from Instagram or Facebook sees on /create or a demo, once per session
 * (OpenInChromePrompt's "start" variant). Three short reasons, "Open in
 * Chrome" (on Android the Chrome intent for this page with the ad's tags; on
 * an iPhone the steps to Safari), and "Continue here", after which everything
 * works in the app's browser as before: designing, the email code at sign
 * in, and payment. /login keeps its own prompt for Google.
 *
 * Clarity: open_in_chrome_shown, open_in_chrome_click and continue_here_click.
 */
export default function StartInChromeSheet({ browser }: { browser: InAppBrowser }): ReactElement | null {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (alreadyShown() || !atTheStart()) {
      return;
    }

    markShown();
    setOpen(true);
    clarityEvent("open_in_chrome_shown");
  }, []);

  if (!open) {
    return null;
  }

  return (
    /*
      The light theme's values and faces around the sheet: a demo is not a
      host page and has none of its own (lifafa-paper-tokens, app/globals.css).
    */
    <div className={`lifafa-paper-tokens ${paperSans.variable}`}>
    <OpenInChromePrompt
      browser={browser}
      variant="start"
      withCard={false}
      /* This page as it is, with the ad's fbclid and utm tags, so the visit still counts for the ad. */
      getLink={() => Promise.resolve(withAdParams(window.location.href))}
      onTap={() => clarityEvent("open_in_chrome_click")}
      onStay={() => {
        clarityEvent("continue_here_click");
        setOpen(false);
      }}
    />
    </div>
  );
}
