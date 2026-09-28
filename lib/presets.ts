import { deepEqual } from "@/lib/deepEqual";
import type { DesignState } from "@/lib/designDefaults";
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import { getTraditionPack } from "@/lib/traditionPacks";
import type {
  ButterflyStyle,
  CardBorderStyle,
  DecorIntensity,
  DecorMotion,
  PetalFlower,
  PetalStyle,
} from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { TraditionId } from "@/types/occasion";
import type { AnyOrnamentId, OrnamentConfig } from "@/types/ornament";
import type { CardDensity, FontPairId, PaletteId } from "@/types/style";

/**
 * Ready-made looks a host can put on their card in one click.
 *
 * A PRESET IS A LOOK AND NOTHING ELSE. It writes to the same design values the
 * Design tab's own controls write to, and to none of the rest: never the
 * names, the date, the venue, the note, the sections or the replies. The
 * greeting and the dua are never touched either — those are words a family
 * chose to put on their card, and a palette click must not choose them again.
 * Calligraphy is set one of two ways, per preset. A Nikah look only fills an
 * empty card with Bismillah and keeps any panel the host chose — see
 * `calligraphyIfNone`. A Vivah look is built around its word-mark, so it sets
 * the one it names, or none, whatever the card had — see `calligraphy`.
 * The card is saved exactly as it always was; a preset is only a quicker way
 * of setting values a host could have set by hand.
 *
 * Every value below is one the editor already offers. The types hold the
 * palettes, fonts, borders and motions to that; the ornaments are held to it by
 * `applyPreset`, which resolves each through the tradition's own pack and drops
 * anything the pack does not offer as a shape.
 */

/** Everything a preset may set. Each preset sets a subset of it. */
export interface PresetSettings {
  paletteId: PaletteId;
  /** A hex accent laid over the palette's own, or null for the palette's. */
  accentOverride: string | null;
  fontPairId: FontPairId;
  density: CardDensity;
  borderStyle: CardBorderStyle;
  decorMotion: DecorMotion;
  decorIntensity: DecorIntensity;
  butterflies: ButterflyStyle;
  leaves: boolean;
  petals: PetalStyle;
  /**
   * The flower, on a preset that turns petals on. Left out of one that does
   * not, so applying it keeps whichever flower the host had picked for when
   * they turn petals back on themselves.
   */
  petalFlower?: PetalFlower;
  coverAnimation: CoverAnimationId;
  /**
   * The pack's shapes to switch on: what hangs, what sits in the corners, the
   * divider. Calligraphy ids are ignored here even if listed; they have the
   * field below.
   */
  ornaments: readonly AnyOrnamentId[];
  /**
   * The calligraphy that heads the card when the host has chosen none.
   *
   * Only ever added, and only to a card with no calligraphy at all: a host who
   * picked any panel of their own keeps their choice, untouched and unjoined.
   */
  calligraphyIfNone: readonly AnyOrnamentId[];
  /**
   * The calligraphy the card heads with, set outright: this one panel, or none
   * for null, replacing whatever the card had. For a look whose whole design
   * is its word-mark — the Vivah presets — where keeping the host's old panel
   * would leave a different card behind the preset's name. Wins over
   * `calligraphyIfNone` when both are given.
   */
  calligraphy: AnyOrnamentId | null;
}

export interface Preset {
  id: string;
  name: string;
  /** One short line, shown under the name. */
  description: string;
  /**
   * Whose tradition this look belongs to, which is also the tradition it
   * switches the card to. The picker groups presets by it.
   */
  tradition: Exclude<TraditionId, "none">;
  settings: Partial<PresetSettings>;
}

/**
 * The gold of the Midnight palette's accent, lent to a palette whose own accent
 * is not gold. Taken from lib/palettes.ts rather than invented, and it clears
 * 9:1 on Forest's background and surface both.
 */
const PALETTE_GOLD = "#D8B26A";

/**
 * Blush's burnt-sienna accent, lent to Cream for a saffron look. Saffron itself
 * cannot be the accent on a light card — the palettes hold every accent to
 * 4.5:1 for the text set in it, and saffron manages about 2:1 on cream — so
 * this, the warmest accent any palette has, clears 5.6:1 on Cream instead, and
 * the saffron comes from the toran, the marigold and the butterflies.
 */
const PALETTE_SIENNA = "#974B2E";

/**
 * Sand's bronze accent, lent to Cream as the nearest legible thing to a soft
 * gold on a light card: 7:1 on Cream, where Midnight's gold is under 2:1.
 */
const PALETTE_BRONZE = "#6B4A2F";

/**
 * The presets, in the order the picker lays them out.
 *
 * Four Nikah looks, each pulling a different way — soft, regal, night-time,
 * plain — so that no two read as the same card in a different colour. Then
 * six Vivah looks, each built on one of the five word-marks.
 *
 * EVERY VIVAH PRESET SETS EVERYTHING IT IS ABOUT: the palette and accent, the
 * type, the length, the border, the motifs' motion and amount, the
 * butterflies, the leaves, the petals and their flower, the cover, the one
 * calligraphy and the whole of the top border, the place above the names and
 * the corners. So moving from one to the next leaves nothing of the first
 * behind; a slot a look leaves empty is emptied. Ganesh is only ever above the
 * names, and never on a card whose word-mark already draws him (Shubh Vivah).
 */
export const PRESETS: readonly Preset[] = [
  {
    id: "nikah-blush",
    name: "Nikah Blush",
    description: "Soft blush, a flower frame, lanterns and butterflies.",
    tradition: "muslim",
    settings: {
      paletteId: "blush",
      accentOverride: null,
      fontPairId: "elegant",
      density: "comfortable",
      borderStyle: "flowerBackground",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "red",
      leaves: false,
      petals: "open",
      /* Rose, as it had before there was a choice: blush and red butterflies. */
      petalFlower: "rose",
      coverAnimation: "petal-dust",
      ornaments: ["lantern", "arabesqueBorder"],
      calligraphyIfNone: ["bismillah"],
    },
  },
  {
    id: "emerald-royal",
    name: "Emerald Royal",
    description: "Deep green and gold, a gold flower frame, calm and regal.",
    tradition: "muslim",
    settings: {
      paletteId: "forest",
      accentOverride: PALETTE_GOLD,
      fontPairId: "classic",
      density: "airy",
      borderStyle: "flowerGold",
      decorMotion: "drift",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "none",
      coverAnimation: "envelope-seal",
      ornaments: ["hangingLights", "geometricStar", "arabesqueBorder"],
      calligraphyIfNone: ["bismillah"],
    },
  },
  {
    id: "midnight-lantern",
    name: "Midnight Lantern",
    description: "Night blue and gold, with lanterns, moons and stars.",
    tradition: "muslim",
    settings: {
      paletteId: "midnight",
      /* Midnight's own accent is already the gold this look is named for. */
      accentOverride: null,
      fontPairId: "warm",
      density: "comfortable",
      borderStyle: "flowerNoir",
      decorMotion: "float",
      decorIntensity: "normal",
      butterflies: "none",
      leaves: false,
      petals: "none",
      coverAnimation: "curtain-reveal",
      ornaments: ["lantern", "crescentMoon", "stars", "arabesqueBorder"],
      calligraphyIfNone: ["bismillah"],
    },
  },
  {
    id: "ivory-grace",
    name: "Ivory Grace",
    description: "Warm ivory, a slim flower frame and still, quiet detail.",
    tradition: "muslim",
    settings: {
      paletteId: "cream",
      accentOverride: null,
      fontPairId: "elegant",
      density: "airy",
      borderStyle: "flowerIvory",
      decorMotion: "none",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "none",
      coverAnimation: "fold-unfold",
      ornaments: ["arabesqueBorder"],
      calligraphyIfNone: ["bismillah"],
    },
  },
  {
    id: "shubh-vivah-classic",
    name: "Shubh Vivah Classic",
    description: "Maroon and gold, a marigold garland, Om, diya and kalash.",
    tradition: "hindu",
    settings: {
      /* Maroon's own accent is the gold this look wants. */
      paletteId: "maroon",
      accentOverride: null,
      fontPairId: "royal",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "both",
      petalFlower: "marigold",
      coverAnimation: "envelope-seal",
      /* Om rather than Ganesh above the names: Shubh Vivah already draws Ganesh. */
      ornaments: ["marigold", "om", "diya", "kalash"],
      calligraphy: "shubhVivah",
    },
  },
  {
    id: "genda-utsav",
    name: "Genda Utsav",
    description: "Warm cream and saffron, a toran, swastik and falling marigold.",
    tradition: "hindu",
    settings: {
      paletteId: "cream",
      accentOverride: PALETTE_SIENNA,
      fontPairId: "warm",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "yellow",
      leaves: false,
      petals: "fall",
      petalFlower: "marigold",
      coverAnimation: "petal-dust",
      /* Kalash alone in the corners stands in both, the right one mirrored. */
      ornaments: ["toran", "swastik", "kalash"],
      calligraphy: "vivahotsav",
    },
  },
  {
    id: "shri-ganesh",
    name: "Shri Ganesh",
    description: "Maroon and gold, Ganesh, a marigold garland and diyas.",
    tradition: "hindu",
    settings: {
      paletteId: "maroon",
      accentOverride: null,
      fontPairId: "regal",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "drift",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "open",
      /* Marigold, not rose: red petals all but vanish on the maroon ground. */
      petalFlower: "marigold",
      coverAnimation: "envelope-seal",
      ornaments: ["marigold", "ganesh", "diya"],
      calligraphy: "shriGaneshaya",
    },
  },
  {
    id: "kamal-pooja",
    name: "Kamal Pooja",
    description: "Soft blush, lotus petals, a toran and drifting leaves.",
    tradition: "hindu",
    settings: {
      /*
        Blush's own warm accent: a gold accent on a blush ground falls far
        short of the contrast the palettes hold every accent to. The gold is
        the toran's and the kalash's.
      */
      paletteId: "blush",
      accentOverride: null,
      fontPairId: "elegant",
      density: "airy",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: true,
      petals: "both",
      petalFlower: "lotus",
      coverAnimation: "fold-unfold",
      ornaments: ["toran", "om", "kalash"],
      calligraphy: "sadarNimantran",
    },
  },
  {
    id: "radhe-krishna",
    name: "Radhe Krishna",
    description: "Peacock teal and gold, diyas, falling mogra and butterflies.",
    tradition: "hindu",
    settings: {
      /* Peacock's own accent is already gold. */
      paletteId: "peacock",
      accentOverride: null,
      fontPairId: "romantic",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "mixed",
      leaves: false,
      petals: "fall",
      petalFlower: "mogra",
      coverAnimation: "curtain-reveal",
      /* Nothing across the top or above the names: only the diyas below. */
      ornaments: ["diya"],
      calligraphy: "radheKrishna",
    },
  },
  {
    id: "sadar-minimal",
    name: "Sadar Minimal",
    description: "Clean cream, one line of calligraphy and a shower of petals.",
    tradition: "hindu",
    settings: {
      paletteId: "cream",
      accentOverride: PALETTE_BRONZE,
      fontPairId: "clean",
      density: "airy",
      borderStyle: "none",
      decorMotion: "none",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "open",
      petalFlower: "rose",
      coverAnimation: "fold-unfold",
      ornaments: [],
      calligraphy: "sadarNimantran",
    },
  },
];

/**
 * How the picker heads each tradition's presets.
 *
 * A tradition gets a group once it has presets and a label here; a new one is a
 * row in each table and nothing in the picker.
 */
const GROUP_LABELS: Partial<Record<TraditionId, string>> = {
  muslim: "Nikah",
  hindu: "Vivah",
};

export interface PresetGroup {
  tradition: Exclude<TraditionId, "none">;
  label: string;
  presets: readonly Preset[];
}

/** The presets by tradition, in the order each tradition first appears above. */
export const PRESET_GROUPS: readonly PresetGroup[] = PRESETS.reduce<
  PresetGroup[]
>((groups, preset) => {
  const group = groups.find((entry) => entry.tradition === preset.tradition);

  if (group !== undefined) {
    group.presets = [...group.presets, preset];
    return groups;
  }

  return [
    ...groups,
    {
      tradition: preset.tradition,
      label: GROUP_LABELS[preset.tradition] ?? preset.tradition,
      presets: [preset],
    },
  ];
}, []);

/**
 * The design with this preset laid over it.
 *
 * Only what the preset names changes. The ornament pack follows the rule the
 * tradition pills keep: arriving from another tradition starts the pack empty,
 * so nothing from the old pack — its greeting, its shlok, its kalash — can
 * cross into the new one. Staying within the tradition keeps the greeting, the
 * dua and any calligraphy the host picked, and swaps only the shapes.
 *
 * Calligraphy is then set outright if the preset names one (`calligraphy`),
 * and otherwise left alone if there is any and given the preset's
 * `calligraphyIfNone` if there is none. Never more than one piece either way.
 * The greeting and the dua are never added, changed or removed.
 *
 * Everything comes out in the pack's own order, and only what the pack offers
 * in that role: an id it does not know, a calligraphy panel listed as a shape,
 * or a shape listed as calligraphy is dropped rather than trusted.
 */
export function applyPreset(design: DesignState, preset: Preset): DesignState {
  const { settings } = preset;
  const pack = getTraditionPack(preset.tradition);
  const sameTradition = design.traditionId === preset.tradition;
  const kept: OrnamentConfig = sameTradition
    ? design.ornamentConfig
    : DEFAULT_ORNAMENT_CONFIG;

  let ornamentConfig = kept;

  if (pack !== null) {
    const isCalligraphy = (id: AnyOrnamentId): boolean =>
      pack.calligraphyIds.includes(id);
    /*
      One piece at most: the preset's own if it sets one, else the card's
      latest, else the preset's first.
    */
    const keptCalligraphy = kept.enabledOrnaments.filter(isCalligraphy);
    const calligraphy =
      settings.calligraphy !== undefined
        ? settings.calligraphy === null
          ? []
          : [settings.calligraphy]
        : keptCalligraphy.length > 0
          ? keptCalligraphy.slice(-1)
          : (settings.calligraphyIfNone ?? []).slice(0, 1);
    const shapes =
      settings.ornaments ??
      kept.enabledOrnaments.filter((id) => !isCalligraphy(id));

    const enabledOrnaments = pack.ornaments
      .map((entry) => entry.id)
      .filter((id) =>
        isCalligraphy(id) ? calligraphy.includes(id) : shapes.includes(id),
      );

    ornamentConfig = { ...kept, enabledOrnaments };
  }

  return {
    style: {
      fontPairId: settings.fontPairId ?? design.style.fontPairId,
      paletteId: settings.paletteId ?? design.style.paletteId,
      density: settings.density ?? design.style.density,
      accentOverride:
        settings.accentOverride !== undefined
          ? settings.accentOverride
          : design.style.accentOverride,
    },
    borderStyle: settings.borderStyle ?? design.borderStyle,
    decorMotion: settings.decorMotion ?? design.decorMotion,
    decorIntensity: settings.decorIntensity ?? design.decorIntensity,
    butterflies: settings.butterflies ?? design.butterflies,
    leaves: settings.leaves ?? design.leaves,
    petals: settings.petals ?? design.petals,
    petalFlower: settings.petalFlower ?? design.petalFlower,
    coverAnimation: settings.coverAnimation ?? design.coverAnimation,
    traditionId: preset.tradition,
    ornamentConfig,
  };
}

/**
 * Whether two designs put the same thing on the card.
 *
 * Structural like the editor's dirty check, with one allowance: the ornament
 * list is compared as a set. A host who switches the lantern off and on again
 * has moved it to the end of the list, and that is not a different card.
 */
export function sameDesign(a: DesignState, b: DesignState): boolean {
  const left = a.ornamentConfig.enabledOrnaments;
  const right = b.ornamentConfig.enabledOrnaments;

  return (
    left.length === right.length &&
    left.every((id) => right.includes(id)) &&
    deepEqual(
      { ...a, ornamentConfig: { ...a.ornamentConfig, enabledOrnaments: [] } },
      { ...b, ornamentConfig: { ...b.ornamentConfig, enabledOrnaments: [] } },
    )
  );
}

/**
 * The preset this design is wearing, if it is wearing one exactly.
 *
 * Worked out from the design rather than remembered, so it holds across a tab
 * switch, a reload and a saved card reopened a month later — and so it turns
 * to null the moment the host changes anything the preset set.
 */
export function matchingPreset(design: DesignState): Preset | null {
  return (
    PRESETS.find((preset) => sameDesign(applyPreset(design, preset), design)) ??
    null
  );
}
