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
}

/** How long a film is waited for after the tap, before the cover drawn in code opens instead. */
export const LIGHT_FILM_WAIT_MS = 1500;

/** How long past its own length a film that started is given to reach the light. */
export const LIGHT_FILM_STALL_MS = 1500;

/** The light takes this long to leave a light card, and this long a dark one. */
export const LIGHT_FADE_MS = 800;
export const LIGHT_FADE_TO_DARK_MS = 1100;

/**
 * The shell's timers for such a cover are a net, not the clock. The visual
 * follows the film itself and retimes the shell when the film reaches the
 * light, or when the drawn cover opens in its place; see LightFilmCover. This
 * is the longest any of that can take: the wait, the film, its grace and the
 * slower of the two fades.
 */
export function lightFilmTiming(film: LightFilm): () => CoverFilmTiming {
  const netMs = LIGHT_FILM_WAIT_MS + film.lengthMs + LIGHT_FILM_STALL_MS + film.fadeToDarkMs;
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
