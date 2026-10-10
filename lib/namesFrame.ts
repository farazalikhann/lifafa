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

  MEASURED ON THE PUBLISHED FILES, as the largest upright box of clear pixels
  that holds the picture's middle, and then brought in a little on every side
  for air, so a name that fills its box still stands off the artwork:

    jharokha   clear from 18.3% to 81.6% across between the pillars, and from
               34.1% down, under the lowest cusp of the arch and its marigold
               swag, to the foot of the picture
    lotus      clear from 22.5% to 77.5% across and 13.1% to 64.5% down: inside
               the ring, above the two lotuses that lean in at the bottom
    paisley    clear from 28.3% to 71.6% across between the two paisleys and
               27% to 71.7% down between the two rows of scrollwork
    varmala    clear from 22.5% to 77.9% across and 21.7% to 65.8% down: inside
               the garland, under the tassels that hang from its top

  `width` is not read for these: the opening sizes the frame to the room it
  has (NamesOpening). It is the most the frame is ever drawn at.
*/
const ART: Record<NamesFrame, NamesFrameArt> = {
  jharokha: art("jharokha", 659 / 900, { x: 0.2, y: 0.36, width: 0.6, height: 0.6 }),
  lotus: art("lotus", 760 / 703, { x: 0.24, y: 0.15, width: 0.52, height: 0.48 }),
  paisley: art("paisley", 760 / 445, { x: 0.3, y: 0.285, width: 0.4, height: 0.415 }),
  varmala: art("varmala", 670 / 900, { x: 0.245, y: 0.235, width: 0.51, height: 0.405 }),
};

function art(name: string, aspect: number, words: FrameArt["words"]): NamesFrameArt {
  return {
    src: `/decor/names-frames/${name}.webp`,
    thumb: `/decor/names-frames/thumbs/${name}.webp`,
    aspect,
    width: 300,
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
