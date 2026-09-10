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
   * The invitation printed on the closed cover, for example "Tap seal to open".
   * Empty for "none", which has no cover to tap.
   */
  openPromptText: string;
  /** Total length of the open animation, in milliseconds. */
  durationMs: number;
  /**
   * The sound the cover makes when a guest taps it open, synthesised rather
   * than fetched — see lib/coverSound.ts. Null for a cover that opens in
   * silence, which is what "none" does because there is nothing to open.
   *
   * NOT AN ID THE DATABASE EVER SEES. Unlike the animation id above, this is a
   * property of the animation rather than a choice a host saves, so it can be
   * changed, retuned or dropped without a stored row meaning anything different.
   */
  sound: CoverSoundId | null;
  /** Whether the effect has a static fallback for reduced motion. */
  supportsReducedMotion: boolean;
}
