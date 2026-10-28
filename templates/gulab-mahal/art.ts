/**
 * Gulab Mahal's artwork: where each picture is, and the measurements the
 * card is laid out from.
 *
 * Every file is a WebP cut from the supplied artwork (the originals are kept
 * out of the site, in /gulab mahal/ at the repository's root). The petals are
 * the one strip of four, sliced: petal-1 small dusty pink, petal-2 medium
 * blush, petal-3 large blush, petal-4 large ivory. The rose corner carries its
 * own soft shadow, painted into it, 40px to its left and below.
 */
const DIR = "/templates/gulab-mahal";

export const ART = {
  /* The velvet every page and the cover are set on: one file, decoded once, shown a different way on each page. */
  velvet: `${DIR}/velvet-bg.webp`,
  envelopeBody: `${DIR}/envelope-body.webp`,
  envelopeFlap: `${DIR}/envelope-flap.webp`,
  seal: `${DIR}/seal-rose.webp`,
  petals: [
    `${DIR}/petal-1.webp`,
    `${DIR}/petal-2.webp`,
    `${DIR}/petal-3.webp`,
    `${DIR}/petal-4.webp`,
  ],
  cameo: `${DIR}/cameo-frame.webp`,
  corner: `${DIR}/rose-corner.webp`,
  scrollRoll: `${DIR}/scroll-roll.webp`,
  scrollPaper: `${DIR}/scroll-paper.webp`,
  coupleTag: `${DIR}/couple-tag.webp`,
  eventCard: `${DIR}/event-card.webp`,
  letterPaper: `${DIR}/letter-paper.webp`,
  envelope: `${DIR}/envelope-rsvp.webp`,
  venueArch: `${DIR}/venue-arch.webp`,
  box: `${DIR}/box-empty.webp`,
  lid: `${DIR}/lid.webp`,
  bow: `${DIR}/bow.webp`,
  /* Each object's soft shadow, made from its own outline by scripts/gulab-shadows.mjs. */
  shadow: {
    envelope: `${DIR}/shadow-envelope-body.webp`,
    seal: `${DIR}/shadow-seal-rose.webp`,
    roll: `${DIR}/shadow-scroll-roll.webp`,
    paper: `${DIR}/shadow-scroll-paper.webp`,
    tag: `${DIR}/shadow-couple-tag.webp`,
    eventCard: `${DIR}/shadow-event-card.webp`,
    cameo: `${DIR}/shadow-cameo-frame.webp`,
    letter: `${DIR}/shadow-letter-paper.webp`,
    arch: `${DIR}/shadow-venue-arch.webp`,
    box: `${DIR}/shadow-box-empty.webp`,
  },
} as const;

/*
  Where an object's shadow goes, as CSS for an absolutely placed picture in the
  object's own box: the shadow picture is the object's outline with PAD of its
  width added on every side (scripts/gulab-shadows.mjs uses the same PAD), set
  `drop` of the object's width lower, so it falls beneath and a little below.
*/
const SHADOW_PAD = 0.14;

export function shadowBox(
  aspect: number,
  drop = 0.035,
): { left: string; width: string; top: string; height: string } {
  const percent = (share: number): string => `${(share * 100).toFixed(2)}%`;

  return {
    left: percent(-SHADOW_PAD),
    width: percent(1 + SHADOW_PAD * 2),
    top: percent((-SHADOW_PAD + drop) * aspect),
    height: percent(1 + SHADOW_PAD * 2 * aspect),
  };
}

/** The petals' own sizes, width over height, as cut. */
export const PETAL_ASPECT: readonly number[] = [184 / 209, 230 / 257, 305 / 316, 277 / 297];

/**
 * What the cover waits for before it shows: the velvet and the rose corners
 * it is set with, the envelope's three pictures, the letter that comes out of it
 * and the four petals the seal bursts into, and nothing of the card's. (The fonts are waited for by the shell.)
 */
export const COVER_IMAGES: readonly string[] = [
  ART.velvet,
  ART.corner,
  ART.envelopeBody,
  ART.envelopeFlap,
  ART.seal,
  ART.letterPaper,
  ...ART.petals,
];

/*
  THE ENVELOPE, measured off the supplied pictures (1536x1024 each) and laid
  out in shares of the body's box, which everything is placed in.

  The body is cropped to x 45..1492, y 79..958 (1448x880), which leaves out
  the stray specks the picture had above and below it; its edges are at
  x 48..1489 and y 80..956 within that.

  The flap is 1487px across at its widest (x 26..1512) against the body's
  1442, and its top edge is row 211 where the body's is row 80. Its picture is
  cut to x 25..1513, y 210..801 (1489x592) and scaled by 1442/1487 = 0.9697,
  then put so that its top edge lies on the body's and its sides on the
  body's sides. Its tip is at (758, 800) in its own picture.
*/
const BODY = { left: 45, top: 79, width: 1448, height: 880 };
const FLAP_CUT = { left: 25, top: 210, width: 1489, height: 592 };
const FLAP_SCALE = 1442 / 1487;

/** The body's own shape. */
export const BODY_ASPECT = BODY.width / BODY.height;

const across = (x: number): number => (x - BODY.left) / BODY.width;
const down = (y: number): number => (y - BODY.top) / BODY.height;

/** The flap's box, in shares of the body's: its top edge on the body's top edge, as wide as the body. */
export const FLAP_BOX = {
  left: across(48 - (26 - FLAP_CUT.left) * FLAP_SCALE),
  top: down(80 - (211 - FLAP_CUT.top) * FLAP_SCALE),
  width: (FLAP_CUT.width * FLAP_SCALE) / BODY.width,
  height: (FLAP_CUT.height * FLAP_SCALE) / BODY.height,
};

/** The flap's tip, where the seal is pressed. */
export const FLAP_TIP = {
  x: across(48 + (758 - 26) * FLAP_SCALE),
  y: down(80 + (800 - 211) * FLAP_SCALE),
};

/*
  The front of the pocket: the pink panels in front of the lining, which the
  letter goes down behind. Its top is the edge where the lining stops, found
  column by column (the lining is ivory, the panels pink), from the left side
  down the side panel to where it meets the bottom panel, down to the V's
  lowest point and up again the same way; raised 3px everywhere, so a pixel
  of doubt hides a sliver of lining rather than showing the letter over the
  pocket's rose-gold edge.
*/
const POCKET_EDGE: readonly (readonly [number, number])[] = [
  [45, 283], [120, 310], [240, 378], [360, 463], [450, 525], [470, 550],
  [545, 574], [605, 591], [665, 605], [725, 634], [760, 643], [815, 628],
  [875, 612], [935, 592], [995, 563], [1065, 550], [1080, 528], [1140, 477],
  [1200, 439], [1260, 397], [1320, 361], [1380, 323], [1440, 296], [1492, 280],
];

const percent = (share: number): string => `${(share * 100).toFixed(2)}%`;

/** The clip for the body's second copy: the pocket alone. */
export const POCKET_CLIP = `polygon(${[
  ...POCKET_EDGE.map(([x, y]) => `${percent(across(x))} ${percent(down(y - 3))}`),
  "100% 100%",
  "0% 100%",
].join(", ")})`;

/*
  The lining, which the closed flap does not wholly cover: the art leaves a
  strip of it between the flap's edges and the pocket's. The cover lays the
  flap's own paper over it, cut to this shape: the body's box above the
  pocket's edge, reaching 6px under the pocket so no hairline is left between
  them.
*/
export const LINING_CLIP = `polygon(${[
  "0% 0%",
  "100% 0%",
  ...[...POCKET_EDGE].reverse().map(([x, y]) => `${percent(across(x))} ${percent(down(y + 6))}`),
].join(", ")})`;

/** The V's lowest point, which the letter waits below. */
export const POCKET_DEPTH = down(643);

/**
 * The seal (cut to 1222x1182 from 1254x1254), and its blank disc, where the
 * initials go: centred at (617, 591) of the cut, 325px across its radius.
 */
export const SEAL_ASPECT = 1222 / 1182;
export const SEAL_DISC = { x: 617 / 1222, y: 591 / 1182, radius: 325 / 1222 };

/**
 * The scroll's roll (1100x209): its finials are at either end, and the paper
 * that comes off it is 80% of its width, from the middle of its cylinder.
 */
export const ROLL_ASPECT = 1100 / 209;
export const ROLL_PAPER = 0.8;

/**
 * The couple's tag (560x1161): it hangs from the top of its ribbon, 50.4%
 * across, and its roses reach 48% down its left side. Its words go below them
 * and inside its rose-gold border, measured off the picture.
 */
export const TAG_ASPECT = 560 / 1161;
export const TAG_PIVOT = 0.504;
export const TAG_BOX = { top: 0.48, bottom: 0.07, side: 0.11 } as const;

/** A function's card (800x1117): its roses reach 27% down its middle; its words go under them, inside its border. */
export const EVENT_CARD_ASPECT = 800 / 1117;
export const EVENT_CARD_BOX = { top: 0.27, bottom: 0.08, side: 0.1 } as const;

/**
 * The venue's garden arch (640x981): its opening, clear of its roses and the
 * vines that hang from its crown, measured off the picture, is from 23% to
 * 77% across and 32% to 88% down. The ivory panel fills a little more than
 * that, behind the arch's posts; the words keep to WORDS.
 */
export const ARCH_ASPECT = 640 / 981;
export const ARCH_PANEL = { top: 0.215, bottom: 0.055, side: 0.19 } as const;
export const ARCH_WORDS = { top: 0.33, bottom: 0.13, side: 0.245 } as const;

/*
  The gift box (page 9), measured off its pictures, all three 900 across but
  the bow: the open box (900x499) has its front rim 240 down; the lid
  (900x445) sits with its front band's foot 40 below that rim, so 165 above
  the box's top; the bow (700x608, 45% of the box across) has its knot a
  third of the way down it, on the middle of the lid's top. In shares of the
  box's width.
*/
export const BOX_ASPECT = 900 / 499;
export const GIFT = {
  lidTop: -165 / 900,
  lidHeight: 445 / 900,
  bowWidth: 0.45,
  bowTop: (-165 + 157) / 900 - 0.45 * (608 / 700) * 0.33,
  /* The opening, where the petals come from: the middle of the rim. */
  openingY: 120 / 900,
} as const;

/** The letter's own shape (800x1064). */
export const LETTER_ASPECT = 800 / 1064;

/** The cameo's own shape (800x1200). */
export const CAMEO_ASPECT = 800 / 1200;

/**
 * Where the words go inside the cameo, as shares of the picture.
 *
 * Measured off the file, row by row, where the ivory satin runs: it is an
 * oval centred at 50% across and 48.6% down, 74% of the picture across at its
 * widest (y 50%), from about 17% down to 80%, with the roses of the foot
 * cutting into it from 70.8% down on the left. The box is the band from 21.5%
 * to 69.5% down and 17% in from each side, which is inside the satin at its
 * middle with 4% to spare; near its top and its foot the oval is narrower than
 * the box (about 44% of the picture across at 21.5%, 52% at 69.5%), so the first
 * lines and the last are held narrower too (`CAMEO_LINES`). Checked with the
 * words filling the box, in English and Hindi, long names too: every line
 * keeps at least 12px of satin either side on a 360px phone.
 */
export const CAMEO_BOX = {
  top: 0.215,
  bottom: 1 - 0.695,
  side: 0.17,
} as const;

/** How wide each kind of line may be, as a share of the box, by where in the oval it sits. */
export const CAMEO_LINES = {
  /* The title, the first line, where the oval is 46% of the picture across. */
  top: 0.58,
  /* The invitation line, a little below it: its first line can sit as high as 26% down. */
  upper: 0.74,
  /* The date, the last line, where the oval is about 60% across. */
  foot: 0.74,
} as const;
