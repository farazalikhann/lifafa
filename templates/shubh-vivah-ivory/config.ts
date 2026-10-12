import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/shubh-vivah-ivory/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "shubh-vivah-ivory" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 */
export const SHUBH_VIVAH_IVORY: TemplateConfig = presetTemplate({
  presetId: "shubh-vivah-ivory",
  preview,
  ownPaletteLabel: "Ivory",
  palettes: [
    plain("blush", "blush", "flowerBlush"),
    plain("sand", "sand", "flowerGold"),
  ],
  fontPairs: ["elegant", "graceful"],
});
