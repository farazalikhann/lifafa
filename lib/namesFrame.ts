import type { FrameArt } from "@/lib/cardDecor";
import type { NamesFrame } from "@/types/card";

/**
 * The frame a card's opening sets its names in, on a card whose pack opens
 * with the names (`namesOpening` in lib/traditionPacks.tsx): a jharokha arch,
 * a ring of lotuses, a pair of paisleys or a varmala. Drawn by
 * components/card/NamesOpening.tsx and chosen in
 * components/create/NamesFramePanel.tsx.
 *
 * Each picture is cut by scripts/cut-flowers.mjs (`names-frames`) from art
 * supplied on black with an empty middle.
 */

export const DEFAULT_NAMES_FRAME: NamesFrame = "lotus";

export const NAMES_FRAMES: readonly { id: NamesFrame; label: string }[] = [
  { id: "jharokha", label: "Jharokha arch" },
  { id: "lotus", label: "Lotus ring" },
  { id: "paisley", label: "Paisley pair" },
  { id: "varmala", label: "Varmala" },
];

export interface NamesFrameArt extends FrameArt {
  /** A small one, for the editor's chip. */
  thumb: string;
}

/*
  `words` is each frame's empty opening, as shares of its picture: the box
  the names are set in, the way GURUDWARA_ARCH_DOORWAY is the Sikh arch's.
  The names are centred in it both ways.

  MEASURED ON THE PUBLISHED FILES, row by row, as the span of clear pixels
  about the picture's middle, and then brought in a little on every side for
  air, so a name that fills its box still stands off the artwork:

    jharokha   the wide arch. Clear from 10% to 90% across between the
               pillars from 56% down to the foot of the picture, and from
               13.5% to 86.3% at 51%; above that the cusps and the marigold
               swags close in. The box is the open part below the crown, the
               full width between the pillars.
    lotus      clear from 22.7% to 79.4% across and 15.1% to 63.7% down: inside
               the ring, above the two lotuses that lean in at the bottom
    paisley    clear from 30.5% to 69.3% across between the two paisleys, from
               26% to 72% down between the two rows of scrollwork
    varmala    the wide garland. Clear from 29% down, under the tassels that
               hang from its top, to 64%, where it is clear from 25% to 76.5%
               across; wider above that

  `width` is not read for these: the opening sizes the frame to the room it
  has (NamesOpening). It is the most the frame is ever drawn at.
*/
const ART: Record<NamesFrame, NamesFrameArt> = {
  jharokha: art("jharokha", 760 / 549, { x: 0.13, y: 0.52, width: 0.74, height: 0.45 }),
  lotus: art("lotus", 760 / 703, { x: 0.24, y: 0.16, width: 0.54, height: 0.465 }),
  paisley: art("paisley", 760 / 445, { x: 0.31, y: 0.265, width: 0.38, height: 0.445 }),
  varmala: art("varmala", 760 / 507, { x: 0.28, y: 0.31, width: 0.44, height: 0.33 }),
};

function art(name: string, aspect: number, words: FrameArt["words"]): NamesFrameArt {
  return {
    src: `/decor/names-frames/${name}.webp`,
    thumb: `/decor/names-frames/thumbs/${name}.webp`,
    aspect,
    width: 340,
    words,
  };
}

/**
 * Absent from every card saved before there was a choice, and from every card
 * whose host has not made one: a missing or unknown value is the lotus ring.
 */
export function namesFrameOf(value: unknown): NamesFrame {
  return NAMES_FRAMES.find((option) => option.id === value)?.id ?? DEFAULT_NAMES_FRAME;
}

export function namesFrameArt(frame: NamesFrame): NamesFrameArt {
  return ART[frame];
}
