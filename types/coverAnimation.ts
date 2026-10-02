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
  | "petal-dust";

/**
 * The pictures a cover is drawn from, when it is drawn from pictures, and the
 * colours that read over them.
 *
 * A cover made of the card's own two colours takes its inks from the card. One
 * made of photographed cloth cannot: the card's text colour was chosen against
 * the card's ground, not against velvet, so the artwork brings its own.
 */
export interface CoverArt {
  /**
   * Every picture the closed cover shows. They are on the first screen a guest
   * sees, so the shell asks for them as the page loads and keeps its loader up
   * until they are in; see CoverShell.
   */
  images: readonly string[];
  /** Skip and the focus ring, over the artwork. */
  ink: string;
  inkMuted: string;
  /** The small plaque the prompt sits on, its hairline, and the prompt itself. */
  plaque: string;
  plaqueEdge: string;
  plaqueInk: string;
}

/** One opening animation, as offered in the designer and played for a guest. */
export interface CoverAnimationOption {
  id: CoverAnimationId;
  /** Name shown to the host in the designer. */
  label: string;
  /** One short line explaining what the effect does. */
  description: string;
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
   * The sound the cover makes when a guest taps it open — synthesised, or for
   * the curtain a short recording fetched before the tap; see
   * lib/coverSound.ts. Null for a cover that opens in silence, which is what
   * "none" does because there is nothing to open.
   *
   * NOT AN ID THE DATABASE EVER SEES. Unlike the animation id above, this is a
   * property of the animation rather than a choice a host saves, so it can be
   * changed, retuned or dropped without a stored row meaning anything different.
   */
  sound: CoverSoundId | null;
  /** Whether the effect has a static fallback for reduced motion. */
  supportsReducedMotion: boolean;
  /**
   * What the closed cover prints, and on what. "ground" is every cover's unless
   * it says otherwise: the names, a rule and the prompt, on the card's own
   * ground under the drawing. "plaque" is for a cover whose artwork fills the
   * screen, where there is no ground to print on: the prompt alone, in the
   * card's heading face, on a small plaque of its own near the foot.
   */
  wordsOn?: "ground" | "plaque";
  /**
   * The artwork, for a cover drawn from pictures rather than from the card's
   * palette. Chosen by whether the card's ground is light, so the cover still
   * answers to the card behind it, and only the chosen set is ever fetched.
   */
  art?: (isLight: boolean) => CoverArt;
}
