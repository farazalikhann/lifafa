"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseOnScreenResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isOnScreen: boolean;
}

/**
 * Live "is at least `share` of this element on screen" flag.
 *
 * Neither useInView, which latches the first time it reveals, nor
 * useNearViewport, which answers for half a screen either side: this one
 * answers for the element itself, both ways, for as long as it is mounted.
 * The card uses it to hold the scatter back while its opening screen is the
 * one being read.
 *
 * `enabled` false answers false and observes nothing, so a caller whose
 * element may not exist does not have to guess. While enabled it starts true,
 * because the elements it is for are first on the card: the server's answer
 * and the first frame's should be the state the guest sees on arrival.
 */
export function useOnScreen<T extends HTMLElement>(
  share: number,
  enabled: boolean,
): UseOnScreenResult<T> {
  const ref = useRef<T | null>(null);
  const [isOnScreen, setIsOnScreen] = useState<boolean>(true);

  useEffect(() => {
    const element = ref.current;

    if (!enabled || element === null || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsOnScreen(entry.intersectionRatio >= share);
        }
      },
      { threshold: [0, share, 1] },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [share, enabled]);

  return { ref, isOnScreen: enabled && isOnScreen };
}
