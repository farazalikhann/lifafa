"use client";

import { useLayoutEffect, type RefObject } from "react";
import { whenIdle } from "@/templates/sheesh-mahal/shared";

/* How small the words may be stepped down to fit their box, as a share of their full size, and the step. */
const FIT_FLOOR = 0.45;
const FIT_STEP = 0.04;
/* Under this a name on one line takes two, broken between words; under the second, three. In px. */
const ONE_LINE_FLOOR = 30;
const TWO_LINE_FLOOR = 22;
/* What a name is measured at; any size will do, as width goes with size. */
const MEASURE_PX = 100;
/* A name is set a little under the size it would just fit at: a script's swashes reach past its letters. */
const NAME_EASE = 0.95;

/**
 * Steps the words in `outer` down from full size until they are no taller
 * and no wider than it. Every size in them is in `em`, so one font size on
 * `inner` scales the lot. A line is wider than the box only when a single
 * word is: lines break between words alone.
 */
export function fitInside(outer: HTMLElement, inner: HTMLElement): void {
  let scale = 1;
  inner.style.fontSize = "1em";
  const lines = [...inner.children].filter((line): line is HTMLElement => line instanceof HTMLElement);
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

/**
 * How wide `pieces` are at MEASURE_PX when set in `lines` lines at their best
 * breaks: the widest line, at the breaks that make it narrowest. A piece is a
 * word, or the part of one up to a hyphen, which joins the next with no space.
 */
function narrowestIn(pieces: readonly string[], lines: number, measure: (text: string) => number): number {
  const line = (from: number, to: number): number =>
    measure(pieces.slice(from, to).reduce((text, piece) => (text === "" || text.endsWith("-") ? text + piece : `${text} ${piece}`), ""));
  const count = pieces.length;

  if (lines <= 1 || count <= 1) {
    return line(0, count);
  }

  if (lines === 2 || count === 2) {
    let best = Infinity;
    for (let at = 1; at < count; at += 1) {
      best = Math.min(best, Math.max(line(0, at), line(at, count)));
    }
    return best;
  }

  let best = Infinity;
  for (let first = 1; first < count - 1; first += 1) {
    for (let second = first + 1; second < count; second += 1) {
      best = Math.min(best, Math.max(line(0, first), line(first, second), line(second, count)));
    }
  }
  return best;
}

/**
 * A name over its column, at the largest size that fits it on one line, up
 * to the size its stylesheet gives it. Only when one line would be smaller
 * than ONE_LINE_FLOOR does it take two, broken between words alone at the
 * breaks that let it be largest; and only when two would be smaller than
 * TWO_LINE_FLOOR, three. However many lines, never taller than what its head
 * has room for under the line above it.
 */
function fitName(name: HTMLElement): void {
  const text = name.dataset.name ?? "";
  const head = name.parentElement;
  const column = head?.clientWidth ?? 0;
  name.style.fontSize = "";
  name.style.whiteSpace = "";

  if (head === null || text.length === 0 || column === 0) {
    return;
  }

  const style = getComputedStyle(name);
  const largest = parseFloat(style.fontSize);
  const leading = parseFloat(style.lineHeight) / largest || 1.2;
  const headStyle = getComputedStyle(head);
  const above = [...head.children].reduce(
    (sum, child) => (child === name || !(child instanceof HTMLElement) ? sum : sum + child.offsetHeight + parseFloat(headStyle.rowGap || "0")),
    0,
  );
  const tall = head.clientHeight - parseFloat(headStyle.paddingTop) - parseFloat(headStyle.paddingBottom) - above;

  /* A line may break between words, and after a hyphen. */
  const pieces = text.split(/\s+|(?<=-)/).filter((piece) => piece.length > 0);
  const widths = new Map<string, number>();
  const measure = (part: string): number => {
    const known = widths.get(part);
    if (known !== undefined) {
      return known;
    }
    const width = Math.max(1, widthOf(part, name));
    widths.set(part, width);
    return width;
  };
  const sizeIn = (lines: number): number =>
    Math.min(largest, tall / (lines * leading), (column / narrowestIn(pieces, lines, measure)) * MEASURE_PX);

  let lines = 1;
  let size = sizeIn(1);

  if (size * NAME_EASE < ONE_LINE_FLOOR && pieces.length > 1) {
    lines = 2;
    size = sizeIn(2);

    if (size * NAME_EASE < TWO_LINE_FLOOR && pieces.length > 2) {
      lines = 3;
      size = sizeIn(3);
    }
  }

  name.style.fontSize = `${(size * NAME_EASE).toFixed(2)}px`;
  name.style.whiteSpace = lines === 1 ? "nowrap" : "normal";
}

export interface CoupleFit {
  /** The name over the jharokha, which holds its text in `data-name` (Foil sets it more than once). */
  name: HTMLElement | null;
  /** The window's safe area, and the words in it. */
  box: HTMLElement | null;
  words: HTMLElement | null;
}

/**
 * Each slide's name fitted to its column (fitName), and the words in its
 * window stepped down to fit the window's safe area (fitInside).
 *
 * Measured with layout widths, which a scale on a room around them (the walk
 * between rooms) does not change, and which a slide's own transform does not
 * either. Before the first paint, again at an idle moment when the page
 * changes size, and when the fonts arrive; never while anything moves.
 */
export function useCoupleFit(parts: RefObject<CoupleFit[]>, key: string): void {
  useLayoutEffect(() => {
    let live = true;
    let cancelIdle: (() => void) | null = null;

    const fit = (): void => {
      if (!live) {
        return;
      }

      for (const part of parts.current) {
        if (part.name !== null) {
          fitName(part.name);
        }

        if (part.box !== null && part.words !== null) {
          fitInside(part.box, part.words);
        }
      }
    };

    const refit = (): void => {
      cancelIdle?.();
      cancelIdle = whenIdle(fit);
    };

    fit();

    /* The window and the name's column: either may change size without the other. */
    const watched = [parts.current[0]?.box, parts.current[0]?.name?.parentElement].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    );
    const observer = typeof ResizeObserver === "function" && watched.length > 0 ? new ResizeObserver(refit) : null;

    for (const element of watched) {
      observer?.observe(element);
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
