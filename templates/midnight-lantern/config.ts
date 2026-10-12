import { GOLD, plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/midnight-lantern/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * The "midnight-lantern" preset as a template: its look from lib/presets.ts, and
 * the colourways and type pairs a host may change it to. See presetTemplate.
 */
export const MIDNIGHT_LANTERN: TemplateConfig = presetTemplate({
  presetId: "midnight-lantern",
  preview,
  ownPaletteLabel: "Midnight",
  palettes: [
    plain("maroon", "maroon"),
    { id: "forest", label: "Forest", paletteId: "forest", accentOverride: GOLD },
  ],
  fontPairs: ["royal", "luxe"],
});
