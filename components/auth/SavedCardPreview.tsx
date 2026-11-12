"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactElement } from "react";
import { loginCardFor, type LoginCardRead } from "@/lib/handoff/loginCard";
import { rememberHandoff } from "@/lib/handoff/seen";
import { readPendingCard } from "@/lib/pendingCard";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** When to ask again for a handed-over card the server could not read in time. */
const UNKNOWN_RETRIES_MS = [1500, 3000] as const;

/**
 * The top of the sign-in page when it was opened for a card: the visitor's
 * own card, small and still, "Your card is saved" and why to sign in. Or,
 * when the card cannot be found, a friendly line.
 *
 * WHERE THE CARD COMES FROM (app/login/page.tsx decides which):
 * - "handoff": a card handed over from Instagram's or Facebook's browser. Read
 *   from the server once the page is up (lib/handoff/loginCard.ts): saved and
 *   drawn, already in an account, or not found (the friendly line).
 * - "local": a card stashed in this browser before sign in (lib/pendingCard.ts),
 *   read here once the page is up. The friendly line until it is found.
 *
 * NOTHING MOVES. The page is sent without waiting for either answer, so the
 * box and the words keep their room whatever the answer is. In the box, the
 * design's gallery picture is there from the first paint (inline and tiny,
 * blurred: it shows the gallery's sample names), and the card itself covers
 * it once its code has come, fetched when the page is idle so the buttons
 * below are ready first.
 */

export type SavedCardStatus = "handoff" | "local";

export interface LoginCard {
  draft: EventDraft;
  config: CardConfig;
}

/*
  The still card's size here: a third of the screen's height, at most 300px,
  in the card's own proportions (390 by 720). Set in CSS, so the server draws
  the box at its size; the card inside is scaled to the height it measures.
*/
const BOX = "h-[min(300px,34svh)] aspect-[390/720]";

type StillModule = ComponentType<{ draft: EventDraft; config: CardConfig; height: number }>;

function useStillModule(wanted: boolean): StillModule | null {
  const [Still, setStill] = useState<StillModule | null>(null);

  useEffect(() => {
    if (!wanted) {
      return;
    }

    /*
      Not before the page has loaded, then when the browser is idle: the
      card's code and pictures are the heaviest thing here, and on a slow line
      they must not hold up the page's own first picture and buttons.
    */
    let live = true;
    let handle: number | null = null;
    const idle = typeof window.requestIdleCallback === "function";
    const load = (): void => {
      void import("@/components/auth/SavedCardStill").then(
        (module) => live && setStill(() => module.default),
        () => undefined,
      );
    };
    const whenIdle = (): void => {
      handle = idle ? window.requestIdleCallback(load, { timeout: 3000 }) : window.setTimeout(load, 300);
    };

    if (document.readyState === "complete") {
      whenIdle();
    } else {
      window.addEventListener("load", whenIdle, { once: true });
    }

    return () => {
      live = false;
      window.removeEventListener("load", whenIdle);

      if (handle !== null) {
        if (idle) {
          window.cancelIdleCallback(handle);
        } else {
          window.clearTimeout(handle);
        }
      }
    };
  }, [wanted]);

  return Still;
}

export default function SavedCardPreview({
  status,
  handoff,
  placeholder,
  onShown,
}: {
  status: SavedCardStatus;
  /** The handed-over card's id ("handoff"). */
  handoff: string | null;
  /** The chosen design's gallery picture, a tiny inline image (lib/loginPlaceholders.ts), or null. */
  placeholder: string | null;
  /** Told once what the page ended up saying: a card shown, saved without one, or the friendly line. */
  onShown?: (shown: "card" | "saved" | "friendly") => void;
}): ReactElement {
  /* What was found: undefined until the answer, then the card, "saved" without one, or null. */
  const [found, setFound] = useState<LoginCard | "saved" | null | undefined>(undefined);

  useEffect(() => {
    if (status === "local") {
      const read = readPendingCard();
      setFound(read.kind === "card" ? { draft: read.card.draft, config: read.card.config } : null);
      return;
    }

    if (handoff === null) {
      setFound(null);
      return;
    }

    let live = true;
    let tries = 0;
    let retry = 0;
    const ask = (): void => {
      void loginCardFor(handoff).then(settle, () => settle({ status: "unknown" }));
    };
    const settle = (read: LoginCardRead): void => {
      if (!live) {
        return;
      }

      /*
        The server could not say in time (a slow read, a slow phone line):
        asked again, a little later each time, while the page stays usable
        with its friendly words. The card is shown whenever it arrives.
      */
      if (read.status === "unknown" && tries < UNKNOWN_RETRIES_MS.length) {
        retry = window.setTimeout(ask, UNKNOWN_RETRIES_MS[tries]);
        tries += 1;
        return;
      }

      /* Kept in this browser, so leaving here without signing in does not lose it (lib/handoff/seen.ts). */
      if (read.status === "saved") {
        rememberHandoff(handoff);
      }

      setFound(
        read.status === "saved"
          ? { draft: read.draft, config: read.config }
          : read.status === "adopted"
            ? "saved"
            : null,
      );
    };
    ask();

    return () => {
      live = false;
      window.clearTimeout(retry);
    };
  }, [status, handoff]);

  const card = typeof found === "object" && found !== null ? found : null;
  /*
    A handed-over card is said to be saved from the start: it was saved a
    moment ago, and the answer only rarely says otherwise. A card stashed in
    this browser waits for it, so words never claim a card that is not there
    on the page Lighthouse and a stranger's link would see.
  */
  const friendly = status === "local" ? found === undefined || found === null : found === null;
  const Still = useStillModule(card !== null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState(0);

  useEffect(() => {
    if (Still !== null && boxRef.current !== null) {
      setBoxHeight(boxRef.current.clientHeight);
    }
  }, [Still]);

  const shown = friendly ? "friendly" : card !== null ? "card" : "saved";

  /* Once per answer: held in a ref, so a new callback each render does not tell it again. */
  const onShownRef = useRef(onShown);
  onShownRef.current = onShown;

  useEffect(() => {
    if (found !== undefined) {
      onShownRef.current?.(shown);
    }
  }, [found, shown]);

  const names = card === null ? "" : cardNames(card.draft);

  return (
    <div className="flex flex-col items-center text-center">
      <div
        ref={boxRef}
        data-login-card=""
        className={`relative mb-5 ${BOX} shrink-0 overflow-hidden rounded-[1.125rem] border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] shadow-[0_20px_40px_-24px_rgba(30,27,24,0.5)]`}
      >
        {placeholder !== null ? (
          // eslint-disable-next-line @next/next/no-img-element -- inline and tiny: next/image would add a request.
          <img
            src={placeholder}
            alt=""
            aria-hidden="true"
            decoding="sync"
            className="absolute inset-0 size-full scale-105 object-cover blur-[2px]"
          />
        ) : null}
        {card !== null && Still !== null && boxHeight > 0 ? (
          <Still draft={card.draft} config={card.config} height={boxHeight} />
        ) : null}
        {names !== "" ? <span className="sr-only">{`Your card: ${names}`}</span> : null}
      </div>

      <h1 className="flex min-h-[4.025rem] items-center justify-center font-[family-name:var(--font-display)] text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]">
        {/* Short, one line: the words below, in the body font, are what a slow line shows first. */}
        {friendly ? "Welcome back" : "Your card is saved"}
      </h1>
      <p className="mt-2.5 min-h-[2.85rem] text-sm leading-relaxed text-pretty text-[var(--lifafa-muted)]">
        {friendly
          ? "Sign in to continue with your card. You will be taken straight back to it."
          : "Sign in once to keep it safe, get your link and see who is coming."}
      </p>
    </div>
  );
}

/** "Aarav and Meera", for a screen reader: what the picture shows. */
function cardNames(draft: EventDraft): string {
  const own = draft.hostNames.trim();

  if (own.length > 0) {
    return own;
  }

  return [draft.partyOneName.trim(), draft.partyTwoName.trim()].filter(Boolean).join(" and ");
}
