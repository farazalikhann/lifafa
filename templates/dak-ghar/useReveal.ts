"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useRevealGate } from "@/hooks/useRevealGate";

/**
 * Whether a block has come on screen, once and for good: what plays each
 * page's one gentle entrance (`.reveal` in the stylesheet, a fade and a small
 * rise). One IntersectionObserver per block, disconnected the moment it
 * fires, so nothing runs while the guest scrolls afterwards.
 *
 * Held until the cover lets the card go (useRevealGate), so the first page
 * plays as the slip lifts away and not behind it. A card drawn as a still
 * (the printed copy) has everything arrived already.
 */
export function useReveal<T extends HTMLElement>(): { ref: RefObject<T | null>; shown: boolean } {
  const ref = useRef<T | null>(null);
  const still = useCardStill();
  const gateOpen = useRevealGate();
  const [shown, setShown] = useState<boolean>(still);

  useEffect(() => {
    if (shown) {
      return;
    }

    const element = ref.current;

    if (still || element === null || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    if (!gateOpen) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shown, gateOpen, still]);

  return { ref, shown };
}

/* How small the words may be set to fit their box, as a share of full size, and the step down. */
const FIT_FLOOR = 0.5;
const FIT_STEP = 0.04;

/**
 * Sets the words inside a box as large as fits, and no larger: `words` is
 * sized in `em`, stepped down from full size until it is no taller and no
 * wider than `box`. Before the first paint, and again when the box changes
 * size or the fonts arrive; never while anything moves.
 */
export function useFitInside(
  box: RefObject<HTMLElement | null>,
  words: RefObject<HTMLElement | null>,
  key: string,
): void {
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = words.current;

    if (outer === null || inner === null) {
      return;
    }

    let live = true;

    const fit = (): void => {
      if (!live) {
        return;
      }

      let scale = 1;
      inner.style.fontSize = "1em";

      while (
        scale > FIT_FLOOR &&
        (inner.scrollHeight > outer.clientHeight || inner.scrollWidth > outer.clientWidth)
      ) {
        scale = Math.max(FIT_FLOOR, scale - FIT_STEP);
        inner.style.fontSize = `${scale}em`;
      }
    };

    fit();

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    observer?.observe(outer);
    void document.fonts?.ready.then(fit);

    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [box, words, key]);
}
