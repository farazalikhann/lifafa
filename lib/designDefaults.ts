import { DEFAULT_COVER_ANIMATION } from "@/lib/coverAnimations";
import { DEFAULT_FONT_PAIR_ID } from "@/lib/fontPairs";
import {
  DEFAULT_OCCASION_ID,
  DEFAULT_TRADITION_ID,
  getOccasion,
} from "@/lib/occasions";
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import type {
  ButterflyStyle,
  CardBorderStyle,
  DecorIntensity,
  DecorMotion,
  PetalStyle,
} from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";
import type { CardStyle } from "@/types/style";

/**
 * The editor's design values, as one object: how the card looks, and none of
 * what it says.
 *
 * The slice of the editor a preset reads and writes, and the slice a new card
 * starts on. The draft, the sections, the replies, the music, the weather and
 * the check-in are not in it, so nothing that takes a DesignState can reach
 * them even by mistake.
 */
export interface DesignState {
  style: CardStyle;
  borderStyle: CardBorderStyle;
  decorMotion: DecorMotion;
  decorIntensity: DecorIntensity;
  butterflies: ButterflyStyle;
  leaves: boolean;
  petals: PetalStyle;
  coverAnimation: CoverAnimationId;
  traditionId: TraditionId;
  ornamentConfig: OrnamentConfig;
}

const DEFAULT_OCCASION = getOccasion(DEFAULT_OCCASION_ID);

/**
 * How a new invitation looks before the host touches anything.
 *
 * THE ONE COPY. app/create/page.tsx builds its empty card from this, and the
 * presets measure "has the host designed anything yet" against it, so the two
 * cannot drift. The palette and motion are the default occasion's; see
 * defaultDesign for a card on any other.
 */
export const DEFAULT_DESIGN: DesignState = {
  style: {
    fontPairId: DEFAULT_FONT_PAIR_ID,
    paletteId: DEFAULT_OCCASION.defaultPaletteId,
    density: "comfortable",
    accentOverride: null,
  },
  /* Off by default: a border is an addition to the card, not a part of it. */
  borderStyle: "none",
  decorMotion: DEFAULT_OCCASION.defaultMotion,
  decorIntensity: "normal",
  butterflies: "none",
  leaves: false,
  petals: "none",
  coverAnimation: DEFAULT_COVER_ANIMATION,
  traditionId: DEFAULT_TRADITION_ID,
  ornamentConfig: DEFAULT_ORNAMENT_CONFIG,
};

/**
 * What an untouched card looks like for this occasion.
 *
 * DEFAULT_DESIGN with the palette and motion an occasion click sets — picking
 * "Birthday" is not the host designing anything, so a card that has had only
 * that done to it is still uncustomised.
 */
export function defaultDesign(occasionId: OccasionId): DesignState {
  const occasion = getOccasion(occasionId);

  return {
    ...DEFAULT_DESIGN,
    style: { ...DEFAULT_DESIGN.style, paletteId: occasion.defaultPaletteId },
    decorMotion: occasion.defaultMotion,
  };
}
