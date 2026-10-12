import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import ClassicCard from "@/templates/classic/Card";
import type { TemplateConfig } from "@/templates/types";

export const CLASSIC_TEMPLATE_ID = "classic";

/**
 * The card as it was before there were templates.
 *
 * Every invitation saved until now is one of these: its CardConfig is the
 * whole design, chosen control by control in the full editor, and it carries
 * no templateId at all. So Classic offers nothing to choose from and has no
 * base design of its own. It draws what the card says.
 */
export const CLASSIC_TEMPLATE: TemplateConfig = {
  id: CLASSIC_TEMPLATE_ID,
  name: "Classic",
  description: "The original Lifafa card, designed control by control.",
  category: "none",
  listed: false,
  palettes: [],
  fontPairs: [],
  sections: DEFAULT_SECTION_ORDER,
  baseDesign: null,
  Card: ClassicCard,
};
