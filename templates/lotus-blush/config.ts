import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/lotus-blush/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "lotus-blush" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 *
 * No painting: the jaal is the ground inside the scalloped frame, and roses
 * part its sections.
 */
export const LOTUS_BLUSH: TemplateConfig = presetTemplate({
  presetId: "lotus-blush",
  preview,
  ownPaletteLabel: "Blush",
  palettes: [plain("ivory", "cream"), plain("sand", "sand")],
  fontPairs: ["romantic", "elegant"],
  scene: "off",
  divider: "rose",
});
