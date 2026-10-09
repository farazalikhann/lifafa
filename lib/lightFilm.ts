/**
 * A cover played from a film that ends in plain light: the curtains part, or
 * the envelope opens, on a golden light that grows until the whole frame is
 * one flat colour, and the card comes out of that colour.
 *
 * ONE FILM FOR EVERY CARD. Such a film does not end on the card, or on a
 * backdrop to fade through, so the same footage hands over to a cream card
 * and to an ink one. Only the hand-over's length differs.
 *
 * What is here is what the films share: the shape of one, and how long one
 * is waited for. Each film's own numbers, and how it was cut, are in its own
 * file. LightFilmCover plays any of them.
 */

import type { CoverArt, CoverFilmTiming } from "@/types/coverAnimation";

export interface LightFilm {
  mp4: string;
  webm: string;
  /**
   * The same film at 480x854, a third of the weight, for a connection the
   * full one would not cross in time. The same frames, the same length and
   * the same flat last colour, so everything measured on the film holds for
   * both. MP4 only: it is for phones, and every phone plays it.
   */
  mp4Small?: string;
  /** The first frame: the cover closed. What is shown until it is tapped. */
  poster: string;
  /** The film's own length, in milliseconds. */
  lengthMs: number;
  /** From when every frame is the flat light and nothing else. */
  lightAtMs: number;
  /** When the light starts to fill the frame, and how long it takes to. */
  glowAtMs: number;
  glowMs: number;
  /** The flat colour of the film's last frames, as a browser decodes them. */
  light: string;
  /** The film's own edge colour: what stands beside it on a wide screen until the light comes. */
  surround: string;
  /** How long the light takes to give way to a light card, and to a dark one. */
  fadeMs: number;
  fadeToDarkMs: number;
  /** How long the film holds still before anything in it moves; its sound waits as long. */
  soundDelayMs: number;
  /**
   * The blank place the couple's initials are lettered on, a wax seal or a
   * medallion: its centre and the width of its clear face, in shares of the
   * frame's width (and its height, for the centre's y). Absent for a film
   * with none.
   */
  mark?: { x: number; y: number; width: number };
  /** The initials' ink: lit edge, body, shade, and the shadow that cuts them in. */
  ink?: { hi: string; body: string; lo: string; shadow: string };
  /**
   * For a film with no cover drawn in code to fall back to: how long its
   * still takes to give way to the card when the film cannot play.
   */
  plainFadeMs?: number;
  /**
   * For a film whose words are set at its foot: the colour of the band laid
   * under them, six hex digits, solid at the foot and thinning upwards. It
   * goes with the words on the tap.
   */
  band?: string;
}

/**
 * How long a film still on its way is waited for after the tap, on its still
 * and a small shimmer, before the cover drawn in code opens instead.
 */
export const LIGHT_FILM_WAIT_MS = 2500;

/** How long a film that is in hand is given, once asked, to put its first frame on screen. */
export const LIGHT_FILM_START_MS = 1000;

/** How long past its own length a film that started is given to reach the light. */
export const LIGHT_FILM_STALL_MS = 1500;

/**
 * A film that stops short of the light is not left on its stopped frame: the
 * frame gives way to the light in this long, and the light to the card.
 */
export const LIGHT_FILM_CUT_MS = 350;

/**
 * How long the full film is given to arrive, from the cover appearing, before
 * its download is dropped for the small one's.
 */
export const LIGHT_FILM_SWITCH_MS = 2000;

/** A connection slower than this, in megabits a second, is sent the small film from the start. */
export const LIGHT_FILM_SMALL_BELOW_MBPS = 1.5;

/** The light takes this long to leave a light card, and this long a dark one. */
export const LIGHT_FADE_MS = 800;
export const LIGHT_FADE_TO_DARK_MS = 1100;

/**
 * The shell's timers for such a cover are a net, not the clock. The visual
 * follows the film itself and retimes the shell when the film reaches the
 * light, or when the drawn cover opens in its place; see LightFilmCover. This
 * is the longest any of that can take: the wait, the start, the film, its
 * grace and the slower of the two fades. Whatever else happens, the shell
 * takes the cover down when it has run out.
 */
export function lightFilmTiming(film: LightFilm): () => CoverFilmTiming {
  const netMs =
    LIGHT_FILM_WAIT_MS +
    LIGHT_FILM_START_MS +
    film.lengthMs +
    LIGHT_FILM_STALL_MS +
    LIGHT_FILM_CUT_MS +
    film.fadeToDarkMs;
  const timing: CoverFilmTiming = {
    durationMs: netMs,
    revealAt: 1 - film.fadeToDarkMs / netMs,
    soundDelayMs: film.soundDelayMs,
  };

  return () => timing;
}

/**
 * What the shell needs before such a cover is shown: the film's first frame
 * and nothing else, with the inks that read over it.
 */
export function lightFilmArt(film: LightFilm, inks: Omit<CoverArt, "images">): () => CoverArt {
  const art: CoverArt = { images: [film.poster], ...inks };

  return () => art;
}
