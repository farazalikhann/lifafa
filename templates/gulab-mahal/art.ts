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
  ground: `${DIR}/gulab-bg.webp`,
  rose: `${DIR}/rose-top.webp`,
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
} as const;

/** The petals' own sizes, width over height, as cut. */
export const PETAL_ASPECT: readonly number[] = [184 / 209, 230 / 257, 305 / 316, 277 / 297];

/** The rose's own shape (640x620). */
export const ROSE_ASPECT = 640 / 620;

/**
 * What the cover waits for before it shows: the rose and the four petals that
 * open from behind it, and nothing of the card's. (The fonts are waited for
 * by the shell.)
 */
export const COVER_IMAGES: readonly string[] = [ART.rose, ...ART.petals];

/** The cameo's own shape (800x1200). */
export const CAMEO_ASPECT = 800 / 1200;

/**
 * Where the words go inside the cameo, as shares of the picture.
 *
 * Measured off the file, row by row, where the ivory satin runs: it is an
 * oval centred at 50% across and 48.6% down, 74% of the picture across at its
 * widest (y 50%), from about 17% down to 80%, with the roses of the foot
 * cutting into it from 70.8% down on the left. The box is the band from 22.5%
 * to 69% down and 17% in from each side, which is inside the satin at its
 * middle with 4% to spare; near its top and its foot the oval is narrower than
 * the box (46% of the picture across at 22.5%, 60% at 69%), so the first and
 * the last lines are held narrower too (`CAMEO_LINES`).
 */
export const CAMEO_BOX = {
  top: 0.225,
  bottom: 1 - 0.69,
  side: 0.17,
} as const;

/** How wide each kind of line may be, as a share of the box, by where in the oval it sits. */
export const CAMEO_LINES = {
  /* The title, the first line, where the oval is 46% of the picture across. */
  top: 0.58,
  /* The invitation line, a little below it. */
  upper: 0.84,
  /* The date, the last line, where the oval is about 60% across. */
  foot: 0.74,
} as const;
