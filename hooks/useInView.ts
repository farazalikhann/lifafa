"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

export interface UseInViewResult<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isInView: boolean;
}

const DEFAULT_OPTIONS: IntersectionObserverInit = {
  threshold: 0.25,
  rootMargin: "0px 0px -10% 0px",
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Runs before paint on the client, falls back to useEffect during SSR so React
 * does not warn. Arming the observer before paint means the element never
 * flashes in its visible state and then snaps to the hidden one.
 */
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Reveal-on-scroll observer.
 *
 * `isInView` starts as `true` so server-rendered markup — and any client that
 * never runs the effect — shows its content. Once the observer is attached the
 * element drops to its hidden state and is revealed for good the first time it
 * intersects; the observer disconnects at that point and never reverses.
 *
 * If the visitor prefers reduced motion, `isInView` stays `true` and no
 * observer is created, so callers render the final state with no transform.
 */
export function useInView<T extends HTMLElement>(
  options?: IntersectionObserverInit,
): UseInViewResult<T> {
  const ref = useRef<T | null>(null);
  const hasRevealed = useRef<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(true);

  const { threshold, rootMargin, root } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  useIsomorphicLayoutEffect(() => {
    // Already revealed: never re-arm, so the panel cannot flicker back out if
    // the effect re-runs with new options.
    if (hasRevealed.current) {
      return;
    }

    const element = ref.current;

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    if (
      prefersReducedMotion ||
      element === null ||
      typeof IntersectionObserver === "undefined"
    ) {
      hasRevealed.current = true;
      setIsInView(true);
      return;
    }

    setIsInView(false);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            hasRevealed.current = true;
            setIsInView(true);
            observer.disconnect();
            return;
          }
        }
      },
      { threshold, rootMargin, root },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, root]);

  return { ref, isInView };
}
