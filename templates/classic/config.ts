import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { TRADITIONS_PRICE_PAISE } from "@/lib/pricing";
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
 * Only choosing Classic in the wizard's gallery lays this base design down.
 *
 * Its look is the plain new card's (lib/newCard.ts, from DEFAULT_DESIGN) with
 * a little more of its own, so it is not mistaken for any of the wedding
 * cards: a gold geometric rule round the card in the accent, the damask, a
 * shower of confetti as it opens, and the names in a clean sans. The empty
 * card a host starts from is unchanged.
 */
export const CLASSIC_TEMPLATE: TemplateConfig = {
  /* The "Made with Lifafa" credit in the card's text colour. */
  creditInk: "text",
  id: CLASSIC_TEMPLATE_ID,
  name: "Classic",
  description: "A simple card in ink and gold, for any occasion.",
  category: "none",
  listed: true,
  collection: "traditions",
  price: TRADITIONS_PRICE_PAISE,
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
  fontPairs: ["modern", DEFAULT_DESIGN.style.fontPairId, "elegant"],
  sections: SWITCHABLE_SECTIONS,
  baseDesign: {
    ...DEFAULT_DESIGN,
    style: { ...DEFAULT_DESIGN.style, fontPairId: "modern" },
    /* A gold rule round the card, drawn in the accent: stationery, and no flowers. */
    borderStyle: "geometricRule",
    /* Confetti as it opens, for any occasion; nothing else moves. */
    petals: "open",
    petalFlower: "confetti",
    royalTexture: true,
  },
};
