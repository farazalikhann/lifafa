/**
 * Emerald Shahi's artwork: where each picture is, and where the things in
 * the two envelope pictures are.
 *
 * THE TWO ENVELOPES ARE NOT DRAWN ALIKE. Both files are 1200x800, but the
 * closed envelope fills its picture and the open one sits small in the lower
 * middle of its own, under its raised flap. Measured off the files (the box of
 * each envelope's body, by its opaque pixels and the line where the flap
 * meets it):
 *
 *   closed   body x 36 to 1163, y 83 to 719     1127 x 636
 *   open     body x 179 to 1021, y 320 to 776    842 x 456
 *
 * So the cover lays out one box, the body, and places each picture round it
 * so that its own body is exactly that box: the closed picture scaled by
 * 1/1127 of the box's width, the open one by 1/842 across and 1/456 down. The
 * two bodies then lie on each other edge for edge, and the crossfade between
 * them moves nothing but the flap. (The open body is 4% squatter than the
 * closed one, so it is stretched that much taller; nothing in it is round.)
 */
const DIR = "/templates/emerald-shahi";

export const ART = {
  ground: `${DIR}/emerald-bg.webp`,
  envelopeClosed: `${DIR}/envelope-closed.webp`,
  envelopeOpen: `${DIR}/envelope-open.webp`,
  seal: `${DIR}/seal-gold.webp`,
  floral: `${DIR}/floral-corner.webp`,
} as const;

/** What the cover waits for before it shows: its own pictures, and nothing of the card's. */
export const COVER_IMAGES: readonly string[] = [
  ART.ground,
  ART.envelopeClosed,
  ART.envelopeOpen,
  ART.seal,
];

const PICTURE = { width: 1200, height: 800 };
const CLOSED_BODY = { left: 36, top: 83, width: 1127, height: 636 };
const OPEN_BODY = { left: 179, top: 320, width: 842, height: 456 };

/** The body's own shape, which the cover's box takes. */
export const BODY_ASPECT = CLOSED_BODY.width / CLOSED_BODY.height;

interface Placement {
  left: string;
  top: string;
  width: string;
  height: string;
}

/** A picture's place, in percentages of the body's box, that puts its body on the box. */
function placed(body: typeof CLOSED_BODY): Placement {
  const percent = (value: number): string => `${(value * 100).toFixed(3)}%`;

  return {
    left: percent(-body.left / body.width),
    top: percent(-body.top / body.height),
    width: percent(PICTURE.width / body.width),
    height: percent(PICTURE.height / body.height),
  };
}

export const CLOSED_PLACEMENT = placed(CLOSED_BODY);
export const OPEN_PLACEMENT = placed(OPEN_BODY);

/**
 * The point of the closed flap, where the seal sits: (600, 550) in the closed
 * picture, as a share of the body's box.
 */
export const FLAP_POINT = {
  x: (600 - CLOSED_BODY.left) / CLOSED_BODY.width,
  y: (550 - CLOSED_BODY.top) / CLOSED_BODY.height,
};

/**
 * The ivory card drawn inside the open envelope, as shares of the body's box:
 * its sides and its top edge, and the V of the pocket in front of it, which
 * runs from each side at `shoulder` down to `point` in the middle. The card
 * that rises out of the envelope starts exactly on this one and is cut off
 * along that V, so it leaves from behind the pocket.
 */
const inOpen = (x: number, y: number): { x: number; y: number } => ({
  x: (x - OPEN_BODY.left) / OPEN_BODY.width,
  y: (y - OPEN_BODY.top) / OPEN_BODY.height,
});

export const LETTER = {
  left: inOpen(250, 0).x,
  right: inOpen(945, 0).x,
  top: inOpen(0, 228).y,
  shoulder: inOpen(0, 352).y,
  point: inOpen(598, 592),
};
