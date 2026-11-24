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
