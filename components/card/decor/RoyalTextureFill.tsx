"use client";

import { useEffect, useRef, type ReactElement, type RefObject } from "react";
import {
  ROYAL_TEXTURE_ATTRIBUTE,
  ROYAL_TEXTURE_SRC,
  ROYAL_TEXTURE_TILE,
} from "@/lib/royalTexture";

/**
 * The royal texture, for a band that is pinned to the screen: the dissolve at
 * the top and bottom, and the names header.
 *
 * Those bands are painted in the card's colour over the card, and on a card
 * with the texture a flat strip of that colour is a strip with no damask in
 * it. This is the damask for the strip: the same tile, the same soft-light
 * and the same opacity as the card's own, to be laid over the band's colour
 * inside an isolated group so it blends with that colour and nothing else.
 *
 * KEPT IN REGISTER WITH THE CARD. The card's texture scrolls with the card and
 * the band does not, so a tile simply drawn in the band would stand still
 * while the same pattern slid past underneath it. The tile here is moved
 * instead, to wherever the card's own tile is on the screen at that moment,
 * so the pattern in the band is the pattern under it.
 *
 * That is a scroll listener, which is the thing ScrollFade is built not to
 * need, and the difference is what is at stake: there it would have been the
 * text's fade falling out of step, and here it is a quiet pattern a frame
 * behind itself while the card is moving, exact again the moment it stops.
 * One passive listener, one write per frame, and no layout is changed by it.
 */
export default function RoyalTextureFill({
  opacity,
  anchorRef,
}: {
  /** The overlay's opacity on this card; see royalTextureOpacity. */
  opacity: number;
  /**
   * Where this fill is on the screen when its band is in place, for a band
   * that slides in under a transform and so cannot be measured itself.
   */
  anchorRef?: RefObject<HTMLElement | null>;
}): ReactElement {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fill = fillRef.current;

    if (fill === null) {
      return;
    }

    /* This card's own texture: the nearest ancestor that has one as a child. */
    let card: Element | null = null;
    for (let node = fill.parentElement; node !== null && card === null; node = node.parentElement) {
      card = node.querySelector(`:scope > [${ROYAL_TEXTURE_ATTRIBUTE}]`);
    }

    if (card === null) {
      return;
    }

    const ground = card;
    let frame = 0;

    const place = (): void => {
      frame = 0;

      const here = (anchorRef?.current ?? fill).getBoundingClientRect();
      const there = ground.getBoundingClientRect();
      /* A preview drawn under a scale measures in scaled px and positions in its own. */
      const own = fill.getBoundingClientRect();
      const scale = fill.offsetWidth > 0 && own.width > 0 ? own.width / fill.offsetWidth : 1;

      fill.style.backgroundPosition = `${(there.left - here.left) / scale}px ${(there.top - here.top) / scale}px`;
    };

    const schedule = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(place);
      }
    };

    place();

    /* Captured, because scroll does not bubble and the editor's card scrolls inside a frame. */
    document.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);

      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [anchorRef]);

  return (
    <div
      ref={fillRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url(${ROYAL_TEXTURE_SRC})`,
        backgroundSize: `${ROYAL_TEXTURE_TILE}px ${ROYAL_TEXTURE_TILE}px`,
        backgroundRepeat: "repeat",
        mixBlendMode: "soft-light",
        opacity,
      }}
    />
  );
}
