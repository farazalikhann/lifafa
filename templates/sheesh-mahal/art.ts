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
  /* The hall behind the doors, and page 2's ground: its dark oval for the names is painted in. */
  hall: `${DIR}/hall.webp`,
  jharokhaMoon: `${DIR}/jharokha-moon.webp`,
  jharokhaFrame: `${DIR}/jharokha-frame.webp`,
  functionCard: `${DIR}/function-card.webp`,
  /* Page 6: a lake palace at night, across the water. */
  venueNight: `${DIR}/venue-night.webp`,
  farmaan: `${DIR}/farmaan.webp`,
  kandeel: `${DIR}/kandeel.webp`,
} as const;

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

/*
  PAGE 3, THE MOON (jharokha-moon.webp, 864x1296, opaque). The moon's centre
  is 49.9% across and 27.5% down, its radius 18% of the picture's width; its
  craters are faint, so the date is written straight on it. The dark
  mirror-work wall for the countdown is from about 80% to 92% down, under
  the ledge with the diyas (70% to 72%).
*/
export const MOON_ASPECT = 864 / 1296;
export const MOON = { x: 0.499, y: 0.275, r: 0.18 } as const;

/*
  PAGE 4, THE JHAROKHA (jharokha-frame.webp, 560x862), transparent outside
  the frame and in its window. Every box is a share of the picture's own.

  The window: its arch's tip at 30.4% down, the railing's top at 72.7%, its
  sides at 21.9% and 77.8%; measured row by row, it is about 31% to 69%
  across at 38% down, 25% to 75% from 42% and 20% to 80% from 60%.

  `text` is where the words may go: under the arch's cusps and inside the
  sides all the way down. `panel` is the ivory behind them, a little larger
  than the window so the frame hides its edges. `shutters` are the two
  halves of the cover's door (400x1360 each) as a pair a little wider than
  the window, their tops just above the arch's tip, behind the frame, which
  hides their outer edges; they are cut off at the railing's top bar. Each
  half is a third of the picture's width across, and so 0.729 of its height
  tall.
*/
export const JHAROKHA_ASPECT = 560 / 862;
export const JHAROKHA = {
  text: { top: 0.405, bottom: 0.71, left: 0.27, right: 0.73 },
  panel: { top: 0.295, bottom: 0.74, left: 0.185, right: 0.815 },
  shutters: { top: 0.295, bottom: 0.74, left: 0.17, right: 0.83 },
  /** Each half's height, as a share of the picture's height. */
  shutterHeight: (0.33 * 560 * (1360 / 400)) / 862,
} as const;

/*
  Page 4's glints, a few: on the night at either edge, and lower down on the
  jharokha's outer pillars, whose mirror work they catch. Never over the name
  above it (the top third, across), the words in its window (the middle),
  the dots and the hint under it, nor the top band the page's buttons use.
*/
export const COUPLE_GLINTS = constellation(
  18,
  11,
  { x0: 0.02, x1: 0.98, y0: 0.12, y1: 0.95 },
  (x, y) => {
    const atEdge = x < 0.08 || x > 0.92;
    const onPillars = y > 0.4 && y < 0.85 && (x < 0.2 || x > 0.8);
    const overDots = y > 0.86 && x > 0.3 && x < 0.7;
    return (atEdge || onPillars) && !overDots;
  },
  0.5,
);

/*
  PAGE 5, THE CELEBRATIONS. The hall again, nearer than page 2 and higher:
  its corridor's far end (the vanishing point, HALL_FAR, in shares of the
  picture) a little above the room's middle.

  THE FUNCTION CARD (function-card.webp, 600x968), transparent outside its
  arch. `words` is the safe area on the ivory, below the lantern and inside
  the border; `lantern` is the lantern's glass, its centre and how wide a
  glow over it is, as a share of the card's width.
*/
export const HALL_FAR = { x: 0.5, y: 0.6 } as const;
export const FUNCTION_CARD_ASPECT = 600 / 968;
export const FUNCTION_CARD = {
  words: { top: 0.32, bottom: 0.88, left: 0.2, right: 0.8 },
  lantern: { x: 0.498, y: 0.19, size: 0.34 },
} as const;

/*
  PAGE 6, THE VENUE (venue-night.webp, 864x1296, opaque). The sky, dark and
  calm, is the top third; the palace is from 35.5% (the dome's finial) to 58%
  down, its reflection on the lake from 58% to 85%, brightest in narrow
  columns under its lit arches; the floating diyas are at either edge, from
  68% to 88% down. Every place is a share of the picture's own box.
*/
export const VENUE_ASPECT = 864 / 1296;
/* How far down the room the panel may reach: never over the palace. */
export const VENUE_SKY = 0.36;
/* The reflection's brightest columns: centre, width, and its own time to rise and fall. */
export const VENUE_SHIMMER = [
  { x: 0.3, width: 0.06, top: 0.6, bottom: 0.8, period: 5.2, delay: -1.3 },
  { x: 0.42, width: 0.07, top: 0.59, bottom: 0.83, period: 6.6, delay: -3.9 },
  { x: 0.5, width: 0.08, top: 0.58, bottom: 0.86, period: 4.4, delay: -0.4 },
  { x: 0.61, width: 0.065, top: 0.6, bottom: 0.82, period: 5.9, delay: -2.6 },
] as const;
/* The floating diyas' flames, and each one's own flicker. */
export const VENUE_DIYAS = [
  { x: 0.025, y: 0.682, size: 0.07, period: 3.1, delay: -0.7 },
  { x: 0.061, y: 0.758, size: 0.08, period: 3.7, delay: -2.2 },
  { x: 0.077, y: 0.87, size: 0.1, period: 2.9, delay: -1.4 },
  { x: 0.957, y: 0.712, size: 0.08, period: 3.4, delay: -0.2 },
  { x: 0.876, y: 0.828, size: 0.09, period: 4.1, delay: -2.9 },
] as const;
/*
  Small stars in the sky, outside the panel: down either edge beside it, and
  in the sky either side of the palace's dome. In shares of the room, not the
  picture, as the panel is placed in the room.
*/
export const VENUE_STARS = [
  { x: 0.035, y: 0.16, period: 3.6, delay: -0.4 },
  { x: 0.958, y: 0.13, period: 4.4, delay: -2.1 },
  { x: 0.05, y: 0.27, period: 5.1, delay: -3.3 },
  { x: 0.965, y: 0.24, period: 3.9, delay: -1.2 },
  { x: 0.03, y: 0.33, period: 4.7, delay: -2.8 },
  { x: 0.945, y: 0.32, period: 5.5, delay: -0.9 },
  { x: 0.12, y: 0.37, period: 4.2, delay: -1.8 },
  { x: 0.24, y: 0.385, period: 5.8, delay: -4.1 },
  { x: 0.8, y: 0.372, period: 3.8, delay: -2.5 },
  { x: 0.9, y: 0.392, period: 4.9, delay: -0.6 },
] as const;

/*
  THE FARMAAN (farmaan.webp, 600x880), pages 7 and 8: a three-slice. Its top
  19% (the rod and the top ornaments) and its foot from 82% down are kept at
  their own size and only the plain paper between is stretched, never
  sideways. Each slice's height as a share of the farmaan's width; the words
  keep to 20% to 80% across.
*/
export const FARMAAN = {
  top: (0.19 * 880) / 600,
  foot: (0.18 * 880) / 600,
  side: 0.2,
} as const;

/*
  Page 7's glints, a few, slow: on the wall's mirror-work down either edge,
  beside the farmaan, never over it, nor the heading at the top.
*/
export const DETAILS_GLINTS = constellation(
  12,
  8,
  { x0: 0.01, x1: 0.99, y0: 0.14, y1: 0.96 },
  (x) => x < 0.055 || x > 0.945,
  0.5,
);

/* The kandeel (kandeel.webp, 400x447): a lantern, its glass about 58% down. */
export const KANDEEL_ASPECT = 400 / 447;

/*
  PAGE 9, THE LANTERNS rising over the lake palace: a written table, twelve,
  the last four left off under 400px. Where across each rises (a share of the
  room's width), how wide (px), how long one rise takes (s) and how far into
  it the page finds it (a share of the rise), spread so the sky is never
  empty and never crowded, and no two ever pass over each other on a phone
  360 to 480 wide (found by a search over two minutes of their rising);
  each sways at its own pace. A small one is a far
  one, and dimmer.
*/
export const LANTERNS = [
  { x: 0.81, size: 30, rise: 15, at: 0.98, sway: 5.2 },
  { x: 0.52, size: 48, rise: 26, at: 0.9, sway: 6.1 },
  { x: 0.37, size: 44, rise: 26, at: 0.49, sway: 4.6 },
  { x: 0.85, size: 56, rise: 16, at: 0.92, sway: 6.8 },
  { x: 0.46, size: 38, rise: 25, at: 0.56, sway: 5.7 },
  { x: 0.64, size: 70, rise: 26, at: 0.31, sway: 4.9 },
  { x: 0.31, size: 52, rise: 24, at: 0.7, sway: 6.4 },
  { x: 0.14, size: 64, rise: 22, at: 0.02, sway: 5.4 },
  /* The four a narrow phone goes without. */
  { x: 0.18, size: 32, rise: 23, at: 0.55, sway: 5.0 },
  { x: 0.09, size: 34, rise: 24, at: 0.72, sway: 6.3 },
  { x: 0.89, size: 80, rise: 15, at: 0.07, sway: 5.9 },
  { x: 0.71, size: 28, rise: 26, at: 0.57, sway: 4.4 },
] as const;

/* Page 9's glints, flashed once together as its words have come in: on the palace's arches and its reflection. */
export const THANKS_GLINTS = constellation(
  14,
  10,
  { x0: 0.12, x1: 0.88, y0: 0.4, y1: 0.8 },
  (x, y) => y < 0.56 || (x > 0.3 && x < 0.7),
  VENUE_ASPECT,
);

/** Where the ripple of light starts on the wall: the medallion the guest tapped. */
export const RIPPLE_FROM = { x: MEDALLION.x, y: MEDALLION.y } as const;
