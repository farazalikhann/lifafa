/**
 * The opening animations a host can put on the front of an invite card.
 *
 * The ids below are written into saved cards in the database. Once a card has
 * been created with one of them, that id must never be renamed or removed:
 * a saved row keeps its literal string, and dropping the value it names would
 * leave that card pointing at an animation that no longer exists. Adding a new
 * id is safe. Changing an old one is not.
 */

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
  /** Whether the effect has a static fallback for reduced motion. */
  supportsReducedMotion: boolean;
}
