"use client";

import { useLayoutEffect, type RefObject } from "react";

/* How small the words may be set to fit their box, as a share of their full size, and the step down. */
const FIT_FLOOR = 0.5;
const FIT_STEP = 0.04;

/**
 * Sets the words in `box` as large as fits, and no larger: the names in the
 * cameo's oval, and on the letter.
 *
 * Every size in the words is in `em`, so one font size on `words` scales the
 * lot: stepped down from full size until they are no taller and no wider than
 * the box, which keeps a long pair of names, or the taller lines of
 * Devanagari, inside it. Before the first paint, and
 * again when the box changes size or the fonts arrive; never while anything
 * moves.
 */
/**
 * The step-down itself, once: for a caller that sizes something else first (the couple's tags).
 *
 * `layoutHeight`: measure the words by their own height, not by what they
 * reach. For words that fade up into place: while they are still moving, a
 * line drawn lower than where it will settle counts as overflow, and the
 * words would be set a size or two smaller than the box needs. Only for words
 * whose box is as tall as its lines (not a box of a fixed height).
 */
export function fitInside(
  outer: HTMLElement,
  inner: HTMLElement,
  layoutHeight = false,
): void {
  let scale = 1;
  inner.style.fontSize = "1em";

  const tall = (): number =>
    layoutHeight ? inner.offsetHeight : inner.scrollHeight;

  while (
    scale > FIT_FLOOR &&
    (tall() > outer.clientHeight || inner.scrollWidth > outer.clientWidth)
  ) {
    scale = Math.max(FIT_FLOOR, scale - FIT_STEP);
    inner.style.fontSize = `${scale}em`;
  }
}

export function useFitInside(
  box: RefObject<HTMLElement | null>,
  words: RefObject<HTMLElement | null>,
  key: string,
  /** See fitInside. */
  layoutHeight = false,
): void {
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = words.current;

    if (outer === null || inner === null) {
      return;
    }

    let live = true;

    const fit = (): void => {
      if (live) {
        fitInside(outer, inner, layoutHeight);
      }
    };

    fit();

    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    observer?.observe(outer);
    void document.fonts?.ready.then(fit);

    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [box, words, key, layoutHeight]);
}
