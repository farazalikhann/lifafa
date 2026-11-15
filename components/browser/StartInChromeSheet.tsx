"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import OpenInChromePrompt from "@/components/browser/OpenInChromePrompt";
import { paperSans } from "@/components/theme/fonts";
import { clarityEvent } from "@/lib/clarity";
import { saveDraftHandoff } from "@/lib/handoff/actions";
import { HANDOFF_PARAM, pathWithHandoff } from "@/lib/handoff/link";
import { withAdParams, type InAppBrowser } from "@/lib/inAppBrowser";
import { stashOriginFromUrl } from "@/lib/pendingCard";
import { waitingCard, type WaitingCard } from "@/lib/signInCard";
import { IN_APP_TEST_PARAM, markStartSheetShown, startSheetShown } from "@/lib/startInChrome";
import { AFTER_SIGN_IN_PARAM, wizardStepId, wizardStepPath } from "@/lib/wizardSteps";

/** How long "Open in Chrome" waits for a draft to be saved for the trip before saying it could not. */
const SAVE_TIMEOUT_MS = 4000;

/** Said under the button when a draft could not be carried: it is not lost, it is here. */
const DRAFT_STAYS = "Your draft stays here if you continue in the app.";

/**
 * On the way back from sign in or from a handoff: the visitor is mid-trip and
 * has seen this choice already (or made it), so it is not asked again.
 */
function midTrip(search: string): boolean {
  const params = new URLSearchParams(search);

  return params.has(HANDOFF_PARAM) || params.has(AFTER_SIGN_IN_PARAM) || stashOriginFromUrl(search) !== null;
}

/** This page as it is, with the ad's tags, and without the test switch. */
function thisPage(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(IN_APP_TEST_PARAM);
  return withAdParams(url.href);
}

/**
 * A draft kept in this browser, saved on the server for the trip (the same
 * handoff "Save and continue" and /login use, lib/handoff/actions.ts), and the
 * link to it: /create on the step it was left on, with its id. In Chrome the
 * wizard brings it back from the server, into the account once signed in.
 * Rejects when the draft could not be saved in time.
 */
async function linkWithDraft(waiting: WaitingCard): Promise<string> {
  const timeout = new Promise<null>((resolve) => {
    window.setTimeout(() => resolve(null), SAVE_TIMEOUT_MS);
  });
  const step = wizardStepId(waiting.card.step) ?? "details";
  const saved = await Promise.race([saveDraftHandoff({ ...waiting.card, step }), timeout]);

  if (saved === null || !saved.ok) {
    throw new Error("The draft could not be saved for the trip.");
  }

  return withAdParams(new URL(pathWithHandoff(wizardStepPath(step), saved.id), window.location.origin).href);
}

/**
 * "For the smoothest experience, open in Chrome": the first thing a visitor
 * from Instagram or Facebook sees on the first page they open, once per
 * session (lib/startInChrome.ts; OpenInChromePrompt's "start" variant).
 * Three short reasons, "Open in Chrome" (on Android the Chrome intent with
 * the ad's tags; on an iPhone the steps to Safari), and "Continue here",
 * after which everything works in the app's browser as before: designing,
 * the email code at sign in, and payment. /login keeps its own prompt for
 * Google.
 *
 * A DRAFT KEPT HERE GOES ALONG. Shown whether or not a card is kept in this
 * browser; with one, "Open in Chrome" saves it for the trip first and the
 * link carries it. Should that save fail, the prompt says so and stays, and
 * a line under the button says the draft stays here in the app.
 *
 * Clarity: open_in_chrome_shown, open_in_chrome_click and continue_here_click.
 */
export default function StartInChromeSheet({
  browser,
  test,
}: {
  browser: InAppBrowser;
  /** The test switch is on: shown whatever the session's mark says. */
  test: boolean;
}): ReactElement | null {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<WaitingCard | null>(null);
  const [carryFailed, setCarryFailed] = useState(false);
  /** One save per sheet, however many times the button is tapped; a failed one is tried again. */
  const linkRef = useRef<Promise<string> | null>(null);

  useEffect(() => {
    if ((!test && startSheetShown()) || midTrip(window.location.search)) {
      return;
    }

    markStartSheetShown();

    try {
      setDraft(waitingCard());
    } catch {
      /* Storage that cannot be read: no draft to carry. */
    }

    setOpen(true);
    clarityEvent("open_in_chrome_shown");
  }, [test]);

  const getLink = useCallback((): Promise<string> => {
    if (draft === null) {
      return Promise.resolve(thisPage());
    }

    linkRef.current ??= linkWithDraft(draft).catch((error: unknown) => {
      linkRef.current = null;
      setCarryFailed(true);
      throw error;
    });

    return linkRef.current;
  }, [draft]);

  if (!open) {
    return null;
  }

  return (
    /*
      The light theme's values and faces around the sheet: the home page and
      a demo have none of their own (lifafa-paper-tokens, app/globals.css).
    */
    <div className={`lifafa-paper-tokens ${paperSans.variable}`}>
      <OpenInChromePrompt
        browser={browser}
        variant="start"
        /* With a draft, the link is the one that carries it: on an iPhone, Open in Safari and Copy link. */
        withCard={draft !== null}
        getLink={getLink}
        note={carryFailed ? DRAFT_STAYS : undefined}
        onTap={() => clarityEvent("open_in_chrome_click")}
        onStay={() => {
          clarityEvent("continue_here_click");
          markStartSheetShown();
          setOpen(false);
        }}
      />
    </div>
  );
}
