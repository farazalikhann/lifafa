/**
 * Dak Ghar's artwork, published by scripts/dak-ghar-art.py from the PNGs in
 * "dak ghar/" (each cut to its own art and saved as WebP at about twice what
 * a 430px phone shows), and where things are in it.
 *
 * Measured off the published files, as shares of each picture:
 *
 *   post-box.webp   400 x 1000. The slot's opening runs 25% to 73% across,
 *                   centre 49%, from 29.9% to 32.1% down; the slip comes out
 *                   of its lower lip. The brass plate is 26.5% to 73.5%
 *                   across and 45.2% to 55.1% down: the initials go there.
 *   clock.webp      460 x 495. The centre pin, where the hands turn, is at
 *                   50% across and 50% down.
 *   letter-paper    760 x 1127. Keep words inside 12% to 88% each way,
 *                   clear of the paisley corners and the border.
 *   wax-seal        260 x 264. Its flat disc, where the initials go, is
 *                   29% to 72% across and 26% to 65% down, centre 50%, 45%.
 *   telegram-slip   760 x 323. The ruled panel inside the blue border runs
 *                   5% to 95% across and 15% to 90% down.
 *   date-slip       420 x 1375. Three framed panels, 9.5% to 90.5% across:
 *                   4.6% to 52.4% down, 56.3% to 74.2%, 77.8% to 95.6%.
 *   venue-postcard  780 x 504. The painting is the left 55%; the address
 *                   lines are 58% to 96% across, 45% to 82% down, under the
 *                   stamp box (85% to 96% across, 6% to 30% down).
 */
const DIR = "/templates/dak-ghar";

export const ART = {
  scene: `${DIR}/cover-scene.webp`,
  postBox: `${DIR}/post-box.webp`,
  bougainvillea: `${DIR}/bougainvillea.webp`,
  letter: `${DIR}/letter-paper.webp`,
  pigeon: `${DIR}/pigeon.webp`,
  desk: `${DIR}/writing-desk.webp`,
  paper: `${DIR}/paper.webp`,
  telegram: `${DIR}/telegram-slip.webp`,
  telegramSmall: `${DIR}/telegram-slip-small.webp`,
  postcard: `${DIR}/venue-postcard.webp`,
  clock: `${DIR}/clock.webp`,
  garland: `${DIR}/garland-corner.webp`,
  dateSlip: `${DIR}/date-slip.webp`,
  waxSeal: `${DIR}/wax-seal.webp`,
  airmail: `${DIR}/airmail-envelope.webp`,
  groom: `${DIR}/groom.webp`,
  bride: `${DIR}/bride.webp`,
  calendar: `${DIR}/desk-calendar.webp`,
  plane: `${DIR}/paper-plane.webp`,
  note: `${DIR}/thank-you-note.webp`,
  letters: `${DIR}/letters-bundle.webp`,
} as const;

/*
  THE DATE SLIP ON THE COVER: the slip drawn for it (22-date-slip, a tall
  strip of three framed panels, 420 x 1375), its panels measured in the
  stylesheet (`.stripTop` and on). "telegram" is the stand-in it replaced:
  three telegram tickets in a strip, one for each panel.
*/
export const DATE_SLIP = "strip" as "telegram" | "strip";

/**
 * What the cover waits for, decoded, before the guest may tap: every picture
 * in the cover, its opening, and the first page the opening lands on.
 */
export const COVER_IMAGES: readonly string[] = [
  ART.scene,
  ART.postBox,
  ART.bougainvillea,
  ART.pigeon,
  DATE_SLIP === "strip" ? ART.dateSlip : ART.telegramSmall,
  ART.paper,
  ART.letter,
  ART.waxSeal,
  ART.desk,
  ART.airmail,
];

/** The post box: its picture's shape, its slot and its brass plate (see above). */
export const POST_BOX = {
  aspect: 400 / 1000,
  slot: { left: 0.25, right: 0.73, top: 0.299, bottom: 0.321 },
  plate: { left: 0.265, right: 0.735, top: 0.452, bottom: 0.551 },
} as const;

export const TELEGRAM_ASPECT = 760 / 323;

/**
 * Which postage stamp a function is drawn on, by what it is called, in
 * English or Hindi: haldi, mehendi, sangeet, the wedding itself and the
 * reception (a banquet hall) have their own; anything else, the palace by
 * the lake.
 */
export type StampKind = "haldi" | "mehendi" | "sangeet" | "wedding" | "reception" | "lake";

export function stampFor(label: string): StampKind {
  const name = label.toLowerCase();

  if (/haldi|हल्दी/.test(name)) return "haldi";
  if (/mehndi|mehendi|mehandi|henna|मेहंदी|मेंहदी/.test(name)) return "mehendi";
  if (/sangeet|sangit|संगीत/.test(name)) return "sangeet";
  if (/reception|रिसेप्शन|स्वागत समारोह|प्रीतिभोज/.test(name)) return "reception";
  if (/wedding|shaadi|shadi|vivah|vivaah|phere|pheras|marriage|nikah|anand karaj|विवाह|शादी|फेरे|परिणय/.test(name)) {
    return "wedding";
  }

  return "lake";
}

export const STAMP_ART: Readonly<Record<StampKind, string>> = {
  haldi: `${DIR}/stamp-haldi.webp`,
  mehendi: `${DIR}/stamp-mehendi.webp`,
  sangeet: `${DIR}/stamp-sangeet.webp`,
  wedding: `${DIR}/stamp-wedding.webp`,
  reception: `${DIR}/stamp-reception.webp`,
  lake: `${DIR}/stamp-palace-lake.webp`,
};

/* Each stamp's shape (they differ a little). */
export const STAMP_ASPECT: Readonly<Record<StampKind, number>> = {
  haldi: 480 / 723,
  mehendi: 480 / 713,
  sangeet: 480 / 720,
  wedding: 480 / 723,
  reception: 480 / 711,
  lake: 480 / 707,
};
