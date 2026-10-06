import { calligraphyAspect } from "@/lib/calligraphy";
import { calligraphyOrnament, imageOrnament } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { JainOrnamentId } from "@/types/jainOrnament";

/**
 * The Jain ornament pack: six pictures and five lines of calligraphy.
 *
 * All six were line drawings in the card's accent: the toran, the kalash, the
 * ahimsa hand, the swastika, the Siddhashila and the lotus. They are pictures
 * now, published to public/decor/jain/ under the ids the drawings had: a card
 * saved with any of them loads as it always did and shows the picture.
 *
 * EACH PICTURE HAS A PLACE, and is drawn there and nowhere else: see `slots`
 * on the Jain pack in lib/traditionPacks.tsx. The toran hangs across the top
 * of the card. The swastika, the ahimsa hand and the Siddhashila are emblems
 * of the faith, not decoration to be sprinkled: they stand above the names,
 * one at a time, and none of them is ever scattered behind the writing, stood
 * at the foot of the card or put where petals fall over it. The kalash and the
 * lotus stand in the two bottom corners.
 *
 * THE SWASTIKA IS UPRIGHT, ITS ARMS BENDING CLOCKWISE, AND MUST STAY SO. So
 * are the hand and the Siddhashila (`uprightOnly`): mirroring or turning any
 * of them makes a different symbol. The swastika's picture carries the
 * crescent and the dots that stand over it in the Jain emblem.
 *
 * NO FIGURE IS DRAWN. No Tirthankara, no human, no face. The ahimsa hand is
 * the conventional open palm bearing a wheel, which is an emblem rather than
 * a person: there is no arm, no wrist, no body and no face.
 *
 * No Devanagari is drawn by hand here. The greetings and blessings are text,
 * in lib/jainContent.ts, where they are reviewed and can be corrected. The
 * calligraphy is supplied artwork, read against its text before it was
 * published; see lib/calligraphy.ts.
 */

/* ---------------------------------------------------------------------------
   The pictures
   --------------------------------------------------------------------------- */

/** The published files, and each one's width over its height. */
const PICTURES = {
  tornGate: { src: "/decor/jain/toran.webp", aspect: 1000 / 397 },
  kalash: { src: "/decor/jain/kalash.webp", aspect: 554 / 640 },
  ahimsaHand: { src: "/decor/jain/ahimsa-hand.webp", aspect: 425 / 640 },
  swastika: { src: "/decor/jain/swastika.webp", aspect: 432 / 640 },
  siddhaShila: { src: "/decor/jain/siddhashila.webp", aspect: 720 / 558 },
  lotus: { src: "/decor/jain/lotus.webp", aspect: 680 / 617 },
} as const;

const TornGate = imageOrnament(PICTURES.tornGate.src, PICTURES.tornGate.aspect);
const Kalash = imageOrnament(PICTURES.kalash.src, PICTURES.kalash.aspect);
const AhimsaHand = imageOrnament(PICTURES.ahimsaHand.src, PICTURES.ahimsaHand.aspect);
const Swastika = imageOrnament(PICTURES.swastika.src, PICTURES.swastika.aspect);
const SiddhaShila = imageOrnament(PICTURES.siddhaShila.src, PICTURES.siddhaShila.aspect);
const Lotus = imageOrnament(PICTURES.lotus.src, PICTURES.lotus.aspect);

/* ---------------------------------------------------------------------------
   Calligraphy
   --------------------------------------------------------------------------- */

/**
 * The five Devanagari lines, from the shared factory in lib/ornaments/frame.tsx.
 * lib/calligraphy.ts holds their files and what each says.
 */
const JaiJinendra = calligraphyOrnament("jainJaiJinendra");
const ShubhVivah = calligraphyOrnament("jainShubhVivah");
const MangalParinay = calligraphyOrnament("jainMangalParinay");
const NamoArihantanam = calligraphyOrnament("jainNamoArihantanam");
const ShriMahaviraya = calligraphyOrnament("jainShriMahaviraya");

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/** Each ornament's width over its height, from its published file. */
export const JAIN_ORNAMENT_ASPECT: Record<JainOrnamentId, number> = {
  ahimsaHand: PICTURES.ahimsaHand.aspect,
  swastika: PICTURES.swastika.aspect,
  lotus: PICTURES.lotus.aspect,
  siddhaShila: PICTURES.siddhaShila.aspect,
  kalash: PICTURES.kalash.aspect,
  tornGate: PICTURES.tornGate.aspect,
  /* Not viewBoxes: the published crop of each line's file. */
  jainJaiJinendra: calligraphyAspect("jainJaiJinendra"),
  jainShubhVivah: calligraphyAspect("jainShubhVivah"),
  jainMangalParinay: calligraphyAspect("jainMangalParinay"),
  jainNamoArihantanam: calligraphyAspect("jainNamoArihantanam"),
  jainShriMahaviraya: calligraphyAspect("jainShriMahaviraya"),
};

/** One ornament offered in the editor. The same shape as HinduOrnamentEntry. */
export interface JainOrnamentEntry {
  id: JainOrnamentId;
  /** Shown under the chip in the editor. Latin script only. */
  label: string;
  Component: Ornament;
  /** What `size` the editor's chip preview renders this at. */
  chipSize: number;
  /** Whether this ornament may only be placed in the card's top region. */
  topRegionOnly: boolean;
  /** The published file, for the card to preload. Absent for the calligraphy, which is a mask. */
  src?: string;
  /** Never mirrored and never turned: an emblem, not a pattern. */
  uprightOnly?: boolean;
  /** How tall it stands above the names, in card px, where the usual 60 is too small to read. */
  aboveNamesHeight?: number;
  /** How tall it stands in a bottom corner, in card px, in place of the usual 64. */
  cornerHeight?: number;
}

/**
 * The pack, in the order the editor lays out its chips. Every picture has a
 * place on the card (see `slots` on the Jain pack) and the editor groups them
 * by place, whatever their order here; the calligraphy comes last and has a
 * group of its own.
 */
export const JAIN_ORNAMENTS: readonly JainOrnamentEntry[] = [
  {
    id: "tornGate",
    label: "Toran gate",
    Component: TornGate,
    chipSize: 84,
    topRegionOnly: true,
    src: PICTURES.tornGate.src,
  },
  {
    id: "swastika",
    label: "Swastika",
    Component: Swastika,
    chipSize: 44,
    topRegionOnly: true,
    src: PICTURES.swastika.src,
    /* Upright and clockwise or it is not this symbol. */
    uprightOnly: true,
    /* Tall and narrow, with the crescent and dots over it: at 60px the dots are specks. */
    aboveNamesHeight: 104,
  },
  {
    id: "ahimsaHand",
    label: "Ahimsa hand",
    Component: AhimsaHand,
    chipSize: 44,
    topRegionOnly: true,
    src: PICTURES.ahimsaHand.src,
    uprightOnly: true,
    /* The wheel in the palm has to read as a wheel. */
    aboveNamesHeight: 100,
  },
  {
    id: "siddhaShila",
    label: "Siddhashila",
    Component: SiddhaShila,
    chipSize: 50,
    topRegionOnly: true,
    src: PICTURES.siddhaShila.src,
    uprightOnly: true,
    aboveNamesHeight: 80,
  },
  {
    id: "kalash",
    label: "Kalash",
    Component: Kalash,
    chipSize: 44,
    topRegionOnly: false,
    src: PICTURES.kalash.src,
    /* A pot under a tall coconut: at the usual 64 the pot itself is 40px. */
    cornerHeight: 84,
  },
  {
    id: "lotus",
    label: "Lotus",
    Component: Lotus,
    chipSize: 46,
    topRegionOnly: false,
    src: PICTURES.lotus.src,
  },
  ...(
    [
      ["jainJaiJinendra", "Jai Jinendra", JaiJinendra],
      ["jainShubhVivah", "Shubh Vivah", ShubhVivah],
      ["jainMangalParinay", "Mangal Parinay", MangalParinay],
      ["jainNamoArihantanam", "Namo Arihantanam", NamoArihantanam],
      ["jainShriMahaviraya", "Shri Mahaviraya Namah", ShriMahaviraya],
    ] as const
  ).map(([id, label, Component]) => ({
    id,
    label,
    Component,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 120,
    topRegionOnly: true,
  })),
];

/** Sits under the ornament grid in the editor. */
export const JAIN_ORNAMENTS_NOTE =
  "Each has its own place on your card. Tap one again to take it off.";
