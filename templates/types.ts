import type { ComponentProps, ComponentType } from "react";
import type CardCanvas from "@/components/card/CardCanvas";
import type { DesignState } from "@/lib/designDefaults";
import type { TextPairId } from "@/lib/textColors";
import type { CardSectionId } from "@/types/card";
import type { TraditionId } from "@/types/occasion";
import type { FontPairId, PaletteId } from "@/types/style";

/**
 * What a template's card is handed: exactly what CardCanvas has always been
 * handed. Every template draws the same event (the draft) and is placed by the
 * same callers (the guest's page, the previews, the printed copy), so a
 * template that needed something more would be one those callers could not
 * draw.
 */
export type TemplateCardProps = ComponentProps<typeof CardCanvas>;

/**
 * One of the two or three colourways a template offers.
 *
 * Named by the template rather than by the palette, because two templates can
 * offer the same palette under different accents and a host is choosing "the
 * maroon one", not a row of lib/palettes.ts.
 */
export interface TemplatePalette {
  id: string;
  label: string;
  paletteId: PaletteId;
  /** Hex laid over the palette's accent, or null for the palette's own. */
  accentOverride: string | null;
  /** The two inks that go with it. Absent means the pair nearest the palette. */
  textPairId?: TextPairId;
}

/**
 * A template: one finished look, and the little a host may change about it.
 *
 * Each lives in its own folder under templates/, with this as its config.ts.
 * The event itself (names, functions, venue, the words in each language) is
 * never part of one: every template reads the same EventDraft, which is what
 * lets a host change template without typing anything again. See switch.ts.
 */
export interface TemplateConfig {
  /** Written into every card saved with it (CardConfig.templateId). Never renamed. */
  id: string;
  name: string;
  /** One short line, shown under the name in the gallery. */
  description: string;
  /** Whose tradition the look belongs to, which the gallery groups by. */
  category: TraditionId;
  /**
   * Whether the gallery offers it. Classic does not: it is the free-form card
   * every invitation was before there were templates, kept so those still
   * open, and not a look anyone picks.
   */
  listed: boolean;
  /** The colourways on offer, the first being the one it opens in. */
  palettes: readonly TemplatePalette[];
  /** The type pairs on offer, the first being the one it opens in. */
  fontPairs: readonly FontPairId[];
  /** The built-in sections a host may switch on and off. */
  sections: readonly CardSectionId[];
  /**
   * Everything about the look a host cannot change, and the starting point for
   * what they can. Null for Classic alone, whose design is whatever the card
   * already carries.
   */
  baseDesign: DesignState | null;
  /** What draws the card. */
  Card: ComponentType<TemplateCardProps>;
}
