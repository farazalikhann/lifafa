import type { DecorMotion } from "@/types/card";
import type { ThemeId } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";

export interface Occasion {
  id: OccasionId;
  label: string;
  /** Applied on an explicit occasion click; the host can override afterwards. */
  defaultThemeId: ThemeId;
  defaultMotion: DecorMotion;
}

export const OCCASIONS: readonly Occasion[] = [
  { id: "wedding", label: "Wedding", defaultThemeId: "marigold", defaultMotion: "fall" },
  { id: "engagement", label: "Engagement", defaultThemeId: "rose", defaultMotion: "float" },
  { id: "birthday", label: "Birthday", defaultThemeId: "marigold", defaultMotion: "float" },
  { id: "babyShower", label: "Baby shower", defaultThemeId: "rose", defaultMotion: "float" },
  { id: "housewarming", label: "Housewarming", defaultThemeId: "marigold", defaultMotion: "drift" },
  { id: "anniversary", label: "Anniversary", defaultThemeId: "rose", defaultMotion: "fall" },
  { id: "corporate", label: "Corporate", defaultThemeId: "emerald", defaultMotion: "drift" },
  { id: "other", label: "Other", defaultThemeId: "marigold", defaultMotion: "none" },
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
