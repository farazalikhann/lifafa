"use client";

import { useCallback, useRef, useState, type ReactElement } from "react";
import OpenInChromePrompt from "@/components/browser/OpenInChromePrompt";
import { saveDraftHandoff } from "@/lib/handoff/actions";
import { HANDOFF_PARAM, pathWithHandoff } from "@/lib/handoff/link";
import {
  chromeIntentUrl,
  inAppBrowser,
  safariUrl,
  withAdParams,
  type InAppBrowser,
  type InAppPlatform,
} from "@/lib/inAppBrowser";
import { clarityEvent } from "@/lib/clarity";
import { openInBrowserClick } from "@/lib/metaPixel";
import type { PendingCard } from "@/lib/pendingCard";

/**
 * "Save and continue" for a signed-out visitor in Instagram's or Facebook's
 * in-app browser, where Google will not sign anyone in.
 *
 * On the tap the card is saved on the server (lib/handoff/actions.ts), and
 * the real browser is opened at /login with its id, the return path and the
 * ad's tags. The id is on the return path too, so it comes back through
 * Google and the auth callback to /create, which saves the card from the
 * server into the new account (lib/handoff/link.ts). No browser's storage
 * has to hold the card on the way.
 *
 * - ANDROID: Chrome, through an intent link.
 * - IPHONE: Safari, through x-safari-https://.
 *
 * Both are tried straight from the tap, so the web view still counts it as
 * one: the save is a single short request, well inside the few seconds a tap
 * lasts for. When that does not work — the save takes over 4 seconds or
 * fails, or the page is still on screen a moment after (2 seconds on Android,
 * 1.5 on iPhone) — the small prompt opens with a button to do it by hand.
 *
 * NEVER WITHOUT THE CARD. The prompt's button opens the browser only with the
 * card's id: a save that failed is tried again on the tap, and if it fails
 * again the prompt says so and stays, rather than opening a sign in that
 * would bring back nothing (the card is only in this app's browser).
 */

/**
 * How long the tap waits for the card to be saved before showing the prompt
 * instead: inside the 5 seconds a tap still counts as one for opening another
 * app, and long enough for a slow mobile line.
 */
const QUICK_SAVE_MS = 4000;
/** How long one save may take before it counts as failed. */
const SLOW_SAVE_MS = 8000;
/** How long the page may stay on screen after opening the browser before it counts as failed. */
const LEAVE_WAIT_MS = { android: 2000, ios: 1500 } as const;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** The card's id once saved, or null when the save fails or is too slow. Never rejects. */
function saveCard(card: PendingCard): Promise<string | null> {
  const save = saveDraftHandoff(card).then(
    (result) => (result.ok ? result.id : null),
    () => null,
  );

  return Promise.race([save, wait(SLOW_SAVE_MS).then(() => null)]);
}

/**
 * /login on this address, with the return path, the card's id when there is
 * one, and the ad's tags. The id goes on /login and inside the return path,
 * which is what sign in hands back to /create.
 */
export function loginLink(redirectTo: string, handoffId: string | null, design?: string): string {
  const url = new URL("/login", window.location.origin);

  /* The card's design, so the sign-in page draws its picture at once (app/login/page.tsx). */
  if (design !== undefined) {
    url.searchParams.set("design", design);
  }

  if (handoffId === null) {
    url.searchParams.set("redirectTo", redirectTo);
  } else {
    url.searchParams.set("redirectTo", pathWithHandoff(redirectTo, handoffId));
    url.searchParams.set(HANDOFF_PARAM, handoffId);
  }

  return withAdParams(url.href);
}

/**
 * Whether the page goes out of sight while `ms` pass: the other browser
 * opened over it.
 */
async function leftWithin(ms: number): Promise<boolean> {
  let left = false;
  const onHide = (): void => {
    if (document.visibilityState === "hidden") {
      left = true;
    }
  };
  const onPageHide = (): void => {
    left = true;
  };

  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onPageHide);
  await wait(ms);
  document.removeEventListener("visibilitychange", onHide);
  window.removeEventListener("pagehide", onPageHide);

  return left || document.visibilityState === "hidden";
}

interface PromptState {
  browser: InAppBrowser;
  /** The link with the card's id; rejects when the card could not be saved. */
  getLink: () => Promise<string>;
}

export function useInAppHandoff(): {
  /**
   * Sends the card on to the real browser's /login, and resolves when done:
   * false at once when this is not an in-app browser (nothing is done), true
   * once the browser has opened or the prompt is showing.
   */
  leave: (card: PendingCard, redirectTo: string) => Promise<boolean>;
  /** The fallback prompt, to render somewhere on the page; null while hidden. */
  prompt: ReactElement | null;
  /** Which browser is being opened while the card saves and it opens; null otherwise. */
  opening: InAppPlatform | null;
} {
  const [state, setState] = useState<PromptState | null>(null);
  const [opening, setOpening] = useState<InAppPlatform | null>(null);
  const busy = useRef(false);

  const leave = useCallback(
    async (card: PendingCard, redirectTo: string): Promise<boolean> => {
      const browser = inAppBrowser(navigator.userAgent);

      if (browser === null) {
        return false;
      }

      if (busy.current) {
        return true;
      }

      busy.current = true;
      setState(null);
      setOpening(browser.platform);
      openInBrowserClick({ platform: browser.platform, app: browser.app, step: "save" });

      try {
        const saved = saveCard(card);
        /* The save already under way, or, when it failed, one more on the prompt's tap. */
        let carried = saved;
        const getLink = async (): Promise<string> => {
          let id = await carried;

          if (id === null) {
            carried = saveCard(card);
            id = await carried;
          }

          if (id === null) {
            throw new Error("the card could not be saved for the other browser");
          }

          return loginLink(redirectTo, id, card.config.templateId);
        };
        const quick = await Promise.race([saved, wait(QUICK_SAVE_MS).then(() => null)]);

        if (quick !== null) {
          const target = loginLink(redirectTo, quick, card.config.templateId);
          window.location.href =
            browser.platform === "android" ? chromeIntentUrl(target) : safariUrl(target);

          if (await leftWithin(LEAVE_WAIT_MS[browser.platform])) {
            return true;
          }
        }

        /* Not in Chrome or Safari by itself: the prompt asks for a tap (lib/clarity.ts). */
        clarityEvent("handoff_open_failed");
        setState({ browser, getLink });
        return true;
      } finally {
        busy.current = false;
        setOpening(null);
      }
    },
    [],
  );

  const prompt =
    state === null ? null : (
      <OpenInChromePrompt
        browser={state.browser}
        getLink={state.getLink}
        withCard
        onStay={() => setState(null)}
      />
    );

  return { leave, prompt, opening };
}
