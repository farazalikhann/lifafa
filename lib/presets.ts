import { deepEqual } from "@/lib/deepEqual";
import type { DesignState } from "@/lib/designDefaults";
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import { fitContrast } from "@/lib/contrast";
import { getPalette } from "@/lib/palettes";
import {
  PRIMARY_MIN_RATIO,
  SECONDARY_MIN_RATIO,
  getTextPair,
  paletteTextColors,
  type TextPairId,
} from "@/lib/textColors";
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
 * greeting and the dua are never changed either — those are words a family
 * chose to put on their card, and a palette click must not choose them again;
 * a card with none gets the preset's, and only then.
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
interface PresetSettings {
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
  /**
   * The text pair whose two inks the look is set in, on the look's own
   * palette: the pair's card colour is not taken, only its Primary and
   * Secondary. A preset that names none gets the pair nearest its palette.
   */
  textPairId?: TextPairId;
  /**
   * The royal scroll, on a look that has its date unroll. A look that names
   * no reveal has none of its own: it takes the scroll off a card that had
   * one from another look, and leaves a scratch panel or a plain date as the
   * host had it.
   */
  dateReveal?: "scroll";
  /**
   * The royal texture, on a look that is woven with it. Only ever turned on:
   * a look that does not name it leaves the card's ground as the host had it.
   */
  royalTexture?: true;
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
  /**
   * The opening greeting and blessing (the shlok, on a Hindu card) a card gets
   * when it has none: a pack row id each. Only ever added — a family's own
   * choice, "none" included, is words on their card and a preset never
   * replaces it — and never taken away when another preset is chosen.
   */
  greetingIfNone: string;
  blessingIfNone: string;
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
 * The Blush palette's terracotta, which is also the Haldi Saffron pair's own
 * accent: the nearest thing the card has to kesri, lent to Sand. From
 * lib/palettes.ts and lib/textColors.ts rather than invented, and 5.1:1 on
 * Sand's background.
 */
const PALETTE_KESRI = "#974B2E";

/** The Champagne Classic pair's own gold, the one gold the card has that reads on a pale ground. */
const PALETTE_CHAMPAGNE = "#86672E";

/**
 * The presets, in the order the picker lays them out.
 *
 * Four Nikah looks, each pulling a different way — soft, regal, night-time,
 * plain — so that no two read as the same card in a different colour. Then
 * four Vivah looks, three of them taken from cards the Lifafa team designed by
 * hand in the editor — ivory with the Ivory frame, ivory with the blossom
 * frame, blush with a toran — and a fourth, the same card in Maroon and gold.
 *
 * EVERY VIVAH PRESET SETS EVERYTHING IT IS ABOUT: the palette and accent, the
 * type, the length, the border, the motifs' motion and amount, the
 * butterflies, the leaves, the petals and their flower, the cover, the one
 * calligraphy and the whole of the top border, the place above the names and
 * the corners. So moving from one to the next leaves nothing of the first
 * behind; a slot a look leaves empty is emptied. Ganesh is only ever above the
 * names, and never on a card whose word-mark already draws him (Shubh Vivah).
 * The greeting and the shlok the designs open with are only ever added to a
 * card that has none — see `greetingIfNone`.
 *
 * THEN FOUR ANAND KARAJ LOOKS, built the way the Vivah ones are: each sets
 * everything it is about, its one word-mark included. Each is led by a
 * different piece of the Sikh pack — the khanda, the phulkari band, the
 * gurdwara arch, the Nishan Sahib — on a different ground, so the four are
 * four cards. Only the pack's own emblems, architecture and plants: no figure,
 * and nothing from another tradition. The words they open with are the pack's
 * own rows in lib/gurmukhiContent.ts, added only to a card that has none.
 *
 * THEN FOUR JAIN VIVAH LOOKS, built the same way, each on a different ground
 * and headed by a different word-mark. The swastika, the ahimsa hand and the
 * Siddhashila are emblems of the faith and are only ever above the names, one
 * to a look, which is the only place the pack draws them. The toran, the
 * kalash and the lotus are the rest: no figure, no face, and nothing from
 * another tradition. The words are the pack's own rows in lib/jainContent.ts,
 * added only to a card that has none. Where a look's word-mark is Jai
 * Jinendra, the greeting it adds is the Navkar's opening line instead: the
 * card does not draw a greeting its calligraphy already says (see
 * greetingSaidByCalligraphy in lib/calligraphy.ts).
 *
 * THEN THREE BUDDHIST VIVAH LOOKS, built the same way: ivory, saffron and
 * midnight, each headed by a different word-mark and hung with the prayer
 * flags. The dharma wheel, the endless knot and the stupa are emblems of the
 * faith and are only ever above the names, one to a look. The lotus, the
 * Bodhi leaf and the conch are the corners. No figure and no face: the Buddha
 * is never drawn. The words are the pack's own rows in lib/buddhistContent.ts,
 * added only to a card that has none.
 */
const PRESETS: readonly Preset[] = [
  {
    id: "nikah-blush",
    name: "Nikah Blush",
    description: "Soft blush, a flower frame, lanterns and butterflies.",
    tradition: "muslim",
    settings: {
      paletteId: "blush",
      textPairId: "ivoryRose",
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
      textPairId: "midnightGold",
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
      textPairId: "midnightGold",
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
      textPairId: "champagneClassic",
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
    id: "shubh-vivah-ivory",
    name: "Shubh Vivah",
    description: "Ivory and rose, a marigold garland, Om and kalash.",
    tradition: "hindu",
    settings: {
      paletteId: "cream",
      textPairId: "ivoryRose",
      dateReveal: "scroll",
      accentOverride: null,
      fontPairId: "royal",
      density: "comfortable",
      borderStyle: "flowerIvory",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "red",
      leaves: false,
      petals: "both",
      petalFlower: "lotus",
      coverAnimation: "fold-unfold",
      /* Om rather than Ganesh above the names: Shubh Vivah already draws Ganesh. */
      ornaments: ["marigold", "om", "kalash"],
      calligraphy: "shubhVivah",
      greetingIfNone: "ganeshaya",
      blessingIfNone: "vakratunda",
    },
  },
  {
    id: "shri-ganesh-blossom",
    name: "Shri Ganesh",
    description: "Ivory with a blossom frame, a marigold garland, Om and kalash.",
    tradition: "hindu",
    settings: {
      paletteId: "cream",
      textPairId: "haldiSaffron",
      dateReveal: "scroll",
      accentOverride: null,
      fontPairId: "royal",
      density: "comfortable",
      borderStyle: "flowerBackground",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "red",
      leaves: false,
      petals: "both",
      petalFlower: "lotus",
      coverAnimation: "fold-unfold",
      /* Kalash alone in the corners stands in both, the right one mirrored. */
      ornaments: ["marigold", "om", "kalash"],
      calligraphy: "shriGaneshaya",
      greetingIfNone: "ganeshaya",
      blessingIfNone: "vakratunda",
    },
  },
  {
    id: "toran-blush",
    name: "Toran Blush",
    description: "Soft blush with a blossom frame, a toran, Om and diyas.",
    tradition: "hindu",
    settings: {
      paletteId: "blush",
      textPairId: "ivoryRose",
      accentOverride: null,
      fontPairId: "royal",
      density: "comfortable",
      borderStyle: "flowerBackground",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "red",
      leaves: false,
      petals: "both",
      petalFlower: "lotus",
      coverAnimation: "fold-unfold",
      ornaments: ["toran", "om", "diya"],
      calligraphy: "shriGaneshaya",
      greetingIfNone: "ganeshaya",
      blessingIfNone: "vakratunda",
    },
  },
  {
    id: "maroon-royal",
    name: "Maroon Royal",
    description: "Maroon and gold, a marigold garland, Om, diya and kalash.",
    tradition: "hindu",
    settings: {
      paletteId: "maroon",
      textPairId: "royalMaroon",
      accentOverride: null,
      fontPairId: "royal",
      density: "comfortable",
      /* Noir's slim gold line and cream roses: a photo frame that holds on a dark ground. */
      borderStyle: "flowerNoir",
      decorMotion: "float",
      decorIntensity: "subtle",
      /* Yellow, not red: red wings disappear into maroon, as rose petals do. */
      butterflies: "yellow",
      leaves: false,
      petals: "both",
      petalFlower: "marigold",
      coverAnimation: "envelope-seal",
      ornaments: ["marigold", "om", "diya", "kalash"],
      calligraphy: "shubhVivah",
      greetingIfNone: "ganeshaya",
      blessingIfNone: "vakratunda",
    },
  },
  {
    id: "kesri-anand-karaj",
    name: "Kesri Anand Karaj",
    description: "Warm sand and saffron, the Khanda, lotuses and rose petals.",
    tradition: "sikh",
    settings: {
      paletteId: "sand",
      textPairId: "haldiSaffron",
      /* Sand's own accent is brown; the word-mark and the rules want kesri. */
      accentOverride: PALETTE_KESRI,
      fontPairId: "royal",
      density: "comfortable",
      borderStyle: "flowerGold",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "red",
      leaves: false,
      petals: "open",
      petalFlower: "rose",
      coverAnimation: "envelope-seal",
      ornaments: ["khanda", "lotus"],
      calligraphy: "anandKaraj",
      greetingIfNone: "ikOnkar",
      blessingIfNone: "anandBlessing",
    },
  },
  {
    id: "phulkari-blush",
    name: "Phulkari Blush",
    description: "Festive blush with the phulkari border, lotuses and butterflies.",
    tradition: "sikh",
    settings: {
      paletteId: "blush",
      textPairId: "ivoryRose",
      accentOverride: null,
      fontPairId: "romantic",
      density: "comfortable",
      /* No frame: the phulkari band is the border, and a second one would crowd it. */
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "normal",
      butterflies: "yellow",
      leaves: false,
      petals: "both",
      petalFlower: "lotus",
      coverAnimation: "petal-dust",
      ornaments: ["kandaFloralBorder", "lotus"],
      calligraphy: "shubhViah",
      greetingIfNone: "ikOnkar",
      blessingIfNone: "anandBlessing",
    },
  },
  {
    id: "gurdwara-ivory",
    name: "Gurdwara Ivory",
    description: "Calm ivory and gold, the names under a gurdwara arch.",
    tradition: "sikh",
    settings: {
      paletteId: "cream",
      textPairId: "champagneClassic",
      /* Cream's own accent is rose; this look is ivory and gold. */
      accentOverride: PALETTE_CHAMPAGNE,
      fontPairId: "elegant",
      density: "airy",
      borderStyle: "none",
      decorMotion: "drift",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      /* A few white petals as the card opens, and then nothing moving over the arch. */
      petals: "open",
      petalFlower: "mogra",
      coverAnimation: "fold-unfold",
      ornaments: ["gurudwaraArch"],
      calligraphy: "satnamWaheguru",
      greetingIfNone: "ikOnkar",
      blessingIfNone: "anandBlessing",
    },
  },
  {
    id: "royal-midnight",
    name: "Royal Midnight",
    description: "Night blue and gold, the Nishan Sahib and the Khanda.",
    tradition: "sikh",
    settings: {
      paletteId: "midnight",
      textPairId: "midnightGold",
      dateReveal: "scroll",
      /* Midnight's own accent is already gold. */
      accentOverride: null,
      fontPairId: "regal",
      density: "comfortable",
      borderStyle: "flowerNoir",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "none",
      coverAnimation: "curtain-reveal",
      ornaments: ["khanda", "nishanSahibPennant"],
      calligraphy: "waheguru",
      greetingIfNone: "ikOnkar",
      blessingIfNone: "anandBlessing",
    },
  },
  {
    id: "jinendra-ivory",
    name: "Jinendra Ivory",
    description: "Ivory, maroon and gold, a toran, the swastika and lotus petals.",
    tradition: "jain",
    settings: {
      paletteId: "cream",
      /* Maroon for the second ink, and gold for the word-mark and the rules. */
      textPairId: "ivoryRose",
      accentOverride: PALETTE_CHAMPAGNE,
      fontPairId: "royal",
      density: "comfortable",
      /* No frame: the toran is the border, and a second one would crowd it. */
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "open",
      petalFlower: "lotus",
      coverAnimation: "fold-unfold",
      ornaments: ["tornGate", "swastika"],
      calligraphy: "jainJaiJinendra",
      /* Not Jai Jinendra: the word-mark already says it. */
      greetingIfNone: "navkarOpening",
      blessingIfNone: "mangalBlessing",
    },
  },
  {
    id: "mahavir-saffron",
    name: "Mahavir Saffron",
    description: "Warm sand and saffron, a toran, the Siddhashila and kalash.",
    tradition: "jain",
    settings: {
      paletteId: "sand",
      textPairId: "haldiSaffron",
      /* Sand's own accent is brown; the word-mark and the rules want saffron. */
      accentOverride: PALETTE_KESRI,
      fontPairId: "royal",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "open",
      petalFlower: "marigold",
      coverAnimation: "envelope-seal",
      /* Kalash alone in the corners stands in both, the right one mirrored. */
      ornaments: ["tornGate", "siddhaShila", "kalash"],
      calligraphy: "jainShriMahaviraya",
      greetingIfNone: "jaiJinendra",
      blessingIfNone: "mangalBlessing",
    },
  },
  {
    id: "lotus-blush",
    name: "Lotus Blush",
    description: "Soft blush, lotuses, the ahimsa hand, petals and butterflies.",
    tradition: "jain",
    settings: {
      paletteId: "blush",
      textPairId: "ivoryRose",
      accentOverride: null,
      fontPairId: "romantic",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "yellow",
      leaves: false,
      petals: "both",
      petalFlower: "lotus",
      coverAnimation: "petal-dust",
      /* No toran: the top of this one is left to the hand and the word-mark. */
      ornaments: ["ahimsaHand", "lotus"],
      calligraphy: "jainShubhVivah",
      greetingIfNone: "jaiJinendra",
      blessingIfNone: "mangalBlessing",
    },
  },
  {
    id: "royal-midnight-jain",
    name: "Royal Midnight Jain",
    description: "Night blue and gold, a toran, the swastika and kalash.",
    tradition: "jain",
    settings: {
      paletteId: "midnight",
      textPairId: "midnightGold",
      /* Midnight's own accent is already gold. */
      accentOverride: null,
      fontPairId: "regal",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "none",
      coverAnimation: "curtain-reveal",
      ornaments: ["tornGate", "swastika", "kalash"],
      calligraphy: "jainMangalParinay",
      greetingIfNone: "jaiJinendra",
      blessingIfNone: "mangalBlessing",
    },
  },
  {
    id: "bodhi-ivory",
    name: "Bodhi Ivory",
    description: "Ivory, maroon and gold, prayer flags, the dharma wheel and a Bodhi leaf.",
    tradition: "buddhist",
    settings: {
      paletteId: "cream",
      /* Maroon for the second ink, and gold for the word-mark and the rules. */
      textPairId: "ivoryRose",
      accentOverride: PALETTE_CHAMPAGNE,
      fontPairId: "royal",
      density: "comfortable",
      /* No frame: the flags are the border, and a second one would crowd them. */
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "none",
      coverAnimation: "fold-unfold",
      /* The lotus at the left and the Bodhi leaf at the right: the pack's own order. */
      ornaments: ["prayerFlagString", "dharmaWheel", "lotus", "bodhiLeaf"],
      calligraphy: "buddhistBuddhamSaranam",
      greetingIfNone: "namoBuddhaya",
      /* The Mangala Sutta's verse on the home: the pack's wedding blessing. */
      blessingIfNone: "unionBlessing",
    },
  },
  {
    id: "lotus-saffron",
    name: "Lotus Saffron",
    description: "Warm sand and saffron, prayer flags, the endless knot and lotuses.",
    tradition: "buddhist",
    settings: {
      paletteId: "sand",
      textPairId: "haldiSaffron",
      /* Sand's own accent is brown; the word-mark and the rules want saffron. */
      accentOverride: PALETTE_KESRI,
      fontPairId: "royal",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      /* A few lotus petals as the card opens, and then none. */
      petals: "open",
      petalFlower: "lotus",
      coverAnimation: "petal-dust",
      /* The lotus alone in the corners stands in both, the right one mirrored. */
      ornaments: ["prayerFlagString", "endlessKnot", "lotus"],
      calligraphy: "buddhistMangalParinay",
      greetingIfNone: "namoBuddhaya",
      blessingIfNone: "unionBlessing",
    },
  },
  {
    id: "royal-midnight-bodhi",
    name: "Royal Midnight Bodhi",
    description: "Night blue and gold on the royal texture, prayer flags, a stupa and the conch.",
    tradition: "buddhist",
    settings: {
      paletteId: "midnight",
      textPairId: "midnightGold",
      /* Midnight's own accent is already gold. */
      accentOverride: null,
      fontPairId: "regal",
      density: "comfortable",
      borderStyle: "none",
      decorMotion: "float",
      decorIntensity: "subtle",
      butterflies: "none",
      leaves: false,
      petals: "none",
      royalTexture: true,
      coverAnimation: "curtain-reveal",
      /* The conch alone in the corners stands in both, the same way round: it is never mirrored. */
      ornaments: ["prayerFlagString", "stupaOutline", "conchShell"],
      calligraphy: "buddhistShubhVivah",
      greetingIfNone: "namoBuddhaya",
      blessingIfNone: "unionBlessing",
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
  sikh: "Anand Karaj",
  jain: "Jain Vivah",
  buddhist: "Buddhist Vivah",
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
 * The greeting and the dua or shlok are never changed or removed; a card with
 * none of either gets the preset's own, if it names one.
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

    /* Words only where the card has none, and only ones the pack has. */
    const fill = (current: string | null, wanted: string | undefined): string | null =>
      current === null && wanted !== undefined && pack.findGreeting(wanted) !== null
        ? wanted
        : current;
    const fillBlessing = (current: string | null, wanted: string | undefined): string | null =>
      current === null && wanted !== undefined && pack.findBlessing(wanted) !== null
        ? wanted
        : current;

    ornamentConfig = {
      ...kept,
      enabledOrnaments,
      greetingId: fill(kept.greetingId, settings.greetingIfNone),
      blessingId: fillBlessing(kept.blessingId, settings.blessingIfNone),
    };
  }

  /*
    The look's two inks, on the palette it ends up with. A preset's inks are
    the look's, not a choice the host made, so a palette picked afterwards
    brings its own.
  */
  const paletteId = settings.paletteId ?? design.style.paletteId;
  const card = getPalette(paletteId).background;
  const textColors =
    settings.textPairId === undefined
      ? paletteTextColors(paletteId)
      : {
          textPrimary: fitContrast(
            getTextPair(settings.textPairId).primary,
            card,
            PRIMARY_MIN_RATIO,
          ),
          textSecondary: fitContrast(
            getTextPair(settings.textPairId).secondary,
            card,
            SECONDARY_MIN_RATIO,
          ),
          cardColor: null,
          accent: null,
          chosen: false,
        };

  return {
    style: {
      fontPairId: settings.fontPairId ?? design.style.fontPairId,
      paletteId,
      density: settings.density ?? design.style.density,
      accentOverride:
        settings.accentOverride !== undefined
          ? settings.accentOverride
          : design.style.accentOverride,
      textColors,
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
    ...(settings.royalTexture === true || design.royalTexture === true
      ? { royalTexture: true as const }
      : null),
    ...(settings.dateReveal !== undefined
      ? { dateReveal: settings.dateReveal }
      : design.dateReveal === "scroll"
        ? { dateReveal: "simple" as const }
        : design.dateReveal !== undefined
          ? { dateReveal: design.dateReveal }
          : null),
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
  /*
    A card saved before there were text pairs has none, and is still wearing
    the preset it was saved in: the inks are left out of the comparison for it.
  */
  const hasInks = design.style.textColors !== undefined;

  return (
    PRESETS.find((preset) => {
      const applied = applyPreset(design, preset);

      /* And the same for the date's reveal, on a card saved before there was a choice of one. */
      const compared = { ...applied };
      if (design.dateReveal === undefined) {
        delete compared.dateReveal;
      }

      if (!hasInks) {
        const style = { ...applied.style };
        delete style.textColors;
        return sameDesign({ ...compared, style }, design);
      }

      return sameDesign(compared, design);
    }) ?? null
  );
}
