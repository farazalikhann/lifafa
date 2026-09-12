"use client";

import type { CSSProperties, ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { DecorIntensity } from "@/types/card";

/**
 * A few small butterflies, flying in the margins of the card.
 *
 * The one piece of decor on the card that is a photograph rather than a drawing
 * — the flower frames aside — and it is here rather than in DecorLayer's motif
 * table for exactly that reason. Every motif in that table is stroke work in
 * `currentColor`, scattered across the whole card and held between 0.10 and
 * 0.22 alpha so a name can be read straight through it. A full colour insect
 * cannot join that scatter: at the alpha the scatter runs at it is a grey
 * smudge, and at an alpha where it is a butterfly it is something the guest has
 * to read the date through.
 *
 * SO IT DOES NOT GO BEHIND THE TEXT. That is the whole shape of this file. The
 * position table below keeps every butterfly in the margin outside the column
 * the sections set their text in, the flight paths are cut short on the
 * horizontal so none of them wanders back into it, and what is left — the
 * vertical — is where there is nothing to collide with. Which is what lets them
 * fly at 0.9 rather than at the scatter's ceiling, and read as butterflies.
 *
 * They still sit *under* the content column rather than over it. The margin is
 * measured against the section padding, and a long line, a wide screen or a
 * language that sets longer words can all reach further than that padding
 * suggests — so the stacking order is the backstop for the case the table
 * cannot see.
 *
 * NO GIF. The wingbeat is CSS on a still image, and the reasons are in
 * lifafa-butterfly-wing in globals.css and in the note on FLUTTER_SECONDS
 * below. Briefly: a GIF cannot carry the soft edge this cut-out has, cannot be
 * stopped for a guest who has asked for less movement, and every copy of one
 * beats in the same rhythm.
 *
 * PINNED, not scrolled — the same sticky band DecorLayer uses, so the
 * butterflies stay with what the guest is looking at rather than being left
 * behind after the cover.
 */

/** The published cut-out, straightened to a vertical body axis. */
const BUTTERFLY_SRC = "/decor/butterfly.webp";

/** The artwork's own proportions, so a width is enough to place one. */
const ASPECT = 180 / 110;

interface Flyer {
  /**
   * Percentages within the band.
   *
   * Deliberately close to the edges. A butterfly at 2% on a 390px card starts
   * 8px in and is 26px wide, so it ends around 34px — against a section that
   * pads its text to 28px, that is a couple of pixels of overlap at the very
   * tip of a wing, and the flight path adds at most 12 more.
   */
  left: number;
  top: number;
  /** Rendered width in px. The one thing a host asked to stay small. */
  size: number;
  /** Which of the three paths in globals.css it flies. */
  path: "a" | "b" | "c";
  /** Seconds for one circuit of that path. */
  travel: number;
  /** Seconds for one wingbeat. */
  wing: number;
  /** Static heading, so they are not all pointing due north. */
  rotate: number;
  delay: number;
}

/**
 * Where the butterflies are, hand authored and never generated.
 *
 * Math.random would place them differently on the server and in the browser,
 * which React reports as a hydration mismatch — the same reason DecorLayer's
 * shape table is written out longhand.
 *
 * Ordered so that the first two are the two a "subtle" card gets, and they are
 * on opposite sides at different heights: the smallest count still has to look
 * arranged rather than clustered. Every entry after that keeps the balance.
 */
const FLYERS: readonly Flyer[] = [
  { left: 3, top: 22, size: 27, path: "a", travel: 19, wing: 0.72, rotate: 12, delay: 0 },
  { left: 85, top: 58, size: 24, path: "c", travel: 23, wing: 0.62, rotate: -16, delay: 1.4 },
  /* Joins at "normal". */
  { left: 88, top: 14, size: 21, path: "b", travel: 21, wing: 0.84, rotate: 22, delay: 2.6 },
  { left: 1, top: 70, size: 23, path: "c", travel: 25, wing: 0.68, rotate: -9, delay: 0.8 },
  /* The last two are only reached at "lively". */
  { left: 90, top: 84, size: 20, path: "a", travel: 22, wing: 0.78, rotate: 7, delay: 3.4 },
  { left: 4, top: 44, size: 22, path: "b", travel: 26, wing: 0.66, rotate: -20, delay: 2.0 },
];

/**
 * How many fly at each amount, reusing the control the host already has.
 *
 * Two is not half of four for a reason. The scatter can afford to grow evenly
 * because a motif is a few strokes; a butterfly is the loudest thing on this
 * layer, and six of them on a 390px card is already the point where they stop
 * being a detail someone notices and start being the subject of the card.
 */
const COUNT: Record<DecorIntensity, number> = {
  subtle: 2,
  normal: 4,
  lively: 6,
};

/**
 * Held below full, so a butterfly crossing the frame or a scattered motif
 * reads as being in the same picture rather than pasted on top of it.
 */
const OPACITY = 0.9;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Three spans per butterfly, and each one owns exactly one thing.
 *
 * An animation's transform replaces the element's own outright, so travel and
 * wingbeat cannot share an element and neither can share with the static
 * heading — the rotation would vanish the moment either set of keyframes took
 * over. Outermost travels, the middle one holds the heading and the alpha, the
 * innermost beats its wings. Nested opacity and nested transforms both compose,
 * which is what makes the split free.
 */
function Butterfly({ flyer }: { flyer: Flyer }): ReactElement {
  const travel: CSSProperties = {
    left: `${flyer.left}%`,
    top: `${flyer.top}%`,
    animationName: `lifafa-butterfly-${flyer.path}`,
    animationDuration: `${flyer.travel}s`,
    animationDelay: `${flyer.delay}s`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  };

  const wing: CSSProperties = {
    animationName: "lifafa-butterfly-wing",
    animationDuration: `${flyer.wing}s`,
    /*
      Offset against the travel delay rather than sharing it. Two butterflies
      that happen to start their circuit together would otherwise also beat
      together for the whole of it.
    */
    animationDelay: `${flyer.delay * 0.6}s`,
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationFillMode: "both",
  };

  return (
    <span className="absolute block" style={travel}>
      <span
        className="block"
        style={{ opacity: OPACITY, transform: `rotate(${flyer.rotate}deg)` }}
      >
        <span className="block" style={wing}>
          <img
            src={BUTTERFLY_SRC}
            alt=""
            aria-hidden="true"
            decoding="async"
            width={flyer.size}
            height={Math.round(flyer.size / ASPECT)}
            className="block max-w-none select-none"
          />
        </span>
      </span>
    </span>
  );
}

export default function ButterflyLayer({
  intensity,
  bandHeight,
}: {
  /** How many fly — the host's existing "Amount", read rather than duplicated. */
  intensity: DecorIntensity;
  /**
   * How tall the sticky band is, exactly as DecorLayer takes it: the guest's
   * screen, or the editor's fixed frame.
   */
  bandHeight: string;
}): ReactElement | null {
  /* Read before any early return — a hook may not sit behind a branch. */
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /*
    Removed twice over under reduced motion, the way DecorLayer is:
    `motion-reduce:hidden` below covers the server render and the first paint,
    and this drops them out of the DOM once the query has been read on the
    client. A butterfly is nothing *but* its movement, so there is no still
    version worth leaving behind.
  */
  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-clip motion-reduce:hidden"
    >
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        {FLYERS.slice(0, COUNT[intensity]).map((flyer) => (
          <Butterfly key={`${flyer.left}-${flyer.top}`} flyer={flyer} />
        ))}
      </div>
    </div>
  );
}
