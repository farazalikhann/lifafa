/**
 * The shapes a host can add to their card, and the greeting and blessing that
 * head it.
 *
 * These types started out Muslim-only and are now shared. A tradition brings
 * its own ornament ids, its own script and its own two lists; what it does not
 * bring is a second copy of the editor or the card. lib/traditionPacks.tsx is
 * where a tradition says what it offers, and the panel and the canvas read that
 * one descriptor — see the note on OrnamentConfig below.
 */

import type { HinduOrnamentId } from "@/types/hinduOrnament";

/** Ornament ids belonging to the Muslim pack, drawn in lib/ornaments/muslim.tsx. */
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
 * Every ornament id in the app, across all packs.
 *
 * A union rather than one type per pack, because the config below is shared and
 * a card is only ever one tradition. That does mean the type permits a lantern
 * and a kalash in the same array — a state no screen can produce, since the
 * panel only ever offers one pack's chips and the editor empties the list on
 * every tradition click. Nothing renders it either: both the canvas and the
 * placer resolve an id through the *current* pack, and an id the pack does not
 * know is skipped rather than drawn.
 */
export type AnyOrnamentId = OrnamentId | HinduOrnamentId;

/**
 * The host's ornament choices for one card.
 *
 * ONE SHAPE FOR EVERY TRADITION, not one per pack. The panel, the canvas and
 * the placer are all written once against this, and a tradition is a parameter
 * they take rather than a branch they contain.
 *
 * `blessingId` is the slot the Muslim dua and the Hindu shlok share — named for
 * the role rather than for either occupant, because the two are the same thing
 * in a different tradition and giving each its own field would have been the
 * first crack in the shared path.
 *
 * The greeting and blessing are held as ids rather than as text: the strings
 * live in lib/arabicContent.ts and lib/devanagariContent.ts, which are reviewed
 * on their own, and a card must never carry a frozen copy of a line those files
 * could later correct.
 */
export interface OrnamentConfig {
  enabledOrnaments: readonly AnyOrnamentId[];
  greetingId: string | null;
  blessingId: string | null;
}
