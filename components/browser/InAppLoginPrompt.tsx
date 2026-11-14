"use client";

import { useCallback, useRef, type ReactElement } from "react";
import OpenInChromePrompt from "@/components/browser/OpenInChromePrompt";
import { saveDraftHandoff } from "@/lib/handoff/actions";
import { HANDOFF_PARAM, handoffFromSearch, pathWithHandoff } from "@/lib/handoff/link";
import { withAdParams, type InAppBrowser } from "@/lib/inAppBrowser";
import { openInBrowserClick } from "@/lib/metaPixel";
import { waitingCard } from "@/lib/signInCard";

/**
 * On /login, for a visitor in Instagram's or Facebook's in-app browser: the
 * "Open in Chrome" prompt, when they press "Open in Chrome for Google" (or
 * Safari). Google will not sign anyone in from here, so that button comes
 * second, after the email code, which works anywhere (SignInForm).
 *
 * Someone who pressed "Save and continue" in the wizard never lands here in
 * the app: they are sent straight to the real browser's /login. This is for
 * those who come to /login directly. Their link is this page as it is, with
 * the ad's tags. If a card happens to be waiting in this browser's storage it
 * is carried too, the same way the wizard carries it: the newest one, stashed
 * by "Save and continue" or kept as it was typed.
 */

/** How long the button waits for a waiting card to be saved before going without it. */
const SAVE_TIMEOUT_MS = 4000;

/**
 * This page's address, with a waiting card's id on it when one can be saved.
 * An id this page already carries is kept as it is: that card is on the
 * server already. A new id goes on the page and inside its return path, so
 * it comes back to /create after sign in (lib/handoff/link.ts).
 */
async function linkFromHere(): Promise<string> {
  const url = new URL(window.location.href);
  const carried = handoffFromSearch(url.search);

  if (carried !== null) {
    const redirectTo = url.searchParams.get("redirectTo");

    if (redirectTo !== null) {
      url.searchParams.set("redirectTo", pathWithHandoff(redirectTo, carried));
    }

    return withAdParams(url.href);
  }

  url.searchParams.delete(HANDOFF_PARAM);

  /* The newest card unsaved here: the sign-in stash, or the one kept as it was typed (lib/signInCard.ts). */
  const waiting = waitingCard();

  if (waiting !== null) {
    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), SAVE_TIMEOUT_MS);
    });

    try {
      const saved = await Promise.race([
        saveDraftHandoff({ ...waiting.card, step: waiting.card.step ?? "details" }),
        timeout,
      ]);

      if (saved !== null && saved.ok) {
        url.searchParams.set(HANDOFF_PARAM, saved.id);
        url.searchParams.set(
          "redirectTo",
          pathWithHandoff(url.searchParams.get("redirectTo") ?? "/create", saved.id),
        );
      }
    } catch {
      /* The link goes without the card. */
    }
  }

  return withAdParams(url.href);
}

export default function InAppLoginPrompt({
  browser,
  onClose,
}: {
  browser: InAppBrowser;
  /** "Stay here": back to the page, where the email code still works. */
  onClose: () => void;
}): ReactElement {
  /** One save per visit, however many times the button is tapped. */
  const linkRef = useRef<Promise<string> | null>(null);

  const getLink = useCallback((): Promise<string> => {
    linkRef.current ??= linkFromHere();
    return linkRef.current;
  }, []);

  return (
    <OpenInChromePrompt
      browser={browser}
      getLink={getLink}
      withCard={false}
      onTap={() =>
        openInBrowserClick({ platform: browser.platform, app: browser.app, step: "signin" })
      }
      onStay={onClose}
    />
  );
}
