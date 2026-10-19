/**
 * Sheesh Mahal's artwork: where each picture is, and the measurements the
 * card is laid out from.
 *
 * Every file is a WebP made from the supplied artwork (the originals, their
 * previews and NOTES.md, which every measurement here is taken from, are kept
 * out of the site in /sheesh mahal/ at the repository's root).
 */
const DIR = "/templates/sheesh-mahal";

export const ART = {
  /* The palace wall, opaque but for its doorway, which is truly transparent. */
  wall: `${DIR}/wall.webp`,
  doorLeft: `${DIR}/door-left.webp`,
  doorRight: `${DIR}/door-right.webp`,
  /* Not on the cover since 19 Oct; kept for a room that may want it. */
  diya: `${DIR}/diya.webp`,
  /* The hall behind the doors, and page 2's ground: its dark oval for the names is painted in. */
  hall: `${DIR}/hall.webp`,
  jharokhaMoon: `${DIR}/jharokha-moon.webp`,
  jharokhaFrame: `${DIR}/jharokha-frame.webp`,
  functionCard: `${DIR}/function-card.webp`,
  farmaan: `${DIR}/farmaan.webp`,
  kandeel: `${DIR}/kandeel.webp`,
} as const;

/** What the cover waits for before it shows (the fonts are waited for by the shell). */
export const COVER_IMAGES: readonly string[] = [
  ART.wall,
  ART.doorLeft,
  ART.doorRight,
  ART.hall,
];

/*
  THE WALL, 1024x1536. Its doorway runs from x 280 to 744 (centre 512), its
  top tip at y 466, with straight sides from about y 700 to the foot.

  THE DOOR, two halves of 400x1360, seam at the inner edge. The whole door is
  650/1024 of the wall's width, centred (x 187 to 837), its foot on the
  wall's foot, and behind the wall: each half is 325 wall pixels across and so
  1105 tall, its top at y 431, above the doorway's tip, and about 92 pixels of
  it hidden behind the jamb, where the hinges are. Each turns about its outer
  edge. Everything below is a share of the wall's own box.
*/
export const WALL_ASPECT = 1024 / 1536;
const WALL_W = 1024;
const WALL_H = 1536;
const HALF_W = 325;
const HALF_H = (1360 * HALF_W) / 400;

export const DOOR = {
  /** The left half's left edge, and each half's width, in shares of the wall's width. */
  left: (WALL_W - 2 * HALF_W) / 2 / WALL_W,
  width: HALF_W / WALL_W,
  /** Each half's top and height, in shares of the wall's height. */
  top: (WALL_H - HALF_H) / WALL_H,
  height: HALF_H / WALL_H,
} as const;

/** The doorway's middle, which the camera moves in through, as shares of the wall. */
export const DOORWAY_FOCUS = { x: 0.5, y: 0.66 } as const;

/*
  The medallion on the seam, at the height of the two ring handles (their
  rings hang at about 0.53 of the door's height, y 1020 on the wall). Small:
  0.078 of the wall across, just over the inner edges of the rings.
*/
export const MEDALLION = {
  x: 0.5,
  y: 1020 / WALL_H,
  size: 0.078,
} as const;

/** The hall (864x1296): its dark oval for words runs 24% to 66% down; the names keep to 30% to 58%. */
export const HALL_ASPECT = 864 / 1296;
export const HALL_WORDS = { top: 0.3, bottom: 0.58 } as const;

/*
  THE GLINTS: small stars of light on the mirror-work, made from a written
  sequence so every card has the same constellation.

  Each is placed in shares of its layer's box, sized as a share of its width,
  and belongs to one of four groups by which side of the middle it is on
  (0 left, 1 right, 2 above, 3 below), which is what the phone's tilt
  brightens. `core` ones are kept on a narrow phone; the rest are left off
  under 400px.
*/
export interface Glint {
  x: number;
  y: number;
  /** Width, as a share of the layer's width. */
  size: number;
  group: 0 | 1 | 2 | 3;
  /** Its own twinkle: how long, and how far into it it starts. */
  period: number;
  phase: number;
  core: boolean;
}

/** The van der Corput sequence in base `b`: spread evenly, never clumped. */
function radical(index: number, base: number): number {
  let result = 0;
  let fraction = 1 / base;

  for (let n = index; n > 0; n = Math.floor(n / base)) {
    result += (n % base) * fraction;
    fraction /= base;
  }

  return result;
}

function groupOf(x: number, y: number, aspect: number): Glint["group"] {
  const dx = x - 0.5;
  const dy = (y - 0.5) / aspect;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx < 0 ? 0 : 1;
  }

  return dy < 0 ? 2 : 3;
}

function constellation(
  count: number,
  core: number,
  area: { x0: number; x1: number; y0: number; y1: number },
  keep: (x: number, y: number) => boolean,
  aspect: number,
): readonly Glint[] {
  const glints: Glint[] = [];

  for (let index = 1; glints.length < count && index < 2000; index += 1) {
    const x = area.x0 + radical(index, 2) * (area.x1 - area.x0);
    const y = area.y0 + radical(index, 3) * (area.y1 - area.y0);

    if (!keep(x, y)) {
      continue;
    }

    const n = glints.length;
    glints.push({
      x,
      y,
      size: 0.036 + radical(index, 5) * 0.04,
      group: groupOf(x, y, aspect),
      period: 3.4 + radical(index, 7) * 2.6,
      phase: radical(index, 11),
      core: n < core,
    });
  }

  return glints;
}

/*
  The wall's: forty, off the doorway (and so off the doors) and within the wall's middle 76%, which is what a phone
  shows of it; twenty-six on a narrow phone.
*/
export const WALL_GLINTS = constellation(
  40,
  26,
  { x0: 0.12, x1: 0.88, y0: 0.04, y1: 0.96 },
  (x, y) => {
    const inDoorway = x > 0.255 && x < 0.745 && y > 0.27;
    return !inDoorway;
  },
  WALL_ASPECT,
);

/*
  The hall's, on page 2: on the arches above the oval, the mirrored walls to
  either side of it and the polished floor below, never over the words (the
  oval, 22% to 68% down), the top band the page's buttons use, or the
  "Swipe up" at the foot.
*/
export const HALL_GLINTS = constellation(
  28,
  18,
  { x0: 0.04, x1: 0.96, y0: 0.12, y1: 0.86 },
  (x, y) => {
    const overWords = y > 0.2 && y < 0.7 && x > 0.14 && x < 0.86;
    const overHint = y > 0.8 && x > 0.3 && x < 0.7;
    return !overWords && !overHint;
  },
  HALL_ASPECT,
);

/** Where the ripple of light starts on the wall: the medallion the guest tapped. */
export const RIPPLE_FROM = { x: MEDALLION.x, y: MEDALLION.y } as const;
