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
 *   cream and ivory roses on a gold double rule round the card (the pearl
 *   frame), on an ivory ground woven with the damask;
 *   no painting: the ground and the roses are the first screen, and the
 *   valley it had is another card's now;
 *   white lilies in the corners, from the Christian pack, its soft floral;
 *   "Two shall become one" in the pack's copperplate hand at the head;
 *   white mogra petals falling, and dandelion seeds drifting.
 *
 * NO SYMBOL. The pack has a cross, a dove, bells, a chalice and rings; none
 * is switched on. Lilies, white roses and a line of scripture say a church
 * wedding without choosing a denomination's emblem for a family, and a host
 * who wants one can still add it in the full editor. The greeting and the
 * blessing are the pack's own, added only where the card has none.
 */
const IVORY_CHAPEL_LOOK: Preset = {
  id: "ivory-chapel",
  name: "Ivory Chapel",
  description: "Ivory roses on damask, white lilies and a line of scripture.",
  tradition: "christian",
  settings: {
    paletteId: "cream",
    /* Near-black and a deep rose for the two inks. */
    textPairId: "ivoryRose",
    /* The Champagne Classic pair's own gold, which reads on a pale ground. */
    accentOverride: "#86672E",
    fontPairId: "graceful",
    density: "comfortable",
    borderStyle: "flowerPearl",
    decorMotion: "float",
    decorIntensity: "subtle",
    butterflies: "none",
    leaves: true,
    nature: "dandelion",
    petals: "fall",
    petalFlower: "mogra",
    royalTexture: true,
    /* The floral gatefold with its satin bow and white roses. */
    coverAnimation: "ribbon-seal",
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
  scene: "off",
  divider: "mogra",
});
