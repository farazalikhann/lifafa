/**
 * The opening covers' films: real footage of each cover opening, a dark one
 * for a dark card and a light one for a light card.
 *
 * HOW THEY WERE CUT, since nothing in the repo runs at build time and the
 * next person to replace one needs the numbers. Every source is 1080x1920 at
 * 24fps, eight seconds long. Each is trimmed to about 0.3s of stillness, the
 * action, and where it ends; the sound is dropped; and nothing is cropped or
 * rescaled, so the subject is where the source put it.
 *
 * The generator's mark, a pale four-pointed star at x 864-936, y 1704-1776 in
 * all of them, is taken out in place. It is white laid over the picture at an
 * opacity that can be measured per pixel where it sits on black, so what was
 * under it is worked back out exactly, (seen - 255a) / (1 - a), and only the
 * hairline of its outline is filled in from either side. Blurring over it
 * (ffmpeg's delogo) left a smudge on the curtain's hem; that is kept for the
 * envelope and the gatefold alone, where the corner is plain backdrop.
 *
 *   -vf "trim=start_frame=A:end_frame=B,setpts=N/24/TB" -an
 *   mp4:  -c:v libx264 -profile:v high -preset slow -crf 20+ -pix_fmt yuv420p
 *         -movflags +faststart      (crf raised a step at a time to fit 2 MB)
 *   webm: -c:v libvpx-vp9 -b:v 0 -crf 30+ two-pass
 *   poster: the first frame, WebP at quality 85
 *
 * The frames each was trimmed to are beside it below. Every time and place in
 * this file was measured on the published film, and is that film's own: the
 * dark and the light of one cover are different footage and do not share
 * numbers.
 */

import type { CoverArt, CoverFilmTiming } from "@/types/coverAnimation";

/** Where something is in the film's frame, as shares of its width and height. */
interface FramePoint {
  x: number;
  y: number;
}

export interface CoverFilm extends CoverFilmTiming {
  /** The film's own length, in milliseconds. It is never played past its fade. */
  lengthMs: number;
  mp4: string;
  webm: string;
  /** The first frame: the cover closed. What is shown until it is tapped. */
  poster: string;
  /**
   * When the film starts to fade out so the card shows through it, and for
   * how long, in milliseconds from its start.
   */
  fadeStartMs: number;
  fadeMs: number;
  /** The flat colour round the film on a screen wider than it. */
  surround: string;
  /**
   * The blank place the couple's initials are lettered on — a seal, an oval,
   * a medallion — as its centre and the width of its clear face, in shares of
   * the frame's width (and its height, for the centre's y). Absent for a
   * cover with none.
   */
  mark?: FramePoint & { width: number };
  /** The initials' ink: lit edge, body, shade, and the shadow that seats them. */
  ink?: { hi: string; body: string; lo: string; shadow: string };
  /**
   * For a film whose last frame holds a blank card: the point the film grows
   * about as it fades, and by how much, so the blank card swells to fill the
   * screen as the real one comes through it.
   */
  grow?: FramePoint & { scale: number };
}

/** How the initials leave when the cover is tapped. */
type MarkExit = "fade" | "drift" | "drop";

export interface CoverFilmSet {
  dark: CoverFilm;
  light: CoverFilm;
  markExit?: MarkExit;
}

/**
 * One film, from where its files are and what was measured on it.
 *
 * The open is over when the film has faded out, not when the film ends: what
 * is left of it after that is its own backdrop, which nobody is shown, and a
 * card kept waiting under an invisible layer is a card that cannot be touched.
 * So the shell's length is the end of the fade, and the card is let go as the
 * fade starts.
 */
function film(
  folder: string,
  name: string,
  spec: Omit<CoverFilm, "mp4" | "webm" | "poster" | "durationMs" | "revealAt">,
): CoverFilm {
  const durationMs = spec.fadeStartMs + spec.fadeMs;

  return {
    mp4: `/decor/${folder}/${name}.mp4`,
    webm: `/decor/${folder}/${name}.webm`,
    poster: `/decor/${folder}/${name}-poster.webp`,
    durationMs,
    revealAt: spec.fadeStartMs / durationMs,
    ...spec,
  };
}

/* The inks. Warm gold on dark things; a deeper one where the ground is pale; and cut into gold where the ground is gold. */
const GOLD = {
  hi: "#F8E7B0",
  body: "#E6C273",
  lo: "#8F6420",
  shadow: "0 0.04em 0.06em rgba(40, 4, 6, 0.75)",
};
const DEEP_GOLD = {
  hi: "#B8862F",
  body: "#8A5E12",
  lo: "#5E3F08",
  shadow: "0 0.03em 0 rgba(255, 255, 255, 0.7)",
};
const ENGRAVED = {
  hi: "#9A7222",
  body: "#6B4708",
  lo: "#4A3005",
  shadow: "0 0.045em 0 rgba(255, 238, 178, 0.8), 0 -0.02em 0.03em rgba(58, 34, 0, 0.45)",
};

const BLACK = "#000000";
/** The light films' backdrop at its edges, which is what stands beside one on a wide screen. */
const IVORY = "#EFE0C8";

/*
  No curtain here. The curtain cover was a film too, and is not any more: it
  is two panels of cloth drawn over the card, so the card shows between them
  as they part. See lib/curtainArt.ts.
*/

/*
  ENVELOPE. Dark: frames 17-127 (0.71s to 5.33s): the seal breaks at 0.3s, the
  flap is open by 2.3s and the card is out by 4.55s. Light: frames 17-107
  (0.71s to 4.50s): seal at 0.3s, flap open by 2.3s, card out by 3.55s.

  The film's last frames hold a blank card standing out of the envelope. It
  is grown about that card's middle as it fades, so the blank card swells to
  the screen while the real one comes through it.

  The sound's wax crackle is its first 0.3s, so it waits for the seal. Its
  flap and its slide are quicker than either film's and run ahead of them
  from there; an offset can line up one moment, and the seal is the one.

  The seal's face is 125px across in the dark film and 148px in the light.
*/
export const ENVELOPE_FILMS: CoverFilmSet = {
  dark: film("envelope-video", "envelope-dark", {
    lengthMs: 4625,
    fadeStartMs: 3500,
    fadeMs: 1050,
    soundDelayMs: 300,
    surround: BLACK,
    mark: { x: 525 / 1080, y: 1010 / 1920, width: 125 / 1080 },
    ink: GOLD,
    grow: { x: 0.5, y: 0.49, scale: 2.3 },
  }),
  light: film("envelope-video", "envelope-light", {
    lengthMs: 3790,
    fadeStartMs: 2800,
    fadeMs: 950,
    soundDelayMs: 300,
    surround: IVORY,
    mark: { x: 534 / 1080, y: 1086 / 1920, width: 148 / 1080 },
    ink: GOLD,
    grow: { x: 0.5, y: 0.47, scale: 2.3 },
  }),
  markExit: "fade",
};

/*
  No petal dust here either: that cover is the breeze now, drawn over the
  card. See lib/breezeArt.ts.
*/

/*
  FOLD. Dark: frames 13-91 (0.54s to 3.83s): the ribbon starts down at 0.3s
  and is gone by 1.7s, and the doors swing from 1.45s to 2.95s. Light: frames
  17-95 (0.71s to 4.00s): ribbon 0.3s to 1.55s, doors 1.3s to 3.05s. In both
  the doors open almost together, the left a quarter of a second ahead. The
  film fades while they swing.

  The sound has its two doors at 0.4s and 0.6s and its chime at 1.35s, so it
  is held until its doors meet the film's.

  The medallion's face is 152px across in the dark film and 124px in the light.
*/
export const FOLD_FILMS: CoverFilmSet = {
  dark: film("fold-video", "fold-dark", {
    lengthMs: 3290,
    fadeStartMs: 1900,
    fadeMs: 1250,
    soundDelayMs: 1050,
    surround: BLACK,
    mark: { x: 540 / 1080, y: 1000 / 1920, width: 150 / 1080 },
    ink: ENGRAVED,
  }),
  light: film("fold-video", "fold-light", {
    lengthMs: 3290,
    fadeStartMs: 1800,
    fadeMs: 1350,
    soundDelayMs: 900,
    surround: IVORY,
    mark: { x: 538 / 1080, y: 1074 / 1920, width: 122 / 1080 },
    ink: ENGRAVED,
  }),
  markExit: "drop",
};

/** The film for a card whose ground is light, or dark. */
export function filmFor(set: CoverFilmSet, isLight: boolean): CoverFilm {
  return isLight ? set.light : set.dark;
}

/* What the shell prints its prompt and Skip in, over each kind of film. */
const ON_DARK = {
  ink: "#FBF4E6",
  inkMuted: "rgba(251, 244, 230, 0.86)",
  plaque: "rgba(30, 8, 12, 0.78)",
  plaqueEdge: "#D9B25F",
  plaqueInk: "#F1D38A",
};
const ON_LIGHT = {
  ink: "#4A3410",
  inkMuted: "rgba(74, 52, 16, 0.9)",
  plaque: "rgba(255, 251, 240, 0.9)",
  plaqueEdge: "#C2913A",
  plaqueInk: "#80560F",
};

/**
 * What the shell needs of a filmed cover: the one picture that must be in
 * before it is shown — the chosen film's first frame, and never the other's —
 * and the inks that read over it.
 */
export function filmArt(set: CoverFilmSet): (isLight: boolean) => CoverArt {
  const dark: CoverArt = { images: [set.dark.poster], ...ON_DARK };
  const light: CoverArt = { images: [set.light.poster], ...ON_LIGHT };

  return (isLight) => (isLight ? light : dark);
}

/** The film's timings, as the shell runs to them. */
export function filmTiming(set: CoverFilmSet): (isLight: boolean) => CoverFilmTiming {
  return (isLight) => filmFor(set, isLight);
}
