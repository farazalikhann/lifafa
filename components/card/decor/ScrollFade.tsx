"use client";

import type { ReactElement } from "react";

/**
 * The dissolve at the top and bottom edges of the screen.
 *
 * Card text used to scroll up into the lanterns and sit across them for a
 * second before leaving the screen. This is what stops that: a line approaching
 * the top of the viewport loses opacity and gains a little blur, and is gone
 * before it reaches the ornaments rather than colliding with them on the way
 * out. A shorter fade at the bottom does the same for text arriving from below,
 * so a line eases in instead of appearing all at once.
 *
 * WHY THIS IS A PINNED LAYER AND NOT A MASK ON THE CONTENT COLUMN.
 *
 * A mask would be the obvious answer, and it is the wrong one here. `mask-image`
 * resolves against the element's own box, and the content column is the whole
 * card — several thousand pixels on a phone. A gradient stop placed at 106px
 * would put the fade 106px from the top of the *card*, which the guest passes
 * once and never sees again; what is needed is 106px from the top of the
 * *screen*, on every section, at every scroll offset. CSS has no
 * `mask-attachment: fixed` to bridge that, and a scroll listener recomputing
 * the stop is exactly the thing that desyncs.
 *
 * So the gradient goes where it is already viewport-anchored by construction:
 * a sticky band, the same one DecorLayer, HangingLayer and BorderFrame are
 * pinned inside. It is still one element and one declaration, it still costs
 * nothing per frame, and it still cannot fall out of step with the scroll —
 * because it never reads the scroll at all.
 *
 * WHAT IT FADES, AND WHAT IT MUST NOT. The layer paints over everything below
 * it in z-order and nothing above it, so the z-index is the whole contract:
 * this sits at `z-[12]`, above the content column's `z-10`, and below the
 * hanging ornaments at `z-[15]` and the border at `z-[16]`. Both of those stay
 * at full opacity, which is the point — the lanterns are what the text is being
 * faded *for*, and a frame that dissolved at its own corners would not be a
 * frame. The scattered motifs sit below the column and so fade with the text;
 * on that band of the screen they are behind the lanterns anyway, and a
 * vignette that took the text but left the texture would read as a mistake.
 *
 * Nothing here animates and nothing here takes a pointer:  `aria-hidden` and
 * `pointer-events-none` throughout, and no keyframes, so a guest who has asked
 * for reduced motion gets exactly this.
 */

/**
 * How far the dissolve runs once it is clear of the ornaments, in px.
 *
 * The band above this is solid: text inside it is already gone. This is the
 * distance over which a line goes from fully drawn to fully absent, and it
 * wants to be long enough to read as a dissolve rather than as a cut.
 */
const TOP_RAMP = 84;

/** The bottom is deliberately shorter — arriving needs less ceremony than leaving. */
const BOTTOM_FADE = 60;

/**
 * The dissolve when nothing hangs at all.
 *
 * A card with no ornament pack still wants its text to leave softly rather than
 * be sliced off by the edge of the screen, so the fade never collapses to
 * nothing — it just has far less to clear.
 */
const MIN_CLEARANCE = 24;

/**
 * Blur at the very top of the fade, easing off with the opacity.
 *
 * Small on purpose. This is a line on its way off the screen, not a frosted
 * panel: enough that the last legible moment is soft rather than sharp, not so
 * much that it draws attention to itself.
 */
const BLUR = "2.5px";

export default function ScrollFade({
  background,
  hangingBand,
  bandHeight,
}: {
  /** The card's resolved background. The dissolve is into this exact colour. */
  background: string;
  /**
   * How far the hanging ornaments reach down the screen, in px, from
   * `hangingDepth`. Zero when nothing hangs.
   *
   * Taken from the layer that owns the positions rather than written down a
   * second time: move a lantern deeper and the fade follows it, with nothing to
   * keep in sync by hand.
   */
  hangingBand: number;
  /** Height of the scrollport, exactly as the other pinned layers take it. */
  bandHeight: string;
}): ReactElement {
  /* Text is fully gone by here, which is at or above the deepest ornament. */
  const clearTo = Math.max(MIN_CLEARANCE, hangingBand);
  const topFade = clearTo + TOP_RAMP;

  /*
    One gradient shape, used twice. As a background it dissolves the text into
    the card; as a mask it fades the blur out on the same curve, so the two
    cannot drift apart into a blurred edge with no fade or the reverse.
  */
  const topStops = `${background} 0px, ${background} ${clearTo}px, transparent ${topFade}px`;
  const topMask = `#000 0px, #000 ${clearTo}px, transparent ${topFade}px`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[12] overflow-clip"
    >
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: topFade,
            background: `linear-gradient(to bottom, ${topStops})`,
            /*
              Masked rather than left to cover the whole band: an unmasked
              backdrop-filter would blur the full height of the fade element at
              one strength and stop dead at its edge, which is a visible seam.
              Browsers without backdrop-filter simply get the opacity fade,
              which is the part that matters.
            */
            backdropFilter: `blur(${BLUR})`,
            WebkitBackdropFilter: `blur(${BLUR})`,
            maskImage: `linear-gradient(to bottom, ${topMask})`,
            WebkitMaskImage: `linear-gradient(to bottom, ${topMask})`,
          }}
        />

        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: BOTTOM_FADE,
            background: `linear-gradient(to top, ${background} 0px, transparent ${BOTTOM_FADE}px)`,
          }}
        />
      </div>
    </div>
  );
}
