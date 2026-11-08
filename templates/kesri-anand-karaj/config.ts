import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/kesri-anand-karaj/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "kesri-anand-karaj" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 *
 * No painting: the jaal is the ground under the phulkari band, and marigold
 * garlands part its sections, as marigolds fall when it opens.
 */
export const KESRI_ANAND_KARAJ: TemplateConfig = presetTemplate({
  presetId: "kesri-anand-karaj",
  preview,
  ownPaletteLabel: "Saffron",
  palettes: [plain("ivory", "cream"), plain("blush", "blush")],
  fontPairs: ["elegant", "royal"],
  scene: "off",
  divider: "marigold",
});
