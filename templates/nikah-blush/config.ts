import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/nikah-blush/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "nikah-blush" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 *
 * Its painting is the palace garden printed in rose, the one card with the
 * garden by day; roses part its sections.
 */
export const NIKAH_BLUSH: TemplateConfig = presetTemplate({
  presetId: "nikah-blush",
  preview,
  ownPaletteLabel: "Blush",
  palettes: [plain("ivory", "cream"), plain("sand", "sand")],
  fontPairs: ["elegant", "graceful"],
  scene: "palaceGarden",
  sceneTone: "rose",
  divider: "rose",
});
