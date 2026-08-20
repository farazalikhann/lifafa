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
 * `isInView` starts as `initialInView` so server-rendered markup — and any
 * client that never runs the effect — has a sensible answer. Once the observer
 * is attached the element drops to its hidden state and is revealed for good
 * the first time it intersects; the observer disconnects at that point and
 * never reverses.
 *
 * If the visitor prefers reduced motion, `isInView` is set to `true` and no
 * observer is created, so callers render the final state with no transform.
 *
 * `initialInView` defaults to `true`, which is what a reveal wants: content
 * that never runs JavaScript must still be readable. A caller asking the
 * opposite question — "has the guest scrolled as far as this marker yet?" —
 * passes `false`, because the honest answer before the observer exists is no,
 * and shipping `true` would mean the server rendered the after state of
 * something the guest has not done.
 */
export function useInView<T extends HTMLElement>(
  options?: IntersectionObserverInit,
  initialInView: boolean = true,
): UseInViewResult<T> {
  const ref = useRef<T | null>(null);
  const hasRevealed = useRef<boolean>(false);
  const [isInView, setIsInView] = useState<boolean>(initialInView);

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
