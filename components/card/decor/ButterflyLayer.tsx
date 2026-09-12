"use client";

import type { CSSProperties, ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BUTTERFLY_ASPECT, butterflySources } from "@/lib/butterflies";
import type { ButterflyStyle, DecorIntensity } from "@/types/card";

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
 * SO THEY DO NOT FLY OVER THE TEXT. That is the whole shape of this file. The
 * position table below keeps every butterfly in the margin outside the column
 * the sections set their text in, the flight paths are cut short on the
 * horizontal so none of them wanders back into it, and what is left — the
 * vertical — is where there is nothing to collide with. Which is what lets them
 * fly at 0.9 rather than at the scatter's ceiling, and read as butterflies.
 *
 * THE TABLE IS THE ONLY THING KEEPING THEM OFF IT. This layer holds `z-[17]`,
 * one above the border frame, which is one above the text: a butterfly is the
 * nearest thing to the guest and passes in front of everything, because the
 * alternative is what it looked like first — flying behind a photographic
 * border, which paints the same margin they do, so the flower frames swallowed
 * them whole. The stacking order used to be the backstop for a line longer than
 * the section padding suggests; now there is none, and the margins above are
 * chosen with that in mind.
 *
 * NO GIF. The wingbeat is CSS on a still image, and the whole of why is in
 * lifafa-butterfly-wing in globals.css. Briefly: a GIF cannot carry the soft
 * edge this cut-out has, cannot be stopped for a guest who has asked for less
 * movement, and every copy of one beats in the same rhythm at the same moment.
 *
 * WHICH BUTTERFLY IS THE HOST'S, not this file's. A card has a palette, and
 * three colours of insect arriving unasked is a decision made on the host's
 * behalf — so the panel offers red, yellow, purple and a mixture of all three,
 * and what arrives here is whichever they chose. lib/butterflies.ts names the
 * files and turns that choice into the list this layer cycles.
 *
 * PINNED, not scrolled — the same sticky band DecorLayer uses, so the
 * butterflies stay with what the guest is looking at rather than being left
 * behind after the cover.
 */

interface Flyer {
  /**
   * Percentages within the band.
   *
   * Deliberately close to the edges. A butterfly at 2% on a 390px card starts
   * 8px in and is 32px wide, so it ends around 40px — against a section that
   * pads its text to 28px, that is a wingtip's worth of overlap, and the flight
   * path adds at most 12 more.
   *
   * The left-hand entries moved outward when the sizes went up, and that pairing
   * is the point: a butterfly grows toward the middle of the card, so holding
   * the inner edge where it was is the only way to make one bigger without
   * making it reach further across the writing. The right-hand entries did not
   * move, because on that side growth runs toward the card's edge instead.
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
  { left: 2, top: 22, size: 32, path: "a", travel: 19, wing: 0.72, rotate: 12, delay: 0 },
  { left: 85, top: 58, size: 29, path: "c", travel: 23, wing: 0.62, rotate: -16, delay: 1.4 },
  /* Joins at "normal". */
  { left: 88, top: 14, size: 25, path: "b", travel: 21, wing: 0.84, rotate: 22, delay: 2.6 },
  { left: 0, top: 70, size: 28, path: "c", travel: 25, wing: 0.68, rotate: -9, delay: 0.8 },
  /* The last two are only reached at "lively". */
  { left: 90, top: 84, size: 24, path: "a", travel: 22, wing: 0.78, rotate: 7, delay: 3.4 },
  { left: 3, top: 44, size: 26, path: "b", travel: 26, wing: 0.66, rotate: -20, delay: 2.0 },
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

/**
 * A shadow the shape of the butterfly, and it is not decoration.
 *
 * Flying above the border put them over the flower frames, which paint dense
 * colour into exactly the margin the butterflies fly in — a violet butterfly
 * over a violet bouquet simply disappeared into it. `drop-shadow` follows the
 * cut-out's own alpha rather than its box, so what it draws is the insect's
 * outline half a pixel down and behind, which is enough to lift it off whatever
 * it is passing over and reads as nothing at all on a plain card.
 *
 * On the image, deliberately, and not on either animated span: `filter` is the
 * one property neither keyframe touches, and an element carrying both a filter
 * and an animation pays for the filter on every frame.
 */
const SHADOW = "drop-shadow(0 1px 1.5px rgb(0 0 0 / 0.38))";

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
function Butterfly({
  flyer,
  src,
}: {
  flyer: Flyer;
  src: string;
}): ReactElement {
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
            src={src}
            alt=""
            aria-hidden="true"
            decoding="async"
            width={flyer.size}
            height={Math.round(flyer.size / BUTTERFLY_ASPECT)}
            className="block max-w-none select-none"
            style={{ filter: SHADOW }}
          />
        </span>
      </span>
    </span>
  );
}

export default function ButterflyLayer({
  style,
  intensity,
  bandHeight,
}: {
  /** Which the host picked. "none" never reaches here — the canvas gates on it. */
  style: Exclude<ButterflyStyle, "none">;
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

  const sources = butterflySources(style);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[17] overflow-clip motion-reduce:hidden"
    >
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        {FLYERS.slice(0, COUNT[intensity]).map((flyer, index) => (
          <Butterfly
            key={`${flyer.left}-${flyer.top}`}
            flyer={flyer}
            /*
              Cycled by position rather than authored per flyer, the way
              DecorLayer cycles its motifs and its rotations — and the same
              cycle covers both cases, because a single colour arrives as a list
              of one and every place lands on it.
            */
            src={sources[index % sources.length]}
          />
        ))}
      </div>
    </div>
  );
}
