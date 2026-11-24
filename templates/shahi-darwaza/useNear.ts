"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useCardStill } from "@/hooks/useCardStill";

/**
 * Whether a block is within a screen of being seen, once and for good.
 *
 * For a picture drawn in CSS (a border-image, a background), which the
 * browser fetches as soon as its rule applies, however far down the page
 * the block is: the rule is only applied once this is true, so the picture
 * is asked for a screen ahead of the guest and not with the page. An <img>
 * needs none of this; it is given loading="lazy".
 *
 * One IntersectionObserver per block, gone the moment it fires. A card drawn
 * as a still (the printed copy) has everything near.
 */
export function useNear<T extends HTMLElement>(): {
  ref: RefObject<T | null>;
  near: boolean;
} {
  const ref = useRef<T | null>(null);
  const still = useCardStill();
  const [near, setNear] = useState<boolean>(still);

  useEffect(() => {
    if (near) {
      return;
    }

    const element = ref.current;

    if (still || element === null || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100% 0px 100% 0px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [near, still]);

  return { ref, near };
}
