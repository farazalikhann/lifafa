"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";

/*
  A page this close to where it rests is resting, once the snap has had a
  moment more: the stylesheet's `.restMark`, 1.5% of the screen either side
  of the page's top edge, is cut by the line a page rests on.
*/
const REST_AFTER_MS = 140;
/* Fine steps, so the mark is noticed wherever it is on its way across that line. */
const THRESHOLDS = Array.from({ length: 101 }, (_, index) => index / 100);
/* Far enough below the screen that the foot of the root never cuts the mark. */
const BELOW_PX = 100000;

export interface RestHandlers {
  /** The page has come to rest on the screen: its walk-in has finished. */
  onRest?: () => void;
  /** It has begun to move again. */
  onLeave?: () => void;
  /** Whether it is within a screen of being seen. */
  onNear?: (near: boolean) => void;
}

/** The nearest box that scrolls, for a card drawn inside one. */
function scrollBoxOf(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);

    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
  }

  return null;
}

/**
 * Whether the page `inside` is on has come to rest, and whether it is near.
 *
 * A page is at rest when its top is where a page rests (under the host's
 * preview strip, if there is one) and has stayed there a moment: the swipe
 * and the walk into the room (the stylesheet's zoom, driven by the same
 * scroll) are over. Watched by a thin mark across the page's top edge, cut
 * by that line only while the edge is within 1.5% of the screen of it: right
 * for a page of any height, a flow page taller than the screen too, which
 * its share of the screen never showed. It is then marked `data-sm-rest`, which is what lets
 * its loops run, and `onRest` is called; as it starts to move, the mark goes
 * and `onLeave` is called.
 *
 * Watched by IntersectionObservers alone, with no scroll handler: nothing
 * here runs in a swipe's frames but the observers' own notices, and nothing
 * is read from the page's layout. The printed copy, and a card laid out as a
 * picture, are at rest from the start.
 */
export function usePageRest(inside: RefObject<HTMLElement | null>, handlers: RestHandlers): void {
  const still = useCardStill();
  const latest = useRef(handlers);
  latest.current = handlers;

  useEffect(() => {
    const page = inside.current?.closest<HTMLElement>("[data-sm-page]") ?? null;

    if (page === null) {
      return;
    }

    if (still || typeof IntersectionObserver === "undefined") {
      page.setAttribute("data-sm-rest", "");
      latest.current.onNear?.(true);
      latest.current.onRest?.();
      return;
    }

    const root = page.closest<HTMLElement>("[data-sm-root]");
    const box = root !== null && root.classList.contains(styles.boxed) ? scrollBoxOf(root) : null;
    const strip =
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--lifafa-preview-h")) || 0;
    let resting = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const settle = (now: boolean): void => {
      if (now) {
        if (resting || timer !== null) {
          return;
        }

        timer = setTimeout(() => {
          timer = null;
          resting = true;
          page.setAttribute("data-sm-rest", "");
          latest.current.onRest?.();
        }, REST_AFTER_MS);
        return;
      }

      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }

      if (resting) {
        resting = false;
        page.removeAttribute("data-sm-rest");
        latest.current.onLeave?.();
      }
    };

    /* The mark: in the root, which starts at that line and runs on far below, only in part. */
    const mark = document.createElement("div");
    mark.setAttribute("aria-hidden", "true");
    mark.className = styles.restMark;
    page.prepend(mark);

    const place = new IntersectionObserver(
      (entries) => {
        const ratio = entries[entries.length - 1].intersectionRatio;

        settle(ratio > 0 && ratio < 1);
      },
      { root: box, rootMargin: `${-strip}px 0px ${BELOW_PX}px 0px`, threshold: THRESHOLDS },
    );

    const near = new IntersectionObserver(
      (entries) => latest.current.onNear?.(entries[entries.length - 1].isIntersecting),
      { root: box, rootMargin: "100% 0px", threshold: 0 },
    );

    place.observe(mark);
    near.observe(page);

    return () => {
      place.disconnect();
      near.disconnect();
      mark.remove();

      if (timer !== null) {
        clearTimeout(timer);
      }

      page.removeAttribute("data-sm-rest");
    };
  }, [inside, still]);
}
