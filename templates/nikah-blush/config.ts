import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/nikah-blush/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "nikah-blush" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 */
export const NIKAH_BLUSH: TemplateConfig = presetTemplate({
  presetId: "nikah-blush",
  preview,
  ownPaletteLabel: "Blush",
  palettes: [
    plain("ivory", "cream", "flowerIvory"),
    plain("sand", "sand", "flowerGold"),
  ],
  fontPairs: ["royal", "graceful"],
});
