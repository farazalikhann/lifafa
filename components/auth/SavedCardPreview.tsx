"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactElement } from "react";
import { readPendingCard } from "@/lib/pendingCard";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The top of the sign-in page when it was opened for a card: the visitor's
 * own card, small and still, "Your card is saved" and why to sign in. Or,
 * when the card cannot be found, a friendly line and no picture.
 *
 * WHERE THE CARD COMES FROM (app/login/page.tsx decides):
 * - "saved": a card handed over from Instagram's or Facebook's browser, read
 *   on the server from the handoff (lib/handoff/peek.ts) and passed in.
 * - "adopted": that card is already in an account. Saved, nothing to draw.
 * - "local": a card stashed in this browser before sign in (lib/pendingCard.ts),
 *   read here after the page has loaded. Drawn as saved until that read says
 *   otherwise, which is rare: this browser stashed it a moment ago.
 * - "missing" or "unknown": not found, or storage did not answer in time.
 *
 * The picture's code (components/auth/SavedCardStill.tsx) is fetched once the
 * page is idle, into a box already its size: the buttons below are ready
 * first and nothing moves when the card arrives.
 */

export type SavedCardStatus = "saved" | "adopted" | "local" | "missing" | "unknown";

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

    let live = true;
    const load = (): void => {
      void import("@/components/auth/SavedCardStill").then(
        (module) => live && setStill(() => module.default),
        () => undefined,
      );
    };
    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle ? window.requestIdleCallback(load, { timeout: 1500 }) : window.setTimeout(load, 300);

    return () => {
      live = false;

      if (idle) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, [wanted]);

  return Still;
}

export default function SavedCardPreview({
  status,
  card,
  onShown,
}: {
  status: SavedCardStatus;
  /** The card, when the server read it ("saved"). */
  card: LoginCard | null;
  /** Told once what the page ended up saying: a card shown, or the friendly line. */
  onShown?: (shown: "card" | "saved" | "friendly") => void;
}): ReactElement {
  /* "local": the stash, once read. Undefined until then, null when there is none. */
  const [local, setLocal] = useState<LoginCard | null | undefined>(undefined);

  useEffect(() => {
    if (status !== "local") {
      return;
    }

    const read = readPendingCard();
    setLocal(read.kind === "card" ? { draft: read.card.draft, config: read.card.config } : null);
  }, [status]);

  const shownCard = status === "saved" ? card : status === "local" ? (local ?? null) : null;
  const friendly = status === "missing" || status === "unknown" || (status === "local" && local === null);
  /* The box is kept while the stash is being read, so the page does not jump when it is there. */
  const withBox = shownCard !== null || (status === "local" && local === undefined);
  const Still = useStillModule(shownCard !== null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState(0);

  useEffect(() => {
    if (Still !== null && boxRef.current !== null) {
      setBoxHeight(boxRef.current.clientHeight);
    }
  }, [Still]);

  const settled = status !== "local" || local !== undefined;
  const shown = friendly ? "friendly" : shownCard !== null ? "card" : "saved";

  /* Once per answer: held in a ref, so a new callback each render does not tell it again. */
  const onShownRef = useRef(onShown);
  onShownRef.current = onShown;

  useEffect(() => {
    if (settled) {
      onShownRef.current?.(shown);
    }
  }, [settled, shown]);

  const names = shownCard === null ? "" : cardNames(shownCard.draft);

  return (
    <div className="flex flex-col items-center text-center">
      {withBox ? (
        <div
          ref={boxRef}
          data-login-card=""
          className={`relative mb-5 ${BOX} shrink-0 overflow-hidden rounded-[1.125rem] border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] shadow-[0_20px_40px_-24px_rgba(30,27,24,0.5)]`}
        >
          {shownCard !== null && Still !== null && boxHeight > 0 ? (
            <Still draft={shownCard.draft} config={shownCard.config} height={boxHeight} />
          ) : null}
          {names !== "" ? <span className="sr-only">{`Your card: ${names}`}</span> : null}
        </div>
      ) : null}

      <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]">
        {friendly ? "Sign in to continue with your card" : "Your card is saved"}
      </h1>
      <p className="mt-2.5 text-sm leading-relaxed text-pretty text-[var(--lifafa-muted)]">
        {friendly
          ? "Sign in, and you will be taken back to your card."
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
