import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/shubh-vivah-ivory/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "shubh-vivah-ivory" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 *
 * Its own painting is the lake palace by day, which no other ivory card has,
 * under crimson roses; its garland between sections is marigold, like the
 * one at its head and the petals that fall.
 */
export const SHUBH_VIVAH_IVORY: TemplateConfig = presetTemplate({
  presetId: "shubh-vivah-ivory",
  preview,
  ownPaletteLabel: "Ivory",
  /* The crimson roses go with both: neither colourway brings a frame of its own. */
  palettes: [plain("blush", "blush"), plain("sand", "sand")],
  fontPairs: ["elegant", "graceful"],
  scene: "lakePalace",
  divider: "marigold",
});
