"use client";

import type { CSSProperties, ReactElement } from "react";
import type { TraditionPack } from "@/lib/traditionPacks";
import type { TraditionId } from "@/types/occasion";
import type { AnyOrnamentId, HangingOrnament } from "@/types/ornament";

/**
 * How tall the band the ornaments hang inside is, in px.
 *
 * Fixed rather than viewport relative, because this layer exists in two very
 * different boxes: a guest's phone screen and the editor's 620px preview frame.
 * A percentage of either would put the ornaments in a different place in each,
 * and the host would be shown a card their guests never receive.
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
 * WHICH ORNAMENTS HANG, AND WHERE, DECLARED PER TRADITION.
 *
 * A tradition that is not in this table has nothing that hangs, and an ornament
 * of its pack that is not in its row does not hang either — the table is the
 * declaration, so there is no separate list of "hangable" ids that could
 * disagree with it. Everything a pack owns that is not here, and is not the
 * pack's cover arch or divider, is scattered by CornerLayer instead.
 *
 * All of it is hand authored and never generated. Math.random would place these
 * differently on the server and in the browser, which React reports as a
 * hydration mismatch — the same reason DecorLayer's scatter is a fixed table.
 *
 * DEPTHS VARY ON PURPOSE. A row of ornaments at one offset reads as a shelf,
 * and the whole point of a hanging ornament is that it is on a string of its
 * own length.
 *
 * Every row below was checked at 360px: each box sits inside the card's width
 * once its own aspect ratio is applied, and no two overlap when every ornament
 * in the pack is switched on at once.
 */
const HANGING_BY_TRADITION: Partial<Record<TraditionId, readonly HangingOrnament[]>> = {
  muslim: [
    /*
      The string of lights spans the card, so it is drawn first, behind. Its
      height is a function of its width — 21rem is 336px across and 84px deep at
      the reference width, and both hooks sit inside a 360px card.
    */
    { id: "hangingLights", xPercent: 50, topPercent: 0, sizeRem: 21, delayMs: 0, swing: false },
    { id: "lantern", xPercent: 10, topPercent: 4, sizeRem: 4.05, delayMs: 0, swing: true },
    { id: "lantern", xPercent: 26, topPercent: 19, sizeRem: 3.15, delayMs: 900, swing: true },
    { id: "lantern", xPercent: 74, topPercent: 26, sizeRem: 2.7, delayMs: 1800, swing: true },
    { id: "lantern", xPercent: 90, topPercent: 11, sizeRem: 3.6, delayMs: 2600, swing: true },
    /*
      Moons drift rather than swing — nothing is holding them, so a pendulum
      would be describing a rope that is not drawn.
    */
    { id: "crescentMoon", xPercent: 50, topPercent: 8, sizeRem: 2.35, delayMs: 1300, swing: false },
    { id: "crescentMoon", xPercent: 38, topPercent: 36, sizeRem: 1.7, delayMs: 2100, swing: false },
  ],

  /*
    The Nishan Sahib flies from a staff, so it hangs from the top edge the way a
    banner does. Two of them, framing the head of the card rather than centred,
    which would put a flag straight through the greeting.
  */
  sikh: [
    { id: "nishanSahibPennant", xPercent: 13, topPercent: 2, sizeRem: 3.6, delayMs: 0, swing: true },
    { id: "nishanSahibPennant", xPercent: 87, topPercent: 9, sizeRem: 3.1, delayMs: 1500, swing: true },
  ],

  /* Bells centred and swinging; the rings dangle either side of them. */
  christian: [
    { id: "weddingBells", xPercent: 50, topPercent: 1, sizeRem: 3.6, delayMs: 0, swing: true },
    { id: "ringPair", xPercent: 17, topPercent: 14, sizeRem: 3.1, delayMs: 1100, swing: true },
    { id: "ringPair", xPercent: 83, topPercent: 19, sizeRem: 2.6, delayMs: 2200, swing: true },
  ],

  /*
    The toran spans the card like the Muslim lights do — it is a gateway
    garland, tied off at both ends, so it does not swing. The kalash hangs
    beneath its two ends.
  */
  jain: [
    { id: "tornGate", xPercent: 50, topPercent: 0, sizeRem: 21, delayMs: 0, swing: false },
    { id: "kalash", xPercent: 15, topPercent: 22, sizeRem: 2.9, delayMs: 800, swing: false },
    { id: "kalash", xPercent: 85, topPercent: 27, sizeRem: 2.4, delayMs: 1900, swing: false },
  ],

  /*
    Prayer flags span the card on their line. The lotuses float rather than
    swing — nothing is holding them either.
  */
  buddhist: [
    { id: "prayerFlagString", xPercent: 50, topPercent: 0, sizeRem: 21, delayMs: 0, swing: false },
    { id: "lotus", xPercent: 16, topPercent: 24, sizeRem: 3, delayMs: 700, swing: false },
    { id: "lotus", xPercent: 84, topPercent: 29, sizeRem: 2.5, delayMs: 1800, swing: false },
  ],
};

/**
 * Swing durations in seconds, cycled across the swinging ornaments.
 *
 * Four values that share no small common multiple, so two ornaments that start
 * out of phase stay out of phase instead of drifting back into step a minute
 * in. The staggered delays handle the first few seconds; this handles the rest.
 */
const SWING_SECONDS: readonly number[] = [4.6, 5.3, 5.9, 4.9];

/**
 * Slack added under the deepest ornament by hangingDepth.
 *
 * A swinging ornament travels a few px past where it hangs at rest — 3 degrees
 * across roughly 65px is about 3.4px at the sizes above — and a line of text
 * that only just clears one standing still would be clipped by one in motion.
 */
const SWING_MARGIN = 6;

/** The rows this tradition hangs, or an empty list. */
function rowsFor(pack: TraditionPack | null): readonly HangingOrnament[] {
  if (pack === null) {
    return [];
  }

  return HANGING_BY_TRADITION[pack.traditionId] ?? [];
}

/**
 * Every ornament id this tradition may hang.
 *
 * Read by the canvas to work out what is left over for CornerLayer to scatter,
 * so the two can never both claim the same ornament. Derived from the table
 * rather than written down beside it — a second list is a list that disagrees.
 */
export function hangingIdsFor(
  pack: TraditionPack | null,
): readonly AnyOrnamentId[] {
  return [...new Set(rowsFor(pack).map((row) => row.id))];
}

/**
 * How far down the card the deepest enabled hanging ornament reaches, in px.
 * Zero when nothing hangs.
 *
 * Exported because the card has to know: the greeting and the blessing sit at
 * the top of the cover, which is exactly where the ornaments are, and text laid
 * over a string of bulbs is unreadable. Derived from the same table that
 * positions them rather than written down a second time — an ornament moved
 * deeper here pushes the greeting down with it, with nothing to keep in sync by
 * hand.
 *
 * Because the band is pinned to the top of the screen rather than to the top of
 * the card, this is a clearance EVERY section needs, not only the one the
 * greeting is on: any section can be the one filling the screen, and whichever
 * one is has the ornaments directly over its own first line. The caller applies
 * it to all of them.
 */
export function hangingDepth(
  pack: TraditionPack | null,
  enabledOrnaments: readonly AnyOrnamentId[],
): number {
  let deepest = 0;

  for (const ornament of rowsFor(pack)) {
    if (!enabledOrnaments.includes(ornament.id)) {
      continue;
    }

    const entry = pack?.findOrnament(ornament.id) ?? null;

    /* An id the pack does not know is skipped rather than guessed at. */
    if (entry === null) {
      continue;
    }

    /* `sizeRem` measures the longer side, so a wide ornament is shorter than it. */
    const size = ornament.sizeRem * ROOT_FONT_PX;
    const height = entry.aspect >= 1 ? size / entry.aspect : size;
    const top = (ornament.topPercent / 100) * BAND_HEIGHT;

    deepest = Math.max(deepest, top + height);
  }

  return deepest === 0 ? 0 : Math.ceil(deepest + SWING_MARGIN);
}

/**
 * Ornaments pinned to the top edge of the *screen*, hanging over whichever
 * section the guest is currently looking at.
 *
 * ONE IMPLEMENTATION FOR EVERY TRADITION. The pack is the parameter: it
 * supplies the drawings and their aspect ratios, and HANGING_BY_TRADITION above
 * supplies the positions. Nothing in this component names a tradition.
 *
 * Separate from DecorLayer, which scatters motifs across the whole card and
 * moves them on a loop. This layer does one thing DecorLayer cannot: it anchors
 * to a single edge, so an ornament reads as suspended from above rather than as
 * floating somewhere on the card.
 *
 * The band is sticky rather than simply sitting at the top of the card. Pinned
 * to the card, the ornaments scrolled away with the cover and were gone for the
 * whole rest of the invitation, which is not what a hanging ornament does.
 * Both wrappers clip with `overflow: clip` and never `overflow: hidden`, as
 * does the canvas root above them: `hidden` makes an element a scroll
 * container, and a sticky child sticks to the nearest one — which, being the
 * card itself, never scrolls, so the band would not move at all.
 *
 * Purely decorative and completely inert — `aria-hidden` so it is never read
 * out, `pointer-events-none` so an ornament hanging over the cover can never
 * swallow a tap or a scroll that was meant for the card underneath.
 */
export default function HangingLayer({
  pack,
  enabledOrnaments,
  accent,
}: {
  pack: TraditionPack | null;
  enabledOrnaments: readonly AnyOrnamentId[];
  accent: string;
}): ReactElement | null {
  const hanging = rowsFor(pack).filter((ornament) =>
    enabledOrnaments.includes(ornament.id),
  );

  if (hanging.length === 0 || pack === null) {
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
          const entry = pack.findOrnament(ornament.id);

          /* An id this pack does not know draws nothing at all. */
          if (entry === null) {
            return null;
          }

          const Shape = entry.Component;

          /*
            Counted over the swinging ornaments only, not over the whole table:
            indexing by position would let the non-swinging rows consume
            durations and hand two neighbours the same one.
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
                    the lantern's and the diya's glow filters need: an id built
                    from the table's own fixed values is identical on the server
                    and in the browser.
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
