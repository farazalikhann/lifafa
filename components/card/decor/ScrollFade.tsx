"use client";

import type { CSSProperties, ReactElement } from "react";
import RoyalTextureFill from "@/components/card/decor/RoyalTextureFill";
import { cardPx } from "@/lib/cardScale";
import type { RoyalTextureLayer } from "@/lib/royalTexture";

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

/**
 * How far the dissolve reaches in from each edge, in px.
 *
 * Exported because it is not only this layer's business, and the card had the
 * number wrong in exactly the way that is easy to get wrong. Sections inset
 * their content by `hangingDepth` — the depth at which the *ornaments* stop —
 * and that is where the dissolve is at its strongest, not where it ends. The
 * 84px ramp below it is the part that looks like nothing is happening until
 * something tall is standing in it, and then half of that thing is a smear.
 *
 * Which is precisely what the Bismillah did: it is the one piece of content on
 * the card that is a block rather than a line, so it is the first thing whose
 * top edge reached up into the ramp, and on a card with lanterns and a dua it
 * lost its upper half to the wash. Anything that has to stand clear of the
 * dissolve rather than pass through it asks here.
 *
 * The two ends differ because the fade does: the top has the ornaments to clear
 * before its ramp even starts, and the bottom has nothing above it.
 */
export function scrollFadeDepth(hangingBand: number): {
  top: number;
  bottom: number;
} {
  return {
    top: Math.max(MIN_CLEARANCE, hangingBand) + TOP_RAMP,
    bottom: BOTTOM_FADE,
  };
}

/**
 * A quarter of a disc as a mask tile: solid at the corner the disc is centred
 * on and for nine tenths of the way out, and gone at its edge, as the ornament
 * it is cut for is. `cx` is which side of the tile that corner is on. Square,
 * so a tile given a width is as tall.
 */
function cornerTile(cx: 0 | 100): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">` +
    `<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="0" r="100">` +
    `<stop offset="0.9"/><stop offset="1" stop-opacity="0"/>` +
    `</radialGradient><rect width="100" height="100" fill="url(#g)"/></svg>`;

  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * The mask that takes two top corners of the card out of this layer.
 *
 * FOR THE ORNAMENT THAT TURNS THERE (TopCorners). It lies under the content
 * column, and this layer paints the card's colour over whatever is under the
 * column at the top of the screen: the ornament was being painted out. The
 * two are in step only while the card is at the top, so the hole cannot be in
 * the pinned band; it is on the layer's outer box, which is the card's own
 * height and scrolls with it, and so stays over the ornament as both go up.
 *
 * Everything, less a quarter disc at each top corner: the whole box excluded
 * by the two tiles. Where `mask-composite` is not understood the three are
 * added instead, the mask is solid, and the dissolve is whole as it was: the
 * ornament is hidden under it and nothing else changes.
 *
 * A masked box is where a backdrop filter stops looking, so on a card with
 * the ornament the dissolve fades a line without also softening it. The
 * ornament is line art directly under this layer, and blurred it would be a
 * smudge; the fade is the part that matters.
 */
function sparing(reach: string): CSSProperties {
  const image = `${cornerTile(0)}, ${cornerTile(100)}, linear-gradient(#000, #000)`;
  const size = `${reach} auto, ${reach} auto, 100% 100%`;

  return {
    WebkitMaskImage: image,
    WebkitMaskSize: size,
    WebkitMaskPosition: "left top, right top, left top",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskComposite: "xor",
    maskImage: image,
    maskSize: size,
    maskPosition: "left top, right top, left top",
    maskRepeat: "no-repeat",
    maskComposite: "exclude",
  };
}

export default function ScrollFade({
  background,
  texture,
  hangingBand,
  bandHeight,
  spareTopCorners = null,
}: {
  /** The card's resolved background. The dissolve is into this exact colour. */
  background: string;
  /**
   * The royal texture's layer on a card that has it, or null. With it, the
   * dissolve is into the card's colour with the damask in it, so the pattern
   * runs on under the fade instead of stopping at a flat strip.
   */
  texture: RoyalTextureLayer | null;
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
  /**
   * How far in from the card's two top corners this layer is to leave alone,
   * as a CSS length, on a card with an ornament there; see `sparing`.
   */
  spareTopCorners?: string | null;
}): ReactElement {
  /* Text is fully gone by here, which is at or above the deepest ornament. */
  const clearTo = Math.max(MIN_CLEARANCE, hangingBand);
  const topFade = clearTo + TOP_RAMP;

  /*
    One gradient shape, used twice. As a background it dissolves the text into
    the card; as a mask it fades the blur out on the same curve, so the two
    cannot drift apart into a blurred edge with no fade or the reverse.
  */
  /*
    Every length in card pixels, because the ornaments this clears grow with a
    fluid card and a fade measured in plain px would stop short of them. The
    same px as ever on a phone and in the editor.
  */
  /*
    Scaled with the ornaments on a short screen (--card-opening, globals.css),
    so the dissolve stays exactly as deep as what it clears.
  */
  const clear = `calc(${cardPx(clearTo)} * var(--card-opening, 1))`;
  const fade = `calc(${cardPx(topFade)} * var(--card-opening, 1))`;
  const bottom = cardPx(BOTTOM_FADE);
  const topStops = `${background} 0px, ${background} ${clear}, transparent ${fade}`;
  const topMask = `#000 0px, #000 ${clear}, transparent ${fade}`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[12] overflow-clip"
      style={spareTopCorners !== null ? sparing(spareTopCorners) : undefined}
    >
      <div
        className="sticky top-0 w-full overflow-clip"
        style={{ height: bandHeight }}
      >
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: fade,
            ...(texture === null
              ? { background: `linear-gradient(to bottom, ${topStops})` }
              : null),
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
        >
          {/*
            The same gradient, as the alpha of a group rather than as a paint:
            the card's colour with the damask soft-lit onto it and onto nothing
            else, then faded on the curve the flat colour was. Where the fade
            is solid this is the card's own ground exactly, and through the
            ramp it is that ground coming in over itself.
          */}
          {texture !== null ? (
            <div
              className="absolute inset-0"
              style={{
                isolation: "isolate",
                maskImage: `linear-gradient(to bottom, ${topMask})`,
                WebkitMaskImage: `linear-gradient(to bottom, ${topMask})`,
              }}
            >
              <div className="absolute inset-0" style={{ backgroundColor: background }} />
              <RoyalTextureFill texture={texture} />
            </div>
          ) : null}
        </div>

        <div
          className="absolute inset-x-0 bottom-0"
          style={
            texture === null
              ? {
                  height: bottom,
                  background: `linear-gradient(to top, ${background} 0px, transparent ${bottom})`,
                }
              : {
                  height: bottom,
                  isolation: "isolate",
                  maskImage: `linear-gradient(to top, #000 0px, transparent ${bottom})`,
                  WebkitMaskImage: `linear-gradient(to top, #000 0px, transparent ${bottom})`,
                }
          }
        >
          {texture !== null ? (
            <>
              <div className="absolute inset-0" style={{ backgroundColor: background }} />
              <RoyalTextureFill texture={texture} />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
