/**
 * Muslim ornament pack — the shapes a host can add to their card, and the
 * greeting and dua that head it.
 *
 * These types are tradition neutral in name only. Everything they describe is
 * drawn in lib/ornaments/muslim.tsx and offered by
 * components/create/OrnamentPanel.tsx, both of which are gated on
 * `traditionId === "muslim"`.
 */

export type OrnamentId =
  | "lantern"
  | "crescentMoon"
  | "stars"
  | "arabesqueBorder"
  | "mosqueArch"
  | "geometricStar"
  | "hangingLights";

/**
 * One ornament pinned to the top edge of the card.
 *
 * Every field is authored by hand in a fixed table — never generated — so the
 * server and the browser lay the row out identically.
 */
export interface HangingOrnament {
  id: OrnamentId;
  /** Horizontal position across the card: 0 at the left edge, 100 at the right. */
  xPercent: number;
  /**
   * How far down the hanging band the ornament starts, as a percentage of that
   * band's height.
   *
   * A row of lanterns all pinned to one offset reads as a shelf rather than as
   * lamps on strings of different lengths, so the depth has to be authored per
   * ornament — this is where it lives.
   */
  topPercent: number;
  /** Rendered size of the ornament's larger dimension, in rem. */
  sizeRem: number;
  /** Stagger for the pendulum animation, so no two swing in unison. */
  delayMs: number;
  swing: boolean;
}

/**
 * The host's ornament choices for one card.
 *
 * The greeting and dua are held as ids rather than as text: the strings live in
 * lib/arabicContent.ts, which is reviewed on its own, and a card must never
 * carry a frozen copy of an Arabic string that the content file could later
 * correct.
 */
export interface OrnamentConfig {
  enabledOrnaments: readonly OrnamentId[];
  greetingId: string | null;
  duaId: string | null;
}
