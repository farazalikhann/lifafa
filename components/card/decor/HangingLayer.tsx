"use client";

import type { CSSProperties, ReactElement } from "react";
import { getOrnament } from "@/lib/ornaments/muslim";
import type { HangingOrnament, OrnamentId } from "@/types/ornament";

/**
 * Which ornaments are allowed to hang.
 *
 * A lantern, a moon and a string of lights all read as suspended from
 * something above them. An arch, a border and a star do not — they are surfaces
 * and frames, and hanging one from the top edge of the card would look like a
 * mistake rather than a decision. Anything not in this set is ignored here and
 * left to the parts of the card that know what to do with it.
 */
const HANGABLE: readonly OrnamentId[] = [
  "lantern",
  "hangingLights",
  "crescentMoon",
];

/**
 * How tall the band the ornaments hang inside is, in px.
 *
 * Fixed rather than viewport relative, because this layer exists in two very
 * different boxes: a guest's phone screen and the editor's 620px preview frame.
 * A percentage of either would put the lanterns in a different place in each,
 * and the host would be shown a card their guests never receive.
 *
 * 380 keeps the deepest lantern's tassel around 150px down, comfortably above
 * the cover's names, which sit near the middle of a section at least 496px tall.
 */
const BAND_HEIGHT = 380;

/**
 * rem to px, for turning `sizeRem` into the px `size` the ornaments take.
 *
 * The browser default, assumed rather than measured: reading the real root font
 * size means touching the DOM during render, which would make the server and
 * the client disagree about how big a lantern is.
 */
const ROOT_FONT_PX = 16;

/**
 * Where each ornament hangs. Hand authored, and deliberately so.
 *
 * Math.random would place them differently on the server and in the browser,
 * which React reports as a hydration mismatch — the same reason DecorLayer's
 * scatter is a fixed table.
 *
 * The four lanterns sit between 4% and 18% down the band on purpose: a row of
 * lamps at one depth reads as a shelf, and the whole point of a lantern is that
 * it is on a string of its own length. They also keep to the outer quarters of
 * the card, so nothing hangs over the middle where the names are set.
 */
const HANGING: readonly HangingOrnament[] = [
  /* The string of lights spans the full width, so it is drawn first, behind. */
  {
    id: "hangingLights",
    xPercent: 50,
    topPercent: 0,
    sizeRem: 21,
    delayMs: 0,
    swing: false,
  },
  { id: "lantern", xPercent: 9, topPercent: 4, sizeRem: 3.6, delayMs: 0, swing: true },
  {
    id: "lantern",
    xPercent: 23,
    topPercent: 13,
    sizeRem: 2.8,
    delayMs: 900,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 77,
    topPercent: 8,
    sizeRem: 3.2,
    delayMs: 1800,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 91,
    topPercent: 18,
    sizeRem: 2.4,
    delayMs: 2600,
    swing: true,
  },
  /*
    Moons drift rather than swing — nothing is holding them, so a pendulum
    would be describing a rope that is not drawn.
  */
  {
    id: "crescentMoon",
    xPercent: 84,
    topPercent: 2,
    sizeRem: 2.1,
    delayMs: 1300,
    swing: false,
  },
  {
    id: "crescentMoon",
    xPercent: 15,
    topPercent: 25,
    sizeRem: 1.5,
    delayMs: 2100,
    swing: false,
  },
];

/**
 * Swing durations in seconds, cycled across the swinging ornaments.
 *
 * Four values that share no small common multiple, so two lanterns that start
 * out of phase stay out of phase instead of drifting back into step a minute
 * in. The staggered delays handle the first few seconds; this handles the rest.
 */
const SWING_SECONDS: readonly number[] = [4.6, 5.3, 5.9, 4.9];

/**
 * Ornaments pinned to the top edge of the card, hanging down into the cover.
 *
 * Separate from DecorLayer, which scatters motifs across the whole card and
 * moves them on a loop. This layer does one thing DecorLayer cannot: it anchors
 * to a single edge, so a lantern reads as suspended from the top of the card
 * rather than as floating somewhere on it.
 *
 * Purely decorative and completely inert — `aria-hidden` so it is never read
 * out, `pointer-events-none` so a lantern hanging over the cover can never
 * swallow a tap or a scroll that was meant for the card underneath.
 *
 * Sits above the background and below the text: the content column in
 * CardCanvas is `z-10`, and this is `z-[5]`.
 */
export default function HangingLayer({
  enabledOrnaments,
  accent,
}: {
  enabledOrnaments: readonly OrnamentId[];
  accent: string;
}): ReactElement | null {
  const hanging = HANGING.filter(
    (ornament) =>
      HANGABLE.includes(ornament.id) && enabledOrnaments.includes(ornament.id),
  );

  if (hanging.length === 0) {
    return null;
  }

  let swingIndex = 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 top-0 z-[5] overflow-hidden"
      style={{ height: `${BAND_HEIGHT}px` }}
    >
      {hanging.map((ornament, index) => {
        const Shape = getOrnament(ornament.id);

        /*
          Counted over the swinging ornaments only, not over the whole table:
          indexing by position would let the two non-swinging moons consume
          durations and hand two lanterns the same one.
        */
        const duration = ornament.swing
          ? SWING_SECONDS[swingIndex++ % SWING_SECONDS.length]
          : 0;

        const swingStyle: CSSProperties = ornament.swing
          ? {
              animationDuration: `${duration}s`,
              animationDelay: `${ornament.delayMs}ms`,
            }
          : {};

        return (
          <span
            key={`${ornament.id}-${ornament.xPercent}-${ornament.topPercent}`}
            className="absolute block -translate-x-1/2"
            style={{
              left: `${ornament.xPercent}%`,
              top: `${ornament.topPercent}%`,
              /* Ornaments draw with currentColor, so the accent is set here. */
              color: accent,
            }}
          >
            {/*
              The centring translate above and the swing below are on two
              different elements on purpose: an animation's transform replaces
              the element's own outright, so a keyframe rotation applied here
              would drop the -50% and shunt every ornament half its width to
              the right the moment the animation took over.
            */}
            <span className={ornament.swing ? "lifafa-hang-swing" : "block"} style={swingStyle}>
              <Shape
                size={ornament.sizeRem * ROOT_FONT_PX}
                /*
                  Stable per slot and unique across the layer, which is what the
                  lantern's glow filter needs: an id built from the table's own
                  fixed values is identical on the server and in the browser.
                */
                instanceId={`hang-${index}-${ornament.id}`}
              />
            </span>
          </span>
        );
      })}
    </div>
  );
}
