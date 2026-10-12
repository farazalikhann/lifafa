import ClassicCard from "@/templates/classic/Card";
import type { TemplateConfig, TemplatePalette } from "@/templates/types";
import { defaultDesign } from "@/lib/designDefaults";
import { getPalette } from "@/lib/palettes";
import { PRESET_GROUPS, applyPreset, type Preset } from "@/lib/presets";
import { TRADITIONS_PRICE_PAISE } from "@/lib/pricing";
import type { CardSectionId } from "@/types/card";
import type { FontPairId } from "@/types/style";

/**
 * The sections a host may switch on and off on a template drawn by the
 * Classic card: all of them but the cover, which is the card's first screen.
 */
export const SWITCHABLE_SECTIONS: readonly CardSectionId[] = [
  "family",
  "details",
  "countdown",
  "venue",
  "timeline",
  "contact",
  "message",
];

/**
 * A template made from one of the editor's quick presets.
 *
 * The first eight templates are looks the Lifafa team already designed as
 * presets (lib/presets.ts), drawn by the same card as every invitation so far.
 * Their base design is the preset applied to an untouched wedding card, which
 * is the card a host got by opening the editor and pressing that preset, so a
 * template and the preset it came from are the same card.
 *
 * The first palette and the first font pair are always the preset's own, read
 * off the design rather than written a second time; the alternatives are
 * given.
 */
export function presetTemplate({
  presetId,
  preset: ownPreset,
  preview,
  ownPaletteLabel,
  palettes,
  fontPairs,
  scene,
}: {
  /** The painted scene, where it is not the card's default; see `scene` on TemplateConfig. */
  scene?: TemplateConfig["scene"];
  /** One of the editor's presets, by its id; or */
  presetId?: string;
  /**
   * a look written out in the template's own folder, in the same terms: for a
   * tradition the editor has no preset for. It is put on the card by the
   * same applyPreset, which only ever switches on what that tradition's own
   * pack offers.
   */
  preset?: Preset;
  preview: TemplateConfig["preview"];
  /** What the preset's own colourway is called beside the alternatives. */
  ownPaletteLabel: string;
  /** One or two colourways beside the preset's own. */
  palettes: readonly TemplatePalette[];
  /** One or two font pairs beside the preset's own. */
  fontPairs: readonly FontPairId[];
}): TemplateConfig {
  const preset =
    ownPreset ??
    PRESET_GROUPS.flatMap((group) => group.presets).find(
      (entry) => entry.id === presetId,
    );

  if (preset === undefined) {
    throw new Error(`templates: no preset called "${String(presetId)}"`);
  }

  const baseDesign = applyPreset(defaultDesign("wedding"), preset);

  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    category: preset.tradition,
    listed: true,
    collection: "traditions",
    price: TRADITIONS_PRICE_PAISE,
    preview,
    palettes: [
      {
        id: "own",
        label: ownPaletteLabel,
        paletteId: baseDesign.style.paletteId,
        accentOverride: baseDesign.style.accentOverride,
      },
      ...palettes,
    ],
    fontPairs: [
      baseDesign.style.fontPairId,
      ...fontPairs.filter((id) => id !== baseDesign.style.fontPairId),
    ],
    sections: SWITCHABLE_SECTIONS,
    baseDesign,
    ...(scene !== undefined ? { scene } : null),
    Card: ClassicCard,
  };
}

/** The Midnight palette's gold, for a ground whose own accent is not gold. */
export const GOLD = "#D8B26A";

/** A colourway that is a palette as it stands: its own accent, its own inks. */
export function plain(
  id: string,
  paletteId: TemplatePalette["paletteId"],
  borderStyle?: TemplatePalette["borderStyle"],
): TemplatePalette {
  return {
    id,
    label: getPalette(paletteId).label,
    paletteId,
    accentOverride: null,
    ...(borderStyle !== undefined ? { borderStyle } : null),
  };
}
