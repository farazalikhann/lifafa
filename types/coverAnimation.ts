/**
 * The opening animations a host can put on the front of an invite card.
 *
 * The ids below are written into saved cards in the database. Once a card has
 * been created with one of them, that id must never be renamed or removed:
 * a saved row keeps its literal string, and dropping the value it names would
 * leave that card pointing at an animation that no longer exists. Adding a new
 * id is safe. Changing an old one is not.
 */

import type { CoverSoundId } from "@/lib/coverSound";
import type { CardLanguage } from "@/types/card";

/** Every opening animation the card knows how to play. */
export type CoverAnimationId =
  | "none"
  | "envelope-seal"
  | "curtain-reveal"
  | "fold-unfold"
  | "petal-dust"
  | "rose-bloom";

/**
 * The pictures a cover is drawn from, when it is drawn from pictures, and the
 * colours that read over them.
 *
 * A cover made of the card's own two colours takes its inks from the card. One
 * made of photographed cloth cannot: the card's text colour was chosen against
 * the card's ground, not against velvet, so the artwork brings its own. Every
 * ink is optional, because artwork that leaves the card's ground showing under
 * the words — an envelope sitting on it — has nothing to bring: the card's own
 * inks still read there.
 */
export interface CoverArt {
  /**
   * Every picture the closed cover shows. They are on the first screen a guest
   * sees, so the shell asks for them as the page loads and keeps its loader up
   * until they are in; see CoverShell.
   */
  images: readonly string[];
  /**
   * Whether the artwork is dark or light, for artwork that is the same on
   * every card. The words over a cover are seated on a shadow of the opposite
   * tone; without this the shell takes the card's own tone, which is right
   * for artwork chosen to match the card and wrong for dark velvet over a
   * cream one.
   */
  tone?: "dark" | "light";
  /**
   * Where "You are invited", the names and the prompt are set. At the head,
   * with the prompt near the foot, on every cover unless it says otherwise:
   * each keeps its seal or medallion at the middle and the head clear. "foot"
   * is for artwork whose subject is the middle and the head both, a rose,
   * where the lower third is the clear ground: the words are set there, with
   * the prompt under them.
   */
  wordsAt?: "head" | "foot";
  /** Skip and the focus ring, over the artwork. */
  ink?: string;
  inkMuted?: string;
  /** The small plaque the prompt sits on, its hairline, and the prompt itself. */
  plaque?: string;
  plaqueEdge?: string;
  plaqueInk?: string;
  /** The prompt under the drawing, when it is printed on the card's ground: a gold that reads there. */
  promptInk?: string;
}

/**
 * How a cover runs when it is played from a film of the real thing, in place
 * of the option's own timings, which are those of the cover drawn in code.
 */
export interface CoverFilmTiming {
  /** From the tap to the film having faded right out, in milliseconds. */
  durationMs: number;
  /** When the card is let go under the film, as a share of `durationMs`. */
  revealAt: number;
  /**
   * How long after the tap the cover's sound starts, in milliseconds. A film
   * holds still for a moment before anything in it moves, and the sound was
   * made for a cover that moves on the tap.
   */
  soundDelayMs: number;
}

/** One opening animation, as offered in the designer and played for a guest. */
export interface CoverAnimationOption {
  id: CoverAnimationId;
  /** Name shown to the host in the designer. */
  label: string;
  /** One short line explaining what the effect does. */
  description: string;
  /**
   * A small square picture of the cover, shown beside its name in the
   * designer's picker, for a cover whose name alone does not say what a
   * guest will see.
   */
  thumbnail?: string;
  /**
   * The invitation printed on the closed cover, for example "Tap seal to open",
   * in each language a card can be written in.
   *
   * Here beside the animation rather than in lib/cardLanguage.ts, because the
   * prompt describes this one drawing — a seal, curtains, petals — and a new
   * cover should not be addable without saying what a guest does to it.
   * Empty for "none", which has no cover to tap.
   */
  openPromptText: Readonly<Record<CardLanguage, string>>;
  /** Total length of the open animation, in milliseconds. */
  durationMs: number;
  /**
   * When the card starts to show through, as a share of `durationMs`.
   *
   * The card's first screen is let go at this moment and settles into place
   * while the cover is still leaving it — under the letter as the envelope
   * falls away, between the curtains as they part. Waiting for the cover to
   * finish instead is what made opening an invitation feel like loading a
   * page: the cover dissolved onto a card with no words on it, and the words
   * then arrived one line at a time.
   *
   * Each visual's own timings decide it, so it is written beside the duration
   * those timings are shares of. Zero for "none", which opens on the card.
   */
  revealAt: number;
  /**
   * When the card's own petal burst is thrown, as a share of `durationMs`,
   * for a cover where that is not the moment the card is let go. The petal
   * dust cover is itself a gust of petals: the card's burst thrown into the
   * middle of it would be lost in it, so it follows as the gust ends. Absent,
   * the burst goes with `revealAt`, as it does for every other cover.
   */
  burstAt?: number;
  /**
   * The recording the cover plays when a guest taps it open, fetched and
   * decoded before the tap; see lib/coverSound.ts. Null for a cover that opens
   * in silence, which is what "none" does because there is nothing to open.
   *
   * NOT AN ID THE DATABASE EVER SEES. Unlike the animation id above, this is a
   * property of the animation rather than a choice a host saves, so it can be
   * changed, retuned or dropped without a stored row meaning anything different.
   */
  sound: CoverSoundId | null;
  /**
   * A tick of the phone's motor as the cover is tapped open, in milliseconds:
   * the seal giving way under a thumb. Android only — an iPhone has no
   * `navigator.vibrate` — and never under reduced motion. Absent for none.
   */
  haptic?: number;
  /** Whether the effect has a static fallback for reduced motion. */
  supportsReducedMotion: boolean;
  /**
   * What the closed cover prints, and on what. "ground" is every cover's unless
   * it says otherwise: the names, a rule and the prompt, on the card's own
   * ground under the drawing. "plaque" is for a cover whose artwork fills the
   * screen, where there is no ground to print on: the prompt alone, in the
   * card's heading face, on a small plaque of its own near the foot. "visual"
   * is for a cover whose artwork has a place made for the words — an empty
   * oval — where the visual letters the prompt itself and the shell prints
   * nothing; the button still carries the prompt as its name.
   */
  wordsOn?: "ground" | "plaque" | "visual";
  /**
   * The artwork, for a cover drawn from pictures rather than from the card's
   * palette. Chosen by whether the card's ground is light, so the cover still
   * answers to the card behind it, and only the chosen set is ever fetched.
   */
  art?: (isLight: boolean) => CoverArt;
  /**
   * For a cover played from a film: the film's own timings, for a light card
   * or a dark one, which the shell runs to in place of `durationMs`,
   * `revealAt` and `burstAt` above. Those stay the drawn cover's, which is
   * what opens when the film cannot; see `retime` on CoverVisualState.
   */
  film?: (isLight: boolean) => CoverFilmTiming;
}
