"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Keeps a passage of text to a number of lines by setting it smaller.
 *
 * For the sacred line on a card's opening screen: a shlok, a dua, a verse or
 * a shabad, which is as long as it is and cannot be cut. Where it would run
 * past `maxLines` at its own size it is stepped down half a pixel at a time
 * until it fits, and never under `floorPx`; a passage still too long there is
 * left at the floor, whole.
 *
 * `holder` is the box the passage is laid out in, and the passage is its
 * first child. The size is written on that child directly and not through
 * state, so it is in place before the first paint and costs no render. React
 * leaves it alone: font-size is not among the styles the card sets there.
 *
 * Fitted again when the box's width changes, when the faces arrive (a
 * fallback face is not the width of the real one), and when `key` does,
 * which is the text and anything else that changes how it is set. What it
 * came to is left on the holder as data-lines and data-size, for checking.
 */
export function useFitLines(
  holder: RefObject<HTMLElement | null>,
  key: string,
  maxLines: number,
  floorPx: number,
): void {
  useLayoutEffect(() => {
    const box = holder.current;
    const passage = box?.firstElementChild;

    if (box === null || box === undefined || !(passage instanceof HTMLElement)) {
      return;
    }

    let live = true;
    let width = box.clientWidth;

    const fit = (): void => {
      if (!live) {
        return;
      }

      /* From its own size every time: a wider box may have room for it again. */
      passage.style.fontSize = "";
      let size = parseFloat(getComputedStyle(passage).fontSize);
      let lines = countLines(passage);

      while (lines > maxLines && size > floorPx) {
        size = Math.max(floorPx, size - 0.5);
        passage.style.fontSize = `${size}px`;
        lines = countLines(passage);
      }

      box.dataset.lines = String(lines);
      box.dataset.size = String(size);
    };

    fit();

    /* The fit changes the box's height and never its width, so only a new width is a reason to fit again. */
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            if (box.clientWidth !== width) {
              width = box.clientWidth;
              fit();
            }
          })
        : null;
    observer?.observe(box);

    void document.fonts?.ready.then(fit);

    return () => {
      live = false;
      observer?.disconnect();
      passage.style.fontSize = "";
    };
  }, [holder, key, maxLines, floorPx]);
}

/**
 * How many lines an element's text is set in: the rows its fragments fall in.
 * Counted from the boxes and not from height over leading, because a script
 * face brings its own leading and a line with a tall mark is not a line more.
 */
function countLines(element: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(element);

  const rects = [...range.getClientRects()]
    .filter((rect) => rect.width > 0 && rect.height > 0)
    .sort((a, b) => a.top - b.top);

  let lines = 0;
  let last = Number.NEGATIVE_INFINITY;

  for (const rect of rects) {
    if (rect.top - last > rect.height / 2) {
      lines += 1;
      last = rect.top;
    }
  }

  return lines;
}
