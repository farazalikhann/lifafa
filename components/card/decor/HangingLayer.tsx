"use client";

import type { CSSProperties, ReactElement } from "react";
import { getOrnament, ORNAMENT_ASPECT } from "@/lib/ornaments/muslim";
import type {
  AnyOrnamentId,
  HangingOrnament,
  OrnamentId,
} from "@/types/ornament";

/**
 * Which ornaments are allowed to hang.
 *
 * A lantern, a moon and a string of lights all read as suspended from
 * something above them. An arch, a border and a star do not — they are surfaces
 * and frames, and hanging one from the top edge of the card would look like a
 * mistake rather than a decision. Anything not in this set is ignored here and
 * left to the parts of the card that know what to do with it — the two stars go
 * to CornerLayer, the border to the dividers, the arch to the cover.
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
 * 200 leaves the deepest ornament's foot around 99px down at the sizes below,
 * which is what `hangingDepth` then clears every section's content past. The
 * band was 380 while the ornaments were 2.5x; at 45% of that it has no business
 * reserving most of a phone screen.
 */
const BAND_HEIGHT = 200;

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
 * SIZES. Every lantern and moon is 45% of what it was. The 2.5x before this
 * overshot badly: a single lantern stood 144px tall on an 800px screen, the
 * band reached 226px, and the whole group read as the subject of the card
 * rather than as something hanging at the top of it. At 45% the largest lantern
 * is 65px and the band ends at 106px — 13% of a 360x800 screen — which is what
 * "framing the top edge" actually costs.
 *
 * The positions are re-authored with the sizes rather than kept, because the
 * gaps that separated 2.5x boxes leave the small ones scattered. All six hang
 * as one staggered row with a clear gap between every pair at 360px, in this
 * order across the card: lantern, lantern, moon, moon, lantern, lantern.
 *
 * The depths still vary on purpose: a row of lamps at one offset reads as a
 * shelf, and the whole point of a lantern is that it is on a string of its own
 * length.
 */
const HANGING: readonly HangingOrnament[] = [
  /*
    The string of lights spans the card, so it is drawn first, behind.

    The one ornament here that is not at 45%, and deliberately: it is a span
    rather than a motif, tied off at both ends, and its height is a function of
    its width — 21rem is 336px across and 84px deep at the reference width. At
    45% it would be a 151px garland floating in the middle of the card with four
    lanterns hanging off nothing on either side of it. Pulled in from 22.5rem so
    both hooks sit inside a 360px card rather than flush against its edges.
  */
  {
    id: "hangingLights",
    xPercent: 50,
    topPercent: 0,
    sizeRem: 21,
    delayMs: 0,
    swing: false,
  },
  {
    id: "lantern",
    xPercent: 10,
    topPercent: 4,
    sizeRem: 4.05,
    delayMs: 0,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 26,
    topPercent: 19,
    sizeRem: 3.15,
    delayMs: 900,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 74,
    topPercent: 26,
    sizeRem: 2.7,
    delayMs: 1800,
    swing: true,
  },
  {
    id: "lantern",
    xPercent: 90,
    topPercent: 11,
    sizeRem: 3.6,
    delayMs: 2600,
    swing: true,
  },
  /*
    Moons drift rather than swing — nothing is holding them, so a pendulum
    would be describing a rope that is not drawn.
  */
  {
    id: "crescentMoon",
    xPercent: 50,
    topPercent: 8,
    sizeRem: 2.35,
    delayMs: 1300,
    swing: false,
  },
  /*
    At 45% there is room for all six in one row, so this one no longer has to
    clear its neighbours vertically the way it did at 2.5x.
  */
  {
    id: "crescentMoon",
    xPercent: 38,
    topPercent: 36,
    sizeRem: 1.7,
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
 * Slack added under the deepest ornament by hangingDepth.
 *
 * A swinging lantern's tassel travels a few px past where it hangs at rest —
 * 3 degrees across roughly 65px is about 3.4px at the sizes above — and a line
 * of text that only just clears a lantern standing still would be clipped by
 * one in motion.
 */
const SWING_MARGIN = 6;

/**
 * How far down the card the deepest enabled hanging ornament reaches, in px.
 * Zero when nothing hangs.
 *
 * Exported because the card has to know: the greeting and the dua sit at the
 * top of the cover, which is exactly where the lanterns are, and text laid over
 * a string of bulbs is unreadable. Derived from the same table that positions
 * them rather than written down a second time — a lantern moved deeper here
 * pushes the greeting down with it, with nothing to keep in sync by hand.
 *
 * Now that the band is pinned to the top of the screen rather than to the top
 * of the card, this is a clearance EVERY section needs, not only the one the
 * greeting is on. Any section can be the one filling the screen, and whichever
 * one is has the lanterns directly over its own first line — which is how the
 * date came to be rendered behind them. The caller applies this to all of them.
 */
export function hangingDepth(
  enabledOrnaments: readonly AnyOrnamentId[],
): number {
  let deepest = 0;

  for (const ornament of HANGING) {
    if (
      !HANGABLE.includes(ornament.id) ||
      !enabledOrnaments.includes(ornament.id)
    ) {
      continue;
    }

    /* `sizeRem` measures the longer side, so a wide ornament is shorter than it. */
    const size = ornament.sizeRem * ROOT_FONT_PX;
    const aspect = ORNAMENT_ASPECT[ornament.id];
    const height = aspect >= 1 ? size / aspect : size;
    const top = (ornament.topPercent / 100) * BAND_HEIGHT;

    deepest = Math.max(deepest, top + height);
  }

  return deepest === 0 ? 0 : Math.ceil(deepest + SWING_MARGIN);
}

/**
 * Ornaments pinned to the top edge of the *screen*, hanging over whichever
 * section the guest is currently looking at.
 *
 * Separate from DecorLayer, which scatters motifs across the whole card and
 * moves them on a loop. This layer does one thing DecorLayer cannot: it anchors
 * to a single edge, so a lantern reads as suspended from above rather than as
 * floating somewhere on the card.
 *
 * The band is sticky rather than simply sitting at the top of the card. Pinned
 * to the card, the lanterns scrolled away with the cover and were gone for the
 * whole rest of the invitation, which is not what a hanging ornament does.
 * Both wrappers clip with `overflow: clip` and never `overflow: hidden`, as
 * does the canvas root above them: `hidden` makes an element a scroll
 * container, and a sticky child sticks to the nearest one — which, being the
 * card itself, never scrolls, so the band would not move at all.
 *
 * Purely decorative and completely inert — `aria-hidden` so it is never read
 * out, `pointer-events-none` so a lantern hanging over the cover can never
 * swallow a tap or a scroll that was meant for the card underneath.
 *
 * Sits above the text rather than below it: the content column in CardCanvas
 * is `z-10`, the dissolve that clears text out of this band is `z-[12]`, and
 * this is `z-[15]`. That order is what makes the fade work — a line on its way
 * off the screen is gone before it reaches a lantern, and the lantern is drawn
 * at full strength over the space it left.
 */
export default function HangingLayer({
  enabledOrnaments,
  accent,
}: {
  enabledOrnaments: readonly AnyOrnamentId[];
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
    /*
      The outer layer spans the whole card and clips to it, so nothing can bleed
      past the card's own width; the band inside it is what stays in view.
    */
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[15] overflow-clip"
    >
      <div
        className="sticky top-0 w-full overflow-clip"
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
              <span
                className={ornament.swing ? "lifafa-hang-swing" : "block"}
                style={swingStyle}
              >
                <Shape
                  size={ornament.sizeRem * ROOT_FONT_PX}
                  /*
                    Stable per slot and unique across the layer, which is what
                    the lantern's glow filter needs: an id built from the
                    table's own fixed values is identical on the server and in
                    the browser.
                  */
                  instanceId={`hang-${index}-${ornament.id}`}
                />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
