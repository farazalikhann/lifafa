"use client";

import { useLayoutEffect, type RefObject } from "react";
import { whenIdle } from "@/templates/sheesh-mahal/shared";

/* How small the words may be stepped down to fit their box, as a share of their full size, and the step. */
const FIT_FLOOR = 0.45;
const FIT_STEP = 0.04;
/* A name's largest size, as a share of the box's type, and how small it may go on one line before both take two. */
const NAME_MAX = 2.2;
const ONE_LINE_FLOOR = 0.62;
const TWO_LINE_FLOOR = 0.4;
/* What a name is measured at; any size will do, as width goes with size. */
const MEASURE_PX = 100;
/* A name is set a little under the size it would just fit at: a script's swashes reach past its letters. */
const NAME_EASE = 0.95;

/**
 * Steps the words in `outer` down from full size until they are no taller
 * and no wider than it. Every size in them is in `em`, so one font size on
 * `inner` scales the lot.
 *
 * Its width is judged by its lines other than the name, which is sized to
 * fit on its own (useNamesAlike) and whose gold is drawn a little past its
 * letters (`.jhName .foilFill`).
 */
export function fitInside(outer: HTMLElement, inner: HTMLElement): void {
  let scale = 1;
  inner.style.fontSize = "1em";
  const lines = [...inner.children].filter(
    (line): line is HTMLElement => line instanceof HTMLElement && !line.hasAttribute("data-name"),
  );
  const wide = (): number => Math.max(0, ...lines.map((line) => line.scrollWidth));

  while (
    scale > FIT_FLOOR &&
    (inner.scrollHeight > outer.clientHeight + 1 || wide() > outer.clientWidth + 1)
  ) {
    scale = Math.max(FIT_FLOOR, scale - FIT_STEP);
    inner.style.fontSize = `${scale}em`;
  }
}

/** How wide `text` is in `like`'s face at MEASURE_PX, by a hidden copy. */
function widthOf(text: string, like: HTMLElement): number {
  const probe = document.createElement("span");
  const style = getComputedStyle(like);
  /* Its tracking is computed in px at its own size: carried over at the size it is measured at. */
  const tracking =
    style.letterSpacing === "normal" ? 0 : (parseFloat(style.letterSpacing) / parseFloat(style.fontSize)) * MEASURE_PX;
  probe.textContent = text;
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${style.fontFamily};font-weight:${style.fontWeight};font-style:${style.fontStyle};letter-spacing:${tracking.toFixed(2)}px;font-size:${MEASURE_PX}px`;
  like.parentElement?.appendChild(probe);
  /* Its layout width: the room it is in may be scaled (the walk between rooms), which a box's rect would include. */
  const width = probe.offsetWidth;
  probe.remove();
  return width;
}

export interface NameBox {
  box: HTMLElement | null;
  words: HTMLElement | null;
  /** The name, which holds its text in `data-name` (Foil sets it more than once). */
  name: HTMLElement | null;
}

/**
 * The names in their boxes at one size, and the rest of each box fitted
 * under, by the rules of Gulab Mahal's tags.
 *
 * BOTH NAMES THE SAME SIZE: the largest at which the longer one still fits
 * on one line. Only when that would be smaller than ONE_LINE_FLOOR of the
 * box's own type may names take two lines, broken between words alone, at
 * the size where both fit in two and no single word is wider than the box;
 * and only when two would be smaller than TWO_LINE_FLOOR, three (a window is
 * narrower than a tag, and a very long name would be too small to read).
 * Then each box's other lines are stepped down to fit what is left
 * (fitInside); the names are in px and keep their size.
 *
 * Measured with layout widths, which a scale on a room around them (the walk
 * between rooms) does not change. Before the first paint, again at an idle
 * moment when the boxes change size, and when the fonts arrive; never while
 * anything moves.
 */
export function useNamesAlike(parts: RefObject<NameBox[]>, key: string): void {
  useLayoutEffect(() => {
    let live = true;
    let cancelIdle: (() => void) | null = null;

    const fit = (): void => {
      const boxes = parts.current.filter(
        (part): part is { box: HTMLElement; words: HTMLElement; name: HTMLElement | null } =>
          part.box !== null && part.words !== null,
      );

      if (!live || boxes.length === 0) {
        return;
      }

      for (const part of boxes) {
        part.words.style.fontSize = "1em";
      }

      const room = boxes[0].box.clientWidth;
      const largest = parseFloat(getComputedStyle(boxes[0].box).fontSize) * NAME_MAX;
      const named = boxes.flatMap((part) => (part.name !== null ? [part.name] : []));

      if (named.length > 0 && room > 0) {
        const textOf = (name: HTMLElement): string => name.dataset.name ?? "";
        const oneLine = named.map((name) => (room / Math.max(1, widthOf(textOf(name), name))) * MEASURE_PX);
        const widestWord = Math.min(
          ...named.map((name) => {
            /* A line may break between words, and after a hyphen. */
            const words = textOf(name).split(/\s+|(?<=-)/).filter((word) => word.length > 0);
            const widest = Math.max(1, ...words.map((word) => widthOf(word, name)));
            return (room / widest) * MEASURE_PX;
          }),
        );

        const shared = Math.min(...oneLine);
        const onOneLine = shared >= largest * ONE_LINE_FLOOR;
        /* Two lines: never so large that a single word is wider than the box. */
        const inTwo = Math.min(largest, ...oneLine.map((one) => one * 1.85));
        const inThree = Math.min(largest, ...oneLine.map((one) => one * 2.75));
        const size = onOneLine
          ? Math.min(largest, shared)
          : Math.min(widestWord, inTwo >= largest * TWO_LINE_FLOOR ? inTwo : inThree);

        for (const name of named) {
          name.style.fontSize = `${(size * NAME_EASE).toFixed(2)}px`;
          name.style.whiteSpace = onOneLine ? "nowrap" : "normal";
        }
      }

      for (const part of boxes) {
        fitInside(part.box, part.words);
      }
    };

    const refit = (): void => {
      cancelIdle?.();
      cancelIdle = whenIdle(fit);
    };

    fit();

    const first = parts.current[0]?.box ?? null;
    const observer = typeof ResizeObserver === "function" && first !== null ? new ResizeObserver(refit) : null;

    if (first !== null) {
      observer?.observe(first);
    }

    void document.fonts?.ready.then(fit);
    /* A face that arrives later (the Devanagari one, when the guest switches to Hindi): fitted again. */
    document.fonts?.addEventListener("loadingdone", refit);

    return () => {
      live = false;
      cancelIdle?.();
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", refit);
    };
  }, [parts, key]);
}
