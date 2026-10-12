import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/gurdwara-ivory/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "gurdwara-ivory" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 */
export const GURDWARA_IVORY: TemplateConfig = presetTemplate({
  presetId: "gurdwara-ivory",
  preview,
  ownPaletteLabel: "Ivory",
  palettes: [
    plain("sand", "sand"),
    plain("blush", "blush"),
  ],
  fontPairs: ["royal", "classic"],
});
