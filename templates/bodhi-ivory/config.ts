import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/bodhi-ivory/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "bodhi-ivory" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 */
export const BODHI_IVORY: TemplateConfig = presetTemplate({
  presetId: "bodhi-ivory",
  preview,
  ownPaletteLabel: "Ivory",
  palettes: [
    plain("sand", "sand"),
    plain("midnight", "midnight"),
  ],
  fontPairs: ["elegant", "graceful"],
});
