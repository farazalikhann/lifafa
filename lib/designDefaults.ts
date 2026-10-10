import type { DateReveal } from "@/types/card";
import { paletteTextColors } from "@/lib/textColors";
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
  FlyingKind,
  NamesFrame,
  NatureKind,
  PetalFlower,
  PetalStyle,
  RoyalTexturePattern,
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
  /* The kinds, kept while their switches are off. See types/card.ts. */
  flying: FlyingKind;
  nature: NatureKind;
  petals: PetalStyle;
  petalFlower: PetalFlower;
  coverAnimation: CoverAnimationId;
  traditionId: TraditionId;
  ornamentConfig: OrnamentConfig;
  /**
   * The reveal on the date's screen, where the host or a preset has chosen
   * one. Absent until then, and on every card saved before there was a
   * choice; see `dateRevealOf` in lib/royalScroll.ts.
   */
  dateReveal?: DateReveal;
  /**
   * The royal texture, where the card has it on. Absent where it is off: a
   * preset can turn it on and none turns it off; see lib/royalTexture.ts.
   */
  royalTexture?: true;
  /**
   * Which pattern the texture is, where it is not the damask. Absent for the
   * damask, so a design from before there was a choice is the same design.
   */
  royalTexturePattern?: Exclude<RoyalTexturePattern, "damask">;
  /**
   * The frame the names are set in, where it is not the lotus ring. Absent
   * for the lotus ring, so a design from before there was a choice is the
   * same design. See lib/namesFrame.ts.
   */
  namesFrame?: Exclude<NamesFrame, "lotus">;
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
    /* Two inks from the start: the pair nearest the palette. See lib/textColors.ts. */
    textColors: paletteTextColors(DEFAULT_OCCASION.defaultPaletteId),
  },
  /* Off by default: a border is an addition to the card, not a part of it. */
  borderStyle: "none",
  decorMotion: DEFAULT_OCCASION.defaultMotion,
  decorIntensity: "normal",
  butterflies: "none",
  leaves: false,
  /* What every card had before there was a choice. */
  flying: "butterflies",
  nature: "greenLeaves",
  petals: "none",
  /* What every card had before there was a choice. */
  petalFlower: "rose",
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
    style: {
      ...DEFAULT_DESIGN.style,
      paletteId: occasion.defaultPaletteId,
      textColors: paletteTextColors(occasion.defaultPaletteId),
    },
    decorMotion: occasion.defaultMotion,
  };
}
