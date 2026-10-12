"use client";

import { useLayoutEffect, type RefObject } from "react";

/** Marks a piece drawn in a top corner of the card and nowhere across its middle; set by TopCorners. */
export const TOP_CORNER_ATTRIBUTE = "data-top-corner";

/** The variable the opening's top padding reads: how far its words have to come down to clear the corners. */
export const CORNER_CLEAR_VARIABLE = "--opening-corner-clear";

/**
 * How much of a corner piece's box is drawn, as a share of its radius: the
 * mandala's own file fades out before its edge, and its last twentieth is
 * nothing at all.
 */
const CORNER_INK = 0.95;

/**
 * Keeps the words of a card's opening clear of what is drawn in its two top
 * corners.
 *
 * A corner piece does not push the words down the way a garland across the
 * top does: the middle of the card is clear under it, and the words start
 * where they would on a card with nothing there. But a corner piece is a
 * circle about its corner, and on a narrow screen it reaches under the ends
 * of a wide line. So each line is tested against each circle where the two
 * are nearest, and the block is brought down by the most any line needs and
 * no more: nothing at all where they are already clear.
 *
 * The answer is left on the block as CORNER_CLEAR_VARIABLE, which its
 * padding reads. Measured before the first paint and again when the block or
 * the card changes size; never on a scroll, since the corners and the words
 * scroll together.
 */
export function useClearOfCorners(block: RefObject<HTMLElement | null>, enabled: boolean): void {
  useLayoutEffect(() => {
    const box = block.current;
    const card = box?.closest<HTMLElement>(".lifafa-card-content")?.parentElement ?? null;

    if (!enabled || box === null || card === null) {
      return;
    }

    let live = true;
    let applied = 0;

    const measure = (): void => {
      if (!live) {
        return;
      }

      const corners = Array.from(card.querySelectorAll<HTMLElement>(`[${TOP_CORNER_ATTRIBUTE}]`)).map(
        (corner) => {
          const rect = corner.getBoundingClientRect();

          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            radius: (rect.width / 2) * CORNER_INK,
          };
        },
      );
      const boxRect = box.getBoundingClientRect();
      /* A card drawn scaled in a frame: its rectangles are scaled and its own px are not. */
      const scale = box.offsetWidth > 0 ? boxRect.width / box.offsetWidth || 1 : 1;
      const range = document.createRange();
      /* The most any line is short of clearing a circle; negative is room to spare. */
      let short = Number.NEGATIVE_INFINITY;

      for (const child of Array.from(box.children)) {
        if (
          child.classList.contains("lifafa-scene-slot") ||
          child.classList.contains("lifafa-scene-spare")
        ) {
          continue;
        }

        /* The ink of each run of text; a piece with none, the calligraphy, is its own box. */
        const lines: DOMRect[] = [];
        const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);

        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if ((node.textContent ?? "").trim().length > 0) {
            range.selectNodeContents(node);
            lines.push(range.getBoundingClientRect());
          }
        }

        if (lines.length === 0) {
          lines.push(child.getBoundingClientRect());
        }

        for (const line of lines) {
          if (line.width < 1 || line.height < 1) {
            continue;
          }

          for (const corner of corners) {
            /* Where the line is nearest the circle's centre, across. */
            const across = Math.min(Math.max(corner.x, line.left), line.right) - corner.x;

            if (Math.abs(across) >= corner.radius) {
              continue;
            }

            /* The circle's foot there; the line's top has to be under it. */
            const foot = corner.y + Math.sqrt(corner.radius ** 2 - across ** 2);

            short = Math.max(short, foot - line.top);
          }
        }
      }

      /*
        From where the words start now, which may be further down than this
        asked for (a garland, a tenth of the screen): the padding they need is
        that and what they are short by, and a px for the rounding. Less than
        the padding's other terms, it changes nothing.
      */
      const padded = parseFloat(getComputedStyle(box).paddingTop) || 0;
      const next =
        short === Number.NEGATIVE_INFINITY ? 0 : Math.max(0, Math.ceil(padded + short / scale + 1));

      if (next !== applied) {
        applied = next;
        box.style.setProperty(CORNER_CLEAR_VARIABLE, `${next}px`);
      }
    };

    measure();

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    observer?.observe(box);
    observer?.observe(card);
    window.addEventListener("resize", measure);
    void document.fonts?.ready.then(measure);

    return () => {
      live = false;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      box.style.removeProperty(CORNER_CLEAR_VARIABLE);
    };
  }, [block, enabled]);
}
