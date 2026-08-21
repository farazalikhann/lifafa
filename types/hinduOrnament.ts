/**
 * Hindu ornament pack — the shapes a host can add to their card, and the
 * greeting and shlok that head it.
 *
 * The parallel of types/ornament.ts, which does the same job for the Muslim
 * pack. Kept as its own file rather than widened unions on that one: the two
 * packs share no ornament, and a card is only ever one tradition, so a union
 * spanning both would let a lantern and a kalash coexist in a type that no
 * screen can render.
 *
 * Nothing here is drawn yet. The drawings and the editor come later; this step
 * is the data only.
 */

export type HinduOrnamentId =
  | "diya"
  | "kalash"
  | "ganesh"
  | "om"
  | "swastik"
  | "toran"
  | "marigold";

/**
 * The host's ornament choices for one Hindu card.
 *
 * Mirrors OrnamentConfig field for field, with `shlokId` where the Muslim
 * config carries `duaId`.
 *
 * The greeting and shlok are held as ids rather than as text: the strings live
 * in lib/devanagariContent.ts, which is reviewed on its own, and a card must
 * never carry a frozen copy of a Devanagari string that the content file could
 * later correct.
 */
export interface HinduOrnamentConfig {
  enabledOrnaments: readonly HinduOrnamentId[];
  greetingId: string | null;
  shlokId: string | null;
}
