"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

export interface UseNearViewportResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isNear: boolean;
}

/*
  Half a viewport of slack on either side. Wide enough that a looping animation
  is already running by the time its panel is scrolled to, narrow enough that
  only the neighbours of the current panel are ever awake.
*/
const NEAR_OPTIONS: IntersectionObserverInit = {
  threshold: 0,
  rootMargin: "50% 0px 50% 0px",
};

/**
 * Live "is this element anywhere near the viewport" flag.
 *
 * Unlike useInView — which latches the first time it reveals and never looks
 * back — this one keeps reporting, so a caller can park expensive work while
 * the element is far off screen and let it run again when it returns. The
 * landing story uses it to hold its idle loops: five line drawings stepping
 * dash offsets and opacities off screen is main-thread work nobody ever sees,
 * and on a phone it lands as stutter in the scroll.
 *
 * Starts `true` so server-rendered markup — and any client that never runs the
 * effect — is never left parked. The observer answers on the first frame.
 */
export function useNearViewport<
  T extends HTMLElement,
>(): UseNearViewportResult<T> {
  const ref = useRef<T | null>(null);
  const [isNear, setIsNear] = useState<boolean>(true);

  useEffect(() => {
    const element = ref.current;

    if (element === null || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        setIsNear(entry.isIntersecting);
      }
    }, NEAR_OPTIONS);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, isNear };
}
