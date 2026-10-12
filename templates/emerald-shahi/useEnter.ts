"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useRevealGate } from "@/hooks/useRevealGate";

/**
 * Whether a block has come on screen, once and for good.
 *
 * What plays this template's entrances: a block's lines start off to one side
 * and slide in the first time any of it is on screen, and never go back. One
 * IntersectionObserver per block, disconnected the moment it fires, so nothing
 * here runs while the guest scrolls afterwards.
 *
 * Unlike the card's shared useInView, this still waits for the block under
 * reduced motion: the entrance there is a fade, which the stylesheet makes it,
 * and a fade wants a moment to start from as much as a slide does.
 *
 * Held until the cover lets the card go (useRevealGate), so the first screen
 * plays as the envelope hands over and not behind it. A card drawn as a still
 * (the printed copy, the home page's slides) has everything arrived already.
 */
export function useEnter<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  entered: boolean;
} {
  const ref = useRef<T | null>(null);
  const still = useCardStill();
  const gateOpen = useRevealGate();
  const [entered, setEntered] = useState<boolean>(still);

  useEffect(() => {
    if (entered) {
      return;
    }

    const element = ref.current;

    if (
      still ||
      element === null ||
      typeof IntersectionObserver === "undefined"
    ) {
      setEntered(true);
      return;
    }

    if (!gateOpen) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setEntered(true);
          observer.disconnect();
        }
      },
      /* A little way in from the foot of the screen, so the slide is seen and not just its end. */
      { threshold: 0, rootMargin: "0px 0px -12% 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [entered, gateOpen, still]);

  return { ref, entered };
}
