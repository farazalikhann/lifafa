import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import ClassicCard from "@/templates/classic/Card";
import { SWITCHABLE_SECTIONS, plain } from "@/templates/shared/fromPreset";
import preview from "@/templates/classic/preview.webp";
import type { TemplateConfig } from "@/templates/types";

export const CLASSIC_TEMPLATE_ID = "classic";

/**
 * The card as it was before there were templates, and the template for any
 * occasion: a birthday, a housewarming, an office party.
 *
 * Every invitation saved before templates is one of these: its CardConfig is
 * the whole design, chosen control by control in the full editor, and it
 * carries no templateId at all. Reading such a card never touches its design.
 * Only choosing Classic in the wizard's gallery lays this base design down,
 * and it is the design a new card has always started with.
 */
export const CLASSIC_TEMPLATE: TemplateConfig = {
  id: CLASSIC_TEMPLATE_ID,
  name: "Classic",
  description: "A simple card in ink and gold, for any occasion.",
  category: "none",
  listed: true,
  preview,
  palettes: [
    {
      id: "own",
      label: "Ink",
      paletteId: DEFAULT_DESIGN.style.paletteId,
      accentOverride: DEFAULT_DESIGN.style.accentOverride,
    },
    plain("cream", "cream"),
    plain("blush", "blush"),
  ],
  fontPairs: [DEFAULT_DESIGN.style.fontPairId, "modern", "elegant"],
  sections: SWITCHABLE_SECTIONS,
  /* With the royal texture, as a new card has it. */
  baseDesign: { ...DEFAULT_DESIGN, royalTexture: true },
  Card: ClassicCard,
};
