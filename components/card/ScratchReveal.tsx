"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { ScratchTarget } from "@/types/card";

/** The three things a panel can hide. "none" is never revealed, so never stored. */
export type RevealTarget = Exclude<ScratchTarget, "none">;

/**
 * How a target came to be revealed.
 *
 *   live      Scratched, or its reveal button pressed, on this page just now.
 *             Every panel still covering the same thing fades away.
 *   restored  Revealed earlier in this browser session and read back from
 *             storage on mount. The panels go at once, with no fade, because
 *             the guest has already seen what is under them.
 */
export type RevealKind = "live" | "restored";

interface ScratchRevealValue {
  revealed: Readonly<Partial<Record<RevealTarget, RevealKind>>>;
  reveal: (target: RevealTarget) => void;
  /** What this card hides behind a panel a guest can scratch, or "none". */
  concealed: ScratchTarget;
}

/*
  The default is a card with no provider: nothing is shared and nothing is
  remembered, and each panel behaves exactly as it did on its own.
*/
const ScratchRevealContext = createContext<ScratchRevealValue>({
  revealed: {},
  reveal: () => {},
  concealed: "none",
});

function storageKey(key: string): string {
  return `lifafa:scratch-revealed:${key}`;
}

const TARGETS: readonly RevealTarget[] = ["date", "venue", "countdown"];

/**
 * One reveal state for the whole card.
 *
 * A card can hide the same thing in two places: the date behind its panel in
 * the date section, and again on the calendar page under the countdown. They
 * are one secret, so they open together. Whichever the guest scratches, both
 * go, and a guest who reloads the page in the same session is not asked to
 * scratch it again.
 *
 * `persistKey` is the invitation's code, or null in the editor's previews,
 * where there is no invitation yet and a reveal is not worth remembering.
 */
export function ScratchRevealProvider({
  persistKey,
  concealed,
  children,
}: {
  persistKey: string | null;
  /**
   * What the card hides behind a panel a guest can actually scratch: the
   * host's target when its section is on the card and the guest is not the
   * host previewing. Anything that repeats that thing elsewhere on the card
   * asks useStillHidden before showing it.
   */
  concealed: ScratchTarget;
  children: ReactNode;
}): ReactElement {
  const [revealed, setRevealed] = useState<
    Partial<Record<RevealTarget, RevealKind>>
  >({});

  /*
    Read after mount, never during render: the server has no session storage,
    and a panel that was missing from the HTML but present once hydrated would
    be a mismatch. The panels paint covered on the first frame and go on the
    next, which is the same frame the canvas is first painted in anyway.
  */
  useEffect(() => {
    if (persistKey === null) {
      return;
    }

    try {
      const stored: unknown = JSON.parse(
        window.sessionStorage.getItem(storageKey(persistKey)) ?? "[]",
      );

      if (!Array.isArray(stored)) {
        return;
      }

      const restored: Partial<Record<RevealTarget, RevealKind>> = {};

      for (const target of TARGETS) {
        if (stored.includes(target)) {
          restored[target] = "restored";
        }
      }

      setRevealed((current) => ({ ...restored, ...current }));
    } catch {
      /* Storage blocked or garbled: every panel simply starts covered. */
    }
  }, [persistKey]);

  const reveal = useCallback(
    (target: RevealTarget): void => {
      setRevealed((current) =>
        current[target] === undefined ? { ...current, [target]: "live" } : current,
      );

      if (persistKey === null) {
        return;
      }

      try {
        const key = storageKey(persistKey);
        const stored: unknown = JSON.parse(
          window.sessionStorage.getItem(key) ?? "[]",
        );
        const list = Array.isArray(stored) ? stored : [];

        if (!list.includes(target)) {
          window.sessionStorage.setItem(key, JSON.stringify([...list, target]));
        }
      } catch {
        /* Remembered for this page only. */
      }
    },
    [persistKey],
  );

  const value = useMemo(
    () => ({ revealed, reveal, concealed }),
    [revealed, reveal, concealed],
  );

  return (
    <ScratchRevealContext.Provider value={value}>
      {children}
    </ScratchRevealContext.Provider>
  );
}

/**
 * Whether `target` has been revealed anywhere on the card, and how to reveal
 * it. A panel with no target (undefined) is on its own: never revealed from
 * outside, and revealing it tells nobody.
 */
export function useScratchReveal(target: RevealTarget | undefined): {
  revealed: RevealKind | null;
  reveal: () => void;
} {
  const { revealed, reveal } = useContext(ScratchRevealContext);

  const revealThis = useCallback((): void => {
    if (target !== undefined) {
      reveal(target);
    }
  }, [reveal, target]);

  return {
    revealed: target === undefined ? null : (revealed[target] ?? null),
    reveal: revealThis,
  };
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Whether `target` is still behind a panel on this card: concealed, not yet
 * revealed anywhere, and not a guest with reduced motion, for whom
 * ScratchPanel draws no panel at all.
 *
 * For the places that repeat what a panel hides without being a panel
 * themselves — the timeline's own line for the main event — so they hold it
 * back until the panel opens rather than printing it one screen further down.
 */
export function useStillHidden(target: RevealTarget): boolean {
  const { revealed, concealed } = useContext(ScratchRevealContext);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  return concealed === target && revealed[target] === undefined && !reducedMotion;
}
