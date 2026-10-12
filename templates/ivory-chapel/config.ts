import type { Preset } from "@/lib/presets";
import { plain, presetTemplate } from "@/templates/shared/fromPreset";
import preview from "@/templates/ivory-chapel/preview.webp";
import type { TemplateConfig } from "@/templates/types";

/**
 * Ivory Chapel: a Christian wedding in ivory, white and gold.
 *
 * The editor has no Christian preset, so the look is written here, in a
 * preset's own terms, and put on the card by the same builder as the other
 * Traditions templates. Everything on it is art the card already had:
 *
 *   an ivory ground with no frame round it, so nothing on it is red;
 *   white lilies in the corners, from the Christian pack, its soft floral;
 *   the valley and its tree for the first screen, in place of the palace
 *   garden, whose pavilion belongs to another kind of wedding;
 *   "Two shall become one" in the pack's copperplate hand at the head;
 *   white mogra petals as the card opens, and nothing flying.
 *
 * NO SYMBOL. The pack has a cross, a dove, bells, a chalice and rings; none
 * is switched on. Lilies and a line of scripture say a church wedding without
 * choosing a denomination's emblem for a family, and a host who wants one can
 * still add it in the full editor. The greeting and the blessing are the
 * pack's own, added only where the card has none.
 */
const IVORY_CHAPEL_LOOK: Preset = {
  id: "ivory-chapel",
  name: "Ivory Chapel",
  description: "Ivory, white and gold, with lilies and a line of scripture.",
  tradition: "christian",
  settings: {
    paletteId: "cream",
    textPairId: "champagneClassic",
    /* The Champagne Classic pair's own gold, which reads on a pale ground. */
    accentOverride: "#86672E",
    fontPairId: "graceful",
    density: "comfortable",
    borderStyle: "none",
    decorMotion: "float",
    decorIntensity: "subtle",
    butterflies: "none",
    leaves: false,
    petals: "open",
    petalFlower: "mogra",
    coverAnimation: "fold-unfold",
    ornaments: ["lilyCorner"],
    calligraphy: "twoBecomeOne",
    greetingIfNone: "graceAndPeace",
    blessingIfNone: "loveBlessing",
  },
};

export const IVORY_CHAPEL: TemplateConfig = presetTemplate({
  preset: IVORY_CHAPEL_LOOK,
  preview,
  ownPaletteLabel: "Ivory",
  palettes: [plain("blush", "blush"), plain("sand", "sand")],
  fontPairs: ["elegant", "classic"],
  scene: "valleyTree",
});
