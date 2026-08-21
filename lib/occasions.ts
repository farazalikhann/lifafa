import type { DecorMotion } from "@/types/card";
import type { ThemeId } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { PaletteId } from "@/types/style";

export interface Occasion {
  id: OccasionId;
  label: string;
  /** Applied on an explicit occasion click; the host can override afterwards. */
  defaultThemeId: ThemeId;
  defaultMotion: DecorMotion;
  /** Palette applied on an occasion click; lib/themes.ts stays untouched. */
  defaultPaletteId: PaletteId;
  /**
   * Whether this occasion joins two people on the cover.
   *
   * A wedding, an engagement and an anniversary are about a pair, and the cover
   * sets them over three lines with a joining word between. A birthday, a baby
   * shower, a housewarming and a corporate invitation are not — asking a host
   * for a "first name" and a "second name" with "weds" between them is asking a
   * question their event does not have an answer to.
   *
   * "other" is deliberately false. It is the catch-all, and one name is the
   * shape that fits anything; a host who needs the pair is one click away from
   * the occasion that means it.
   */
  pairsNames: boolean;
}

export const OCCASIONS: readonly Occasion[] = [
  { id: "wedding", label: "Wedding", defaultThemeId: "marigold", defaultMotion: "fall", defaultPaletteId: "ink", pairsNames: true },
  { id: "engagement", label: "Engagement", defaultThemeId: "rose", defaultMotion: "float", defaultPaletteId: "cream", pairsNames: true },
  { id: "birthday", label: "Birthday", defaultThemeId: "marigold", defaultMotion: "float", defaultPaletteId: "ink", pairsNames: false },
  { id: "babyShower", label: "Baby shower", defaultThemeId: "rose", defaultMotion: "float", defaultPaletteId: "blush", pairsNames: false },
  { id: "housewarming", label: "Housewarming", defaultThemeId: "marigold", defaultMotion: "drift", defaultPaletteId: "sand", pairsNames: false },
  { id: "anniversary", label: "Anniversary", defaultThemeId: "rose", defaultMotion: "fall", defaultPaletteId: "midnight", pairsNames: true },
  { id: "corporate", label: "Corporate", defaultThemeId: "emerald", defaultMotion: "drift", defaultPaletteId: "forest", pairsNames: false },
  { id: "other", label: "Other", defaultThemeId: "marigold", defaultMotion: "none", defaultPaletteId: "ink", pairsNames: false },
];

export interface Tradition {
  id: TraditionId;
  label: string;
}

export const TRADITIONS: readonly Tradition[] = [
  { id: "none", label: "No religious motifs" },
  { id: "hindu", label: "Hindu" },
  { id: "muslim", label: "Muslim" },
  { id: "sikh", label: "Sikh" },
  { id: "christian", label: "Christian" },
  { id: "jain", label: "Jain" },
  { id: "buddhist", label: "Buddhist" },
];

export const DEFAULT_OCCASION_ID: OccasionId = "wedding";
export const DEFAULT_TRADITION_ID: TraditionId = "none";

/** Always resolves — an unknown id falls back to the first occasion. */
export function getOccasion(id: OccasionId): Occasion {
  return OCCASIONS.find((occasion) => occasion.id === id) ?? OCCASIONS[0];
}

/**
 * Whether this occasion's cover joins two people.
 *
 * The one question the form and the card both have to answer the same way, so
 * it is asked of the table rather than restated at each of them.
 */
export function pairsNames(id: OccasionId): boolean {
  return getOccasion(id).pairsNames;
}
