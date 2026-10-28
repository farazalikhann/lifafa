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
 *   telegram-slip   760 x 323. The ruled panel inside the blue border runs
 *                   5% to 95% across and 15% to 90% down.
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
  pigeonReply: `${DIR}/pigeon-reply.webp`,
  desk: `${DIR}/writing-desk.webp`,
  paper: `${DIR}/paper.webp`,
  telegram: `${DIR}/telegram-slip.webp`,
  telegramSmall: `${DIR}/telegram-slip-small.webp`,
  postcard: `${DIR}/venue-postcard.webp`,
  clock: `${DIR}/clock.webp`,
  garland: `${DIR}/garland-corner.webp`,
  dateSlip: `${DIR}/date-slip.webp`,
} as const;

/*
  THE DATE SLIP ON THE COVER: three telegram tickets in a strip, one for each
  panel, until the slip drawn for it (22-date-slip) is in. To use it, publish
  it with scripts/dak-ghar-art.py and set this to "strip": the slip becomes
  that one picture, its three panels set in thirds down it.
*/
export const DATE_SLIP = "telegram" as "telegram" | "strip";

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
  ART.garland,
  ART.desk,
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
 * English or Hindi: haldi, mehendi, sangeet and the wedding itself have their
 * own; a reception, and anything else, the palace by the lake.
 */
export type StampKind = "haldi" | "mehendi" | "sangeet" | "wedding" | "lake";

export function stampFor(label: string): StampKind {
  const name = label.toLowerCase();

  if (/haldi|हल्दी/.test(name)) return "haldi";
  if (/mehndi|mehendi|mehandi|henna|मेहंदी|मेंहदी/.test(name)) return "mehendi";
  if (/sangeet|sangit|संगीत/.test(name)) return "sangeet";
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
  lake: `${DIR}/stamp-palace-lake.webp`,
};

/* Each stamp's shape (they differ a little). */
export const STAMP_ASPECT: Readonly<Record<StampKind, number>> = {
  haldi: 480 / 723,
  mehendi: 480 / 713,
  sangeet: 480 / 720,
  wedding: 480 / 723,
  lake: 480 / 707,
};
