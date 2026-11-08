import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/gurdwara-ivory/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "gurdwara-ivory" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 *
 * Its painting is the valley and its tree printed in old gold and the other
 * way round, the tree on the right and the river on the left, so it is not
 * Bodhi Ivory's valley; mogra garlands part its sections.
 */
export const GURDWARA_IVORY: TemplateConfig = presetTemplate({
  presetId: "gurdwara-ivory",
  preview,
  ownPaletteLabel: "Ivory",
  palettes: [plain("sand", "sand"), plain("blush", "blush")],
  fontPairs: ["royal", "classic"],
  scene: "valleyTree",
  sceneTone: "gold",
  sceneMirror: true,
  divider: "mogra",
});
