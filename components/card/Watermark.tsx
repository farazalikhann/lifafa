import type { ReactElement } from "react";

/**
 * The tile grid.
 *
 * Fixed counts rather than a measurement of the card, because the layer
 * stretches to the card's own box: the cells share the space out between them,
 * so a two-screen card and a six-screen card both come out evenly covered
 * without the component ever reading a height. 70 spans is small enough that
 * the whole layer costs less than one section of the card it sits over.
 */
const ROWS = 14;
const COLUMNS = 5;

/** One entry per cell. Built once at module scope — the grid never changes. */
const CELLS: readonly number[] = Array.from(
  { length: ROWS * COLUMNS },
  (_, index) => index,
);

/**
 * Faint enough to read as paper texture rather than as something printed on
 * top of the invitation. The accent is the safe colour to draw it in: every
 * palette's accent is already measured against that palette's background, so
 * at this opacity it lands as a tint on cream and on ink alike.
 */
const PATTERN_OPACITY = 0.05;

/** Enough overhang that rotating the grid still leaves no bare corner. */
const OVERSCAN = "160%";

/**
 * How far the pill sits off the bottom of the screen.
 *
 * Clear of a bar rather than flush to the edge: the full screen preview closes
 * with a line of its own down there, and a pill lying across it would take a
 * sentence the host is meant to read.
 */
const PILL_OFFSET = "3.5rem";

/**
 * "Pay to unlock" made visible on the card itself.
 *
 * Two layers, both inert: a diagonal repeat of the wordmark across the whole
 * card, and one pill naming the reason it is there. Neither takes pointer
 * events and neither is exposed to assistive tech — a guest never sees this,
 * and for the host it is a state of the card, not content of it. The status is
 * already carried in the surrounding UI, where it can be read and acted on.
 *
 * Renders into the nearest positioned ancestor, so the caller wraps the card in
 * a `relative` box. The pill is `fixed` instead: it belongs to the bottom of the
 * screen the host is looking at, not to a point partway down a card that may be
 * several screens long.
 */
export default function Watermark({
  show,
  accent = "var(--lifafa-marigold)",
  surface = "var(--lifafa-ink-raised)",
}: {
  /** False on a paid card, where nothing should be drawn at all. */
  show: boolean;
  /** Card accent. Defaults to the app's own, for callers outside a card. */
  accent?: string;
  /** Card surface, tinted translucent for the pill. */
  surface?: string;
}): ReactElement | null {
  if (!show) {
    return null;
  }

  return (
    <>
      {/*
        Clipped to the card, so the overscan the rotation needs never widens
        anything or shows up as a stray scrollbar.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden select-none"
      >
        <div
          className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 rotate-[-30deg] place-items-center"
          style={{
            width: OVERSCAN,
            height: OVERSCAN,
            gridTemplateColumns: `repeat(${COLUMNS}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
            color: accent,
            opacity: PATTERN_OPACITY,
          }}
        >
          {CELLS.map((cell) => (
            <span
              key={cell}
              className="text-[0.75rem] font-semibold tracking-[0.45em] whitespace-nowrap uppercase"
            >
              Lifafa
            </span>
          ))}
        </div>
      </div>

      <p
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 z-30 -translate-x-1/2 rounded-full px-4 py-2 text-center text-[0.75rem] font-medium shadow-[0_8px_24px_-12px_rgba(0,0,0,0.8)] backdrop-blur select-none"
        style={{
          bottom: PILL_OFFSET,
          color: accent,
          backgroundColor: `color-mix(in srgb, ${surface} 88%, transparent)`,
        }}
      >
        Preview. Pay to remove this watermark.
      </p>
    </>
  );
}
