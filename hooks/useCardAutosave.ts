"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { EditorSnapshot } from "@/hooks/useCardEditor";
import { writeCardAutosave } from "@/lib/cardAutosave";
import { deepEqual } from "@/lib/deepEqual";

/** How long after the last change the card is written: about a second of quiet. */
const AUTOSAVE_DELAY_MS = 1000;

/** The card as it is kept: what the editor holds, and nothing about the page. */
function keep(card: EditorSnapshot): void {
  writeCardAutosave({
    draft: card.draft,
    config: card.config,
    coverAnimation: card.coverAnimation,
    showWeather: card.showWeather,
    weatherTheme: card.weatherTheme,
    qrCheckinEnabled: card.qrCheckinEnabled,
  });
}

/**
 * Keeps the card being made on /create in this browser (lib/cardAutosave.ts)
 * as the visitor goes: a second after they stop changing it, and at once
 * when the page is hidden or left, so a live demo opened mid-sentence, a
 * reload or a closed tab still finds everything on the way back.
 *
 * Nothing is written for a card no one has touched: until it first differs
 * from the card the page opened with, there is nothing to keep. After that
 * every change is written, a change back included.
 *
 * `stopped` is set by the save that writes the card to an account. From then
 * nothing is written, not even a change still waiting for its second, since
 * the save has just cleared what was kept.
 */
export function useCardAutosave({
  snapshot,
  start,
  enabled,
  stopped,
}: {
  snapshot: EditorSnapshot;
  start: EditorSnapshot;
  /** Only a new card on /create: a saved invitation is kept by its account. */
  enabled: boolean;
  stopped: RefObject<boolean>;
}): void {
  const latest = useRef(snapshot);
  const waiting = useRef(false);
  const written = useRef(false);

  latest.current = snapshot;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const write = (): void => {
      if (!waiting.current || stopped.current) {
        waiting.current = false;
        return;
      }

      const card = latest.current;
      waiting.current = false;
      written.current = true;
      keep(card);
    };

    const onHide = (): void => {
      if (document.visibilityState === "hidden") {
        write();
      }
    };

    window.addEventListener("pagehide", write);
    document.addEventListener("visibilitychange", onHide);

    return () => {
      window.removeEventListener("pagehide", write);
      document.removeEventListener("visibilitychange", onHide);
      /* Leaving the wizard (or this card) with a change still waiting: keep it now. */
      write();
    };
  }, [enabled, stopped]);

  useEffect(() => {
    if (!enabled || stopped.current) {
      return;
    }

    if (!written.current && deepEqual(snapshot, start)) {
      return;
    }

    waiting.current = true;

    const timer = window.setTimeout(() => {
      if (!waiting.current || stopped.current) {
        return;
      }

      const card = latest.current;
      waiting.current = false;
      written.current = true;
      keep(card);
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [snapshot, start, enabled, stopped]);
}
