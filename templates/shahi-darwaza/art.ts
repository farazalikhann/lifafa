/**
 * Shahi Darwaza's artwork: where each picture is, and where the things the
 * opening needs are in them.
 *
 * THE DOOR, THE FILM AND THE COURTYARD ARE ONE FRAME. door-closed.webp is the
 * film's first frame and courtyard-inside.webp its last, all three 1080 by
 * about 1935, so each is laid in the same box with object-fit: cover and the
 * film starts on the door and ends on the courtyard with nothing moving
 * between them. The card's hero lays the courtyard in a box of the same
 * width and the screen's height, so the cover fades onto the same picture.
 *
 * THE KEY hangs by its cord from the top of key-cutout.webp (600 by 1761);
 * its tip, the end of the shaft, is at 43% across and the foot of the
 * picture. The keyhole is at 56.2% across and 52.4% down the door.
 */
const DIR = "/decor/shahi-darwaza";

export const ART = {
  key: `${DIR}/key-cutout.webp`,
  door: `${DIR}/door-closed.webp`,
  courtyard: `${DIR}/courtyard-inside.webp`,
  film: `${DIR}/opening-10s-720.mp4`,
  filmPoster: `${DIR}/opening-firstframe.jpg`,
  paper: `${DIR}/paper-bg.webp`,
  garland: `${DIR}/garland-divider.webp`,
  rsvpScroll: `${DIR}/rsvp-scroll.webp`,
  roseCorner: `${DIR}/rose-corner.webp`,
  /* envelope.webp in two: its pocket, and its flap with the seal (see ENVELOPE below). */
  envelopePocket: `${DIR}/envelope-pocket.webp`,
  envelopeFlap: `${DIR}/envelope-flap.webp`,
  waxSeal: `${DIR}/wax-seal.webp`,
  letterPaper: `${DIR}/letter-paper.webp`,
  archFrame: `${DIR}/arch-frame.webp`,
  silkThread: `${DIR}/silk-thread.webp`,
  venuePalace: `${DIR}/venue-palace.webp`,
  nightCourtyard: `${DIR}/night-courtyard.webp`,
  quill: `${DIR}/quill.webp`,
} as const;

/**
 * The envelope, measured off envelope.webp (900 by 736): its body is x 160 to
 * 896 and y 5 to 552, with three petals on the table to its lower left. The
 * picture is cut in two along a V from the body's top corners (y 62) down to
 * (528, 452), under the seal and its shadow: envelope-pocket.webp is below
 * the V and envelope-flap.webp above it, the seal included. Laid on each
 * other they are the picture whole; the flap fades and the pocket stays.
 *
 * Everything is placed as a share of the body's width, B: the picture is
 * 900/736 B wide and exactly B tall, its left edge 160/736 B left of the body.
 */
export const ENVELOPE = {
  /** The picture's width, its left edge, and where the body starts down it, in B. */
  width: 900 / 736,
  left: -160 / 736,
  bodyTop: 5 / 736,
  bodyBottom: 552 / 736,
  /** The pocket's top corners and its V's point, down from the picture's top, in B. */
  pocketCorner: 62 / 736,
  pocketPoint: 452 / 736,
  /** The seal: its centre across and down, and its width, in B. */
  seal: { x: (528 - 160) / 736, y: 308 / 736, size: 196 / 736 },
} as const;

/**
 * What the cover waits for before it shows: the key and the door behind it,
 * and nothing else. The film, its poster and the courtyard are asked for
 * once the cover is up (see Cover.tsx).
 */
export const COVER_IMAGES: readonly string[] = [ART.key, ART.door];

/** The door's picture, and the film's, which is the same frame. */
export const DOOR = { width: 1080, height: 1935 } as const;

/** The keyhole, as shares of the door picture. */
export const KEYHOLE = { x: 0.562, y: 0.524 } as const;

/** The key picture's width over its height. */
export const KEY_ASPECT = 600 / 1761;

/** The key's tip, as shares of its picture: the transform origin it is scaled and turned about. */
export const KEY_TIP = { x: 0.43, y: 0.997 } as const;

/**
 * Where a point of the door picture is drawn, in the box it is laid in with
 * object-fit: cover (centred), as pixels from the box's corner.
 */
export function coverPoint(
  box: { width: number; height: number },
  point: { x: number; y: number },
): { x: number; y: number } {
  const scale = Math.max(box.width / DOOR.width, box.height / DOOR.height);
  const drawnWidth = DOOR.width * scale;
  const drawnHeight = DOOR.height * scale;

  return {
    x: (box.width - drawnWidth) / 2 + point.x * drawnWidth,
    y: (box.height - drawnHeight) / 2 + point.y * drawnHeight,
  };
}
