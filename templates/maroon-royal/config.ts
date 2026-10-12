import { GOLD, plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/maroon-royal/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "maroon-royal" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 */
export const MAROON_ROYAL: TemplateConfig = presetTemplate({
  presetId: "maroon-royal",
  preview,
  ownPaletteLabel: "Maroon",
  palettes: [
    plain("midnight", "midnight"),
    { id: "forest", label: "Forest", paletteId: "forest", accentOverride: GOLD },
  ],
  fontPairs: ["regal", "luxe"],
});
