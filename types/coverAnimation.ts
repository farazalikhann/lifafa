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
   * What the names and the prompt sit on while the cover is closed: the card's
   * own ground, which is every cover's unless it says otherwise, or velvet,
   * where the card's text colour would not read and they are set in light ink.
   */
  wordsOn?: "ground" | "velvet";
}
