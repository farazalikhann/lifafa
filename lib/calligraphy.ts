import { relativeLuminance } from "@/lib/contrast";

/**
 * The pieces of calligraphy a card can carry, and the two inks each is
 * published in.
 *
 * Photographs of lettering rather than drawings, so they live here beside the
 * flower frames and the butterflies rather than in lib/motifs.tsx with the line
 * art. They are script, which is what makes them something this card will
 * carry: the rule at the head of lib/motifs.tsx is that no figure is ever drawn
 * for any tradition, and that where a tradition's emblem is itself a glyph, the
 * glyph is drawn. These are that case.
 *
 * TWO FILES EACH AND NOT ONE TINTED, which is the opposite of how every other
 * ornament works. The rest are strokes in `currentColor` and take whatever
 * colour the card hands them; these are rasters, so the ink is fixed at the
 * point of publishing and the only way to have it both ways is to publish it
 * both ways. For the Arabic pieces that is black and white. For the Gurmukhi
 * ones it cannot be — they are coloured artwork — so the second file is the
 * artwork adjusted for a dark ground rather than recoloured; see `gurmukhi`.
 * The Devanagari pieces are the exception to the exception: supplied as one
 * colour, they are published as a single shape the card tints itself — see
 * `devanagari`.
 *
 * BOTH INKS OF A PIECE ARE THE SAME SHAPE, to the pixel, and that is not a
 * detail. The card picks between them on the fly, so a pair that disagreed on
 * proportion would have a host watching the lettering change size as well as
 * colour when they tried another palette. The Bismillah's two files are cropped
 * to one shared box for that reason. The verse is stronger still: it is one
 * master, and the white is that master's own alpha filled with white — which is
 * also why the glow on the supplied white artwork is not here. A glow lives
 * outside the letters, so keeping it would have made the two inks different
 * shapes, and the parity is worth more than the halo.
 */

export type CalligraphyId =
  | "bismillah"
  | "versePairs"
  | "verseLoveMercy"
  | "barakallah"
  | "barakallahDua"
  | "alhamdulillah"
  | "shubhVivah"
  | "sadarNimantran"
  | "radheKrishna"
  | "shriGaneshaya"
  | "vivahotsav"
  | "ikOnkarCalligraphy"
  | "satnamWaheguru"
  | "shubhVivaah"
  | "guruKirpa"
  | "anandKaraj"
  | "ikDoojeDeSang"
  | "doRoohanIkRaah"
  | "waheguru"
  | "sarbatDaBhala";

/** Which ground the lettering is being laid on. */
export type CalligraphyGround = "light" | "dark";

interface CalligraphyArt {
  /** The published file for each ground. */
  src: Record<CalligraphyGround, string>;
  /**
   * For a piece drawn as a shape rather than a picture: the one file whose
   * alpha is the lettering, which the card fills with its own accent through
   * a CSS mask. Both grounds get the same file, and the colour follows the
   * card's theme instead of being fixed at publishing. See `devanagari`.
   */
  mask?: string;
  /** The published box, width over height. Both inks share it exactly. */
  aspect: number;
  /**
   * What it says, for anyone who cannot see it.
   *
   * A real alt rather than the empty one every other ornament carries, because
   * these are the ornaments that are not ornament: a lantern is a picture on
   * the card and a guest loses nothing by not being told it is there, while
   * these are lines that are read, and on a card where the host has switched
   * the greeting off the calligraphy is the only thing at the head.
   */
  alt: string;
}

/**
 * An Arabic piece published as a black and a white ink, like the verse above.
 *
 * Unlike the Devanagari and Gurmukhi artwork, these are one colour, so the
 * second file really is the same lettering in the other ink rather than an
 * adjustment of it: both are one alpha mask, filled once with black and once
 * with white.
 */
function arabic(slug: string, aspect: number, alt: string): CalligraphyArt {
  return {
    src: {
      light: `/decor/${slug}-black.webp`,
      dark: `/decor/${slug}-white.webp`,
    },
    aspect,
    alt,
  };
}

/**
 * The Devanagari pieces: five, each supplied as white lettering on black.
 *
 * NOT TWO INKS, AND NOT A FIXED COLOUR, unlike every other piece in this file.
 * scripts/cut-flowers.mjs turns each into one white shape whose alpha is the
 * lettering's brightness, and the card draws it as a CSS mask filled with the
 * card's accent — so the lettering is the card's gold on a dark palette and the
 * card's own accent on a cream one, and changes with the theme without a
 * second file. The soft edge of every stroke is the mask's own, so it is as
 * sharp on cream as on ink.
 */
function devanagari(
  slug: string,
  aspect: number,
  alt: string,
): CalligraphyArt {
  const mask = `/decor/calligraphy/${slug}.webp`;

  return { src: { light: mask, dark: mask }, aspect, alt, mask };
}

/**
 * The Gurmukhi pieces, cut from one supplied sheet of nine.
 *
 * Navy and gold where the Devanagari sheet is gold and maroon, and that one
 * difference is why they are not built by `devanagari`. Half this ink is navy,
 * and the Devanagari lift — scale every channel up, mix toward gold — turns
 * navy into a muddy blue-grey that is barely more legible on midnight than the
 * navy was. So the dark file instead moves each pixel toward cream by how dark
 * it is: fully for the navy letters, not at all for the gold that is already
 * bright, and in proportion for everything between, so a gradient stays a
 * gradient. On a dark card the result is cream lettering with its gold
 * flourishes intact.
 *
 * Both files share one box, as every pair here does.
 */
function gurmukhi(slug: string, aspect: number, alt: string): CalligraphyArt {
  return {
    src: {
      light: `/decor/sikh/${slug}-light.webp`,
      dark: `/decor/sikh/${slug}-dark.webp`,
    },
    aspect,
    alt,
  };
}

const ART: Record<CalligraphyId, CalligraphyArt> = {
  /*
    The Basmala, in thuluth. Longer than the "bismillah" greeting in
    lib/arabicContent.ts — that entry is the short form, and this artwork is
    not.
  */
  bismillah: {
    src: {
      light: "/decor/bismillah-black.webp",
      dark: "/decor/bismillah-white.webp",
    },
    aspect: 1024 / 436,
    alt: "Bismillah ir-Rahman ir-Rahim: In the name of Allah, the Most Gracious, the Most Merciful",
  },
  /*
    Surah An-Naba 78:8, which is a verse about marriage and the reason it is
    offered on a card that is mostly wedding invitations. Its English line and
    its reference are set into the artwork rather than rendered beside it, so
    the alt below says both.
  */
  versePairs: {
    src: {
      light: "/decor/verse-pairs-black.webp",
      dark: "/decor/verse-pairs-white.webp",
    },
    aspect: 1024 / 526,
    alt: "And We created you in pairs (Quran 78:8)",
  },

  /*
    Four more, supplied together as black lettering on white paper with no
    alpha. Each was cut the way the verse was: one mask taken from the sheet's
    own darkness, cropped to the lettering and scaled to 1024 wide, then filled
    with black for a light card and white for a dark one — so both inks are the
    same shape to the pixel. See `arabic` below.

    Like the Gurmukhi pieces, the alt says what each is MEANT to read. The two
    that carry the letter jeem — "wa ja'ala" in the verse and "wa jama'a" in the
    dua — were supplied with it drawn undotted, so as published they read with
    a hah; that is for an Arabic reader to settle against the files, not for
    the alt to paper over.
  */
  /*
    Surah Ar-Rum 30:21, the verse most often read at a nikah. Its English line
    and reference are set into the artwork, as the pairs verse's are.
  */
  verseLoveMercy: arabic(
    "verse-love-mercy",
    1024 / 399,
    "And He placed between you love and mercy (Quran 30:21)",
  ),
  barakallah: arabic(
    "barakallah",
    1024 / 369,
    "Barakallahu lakuma: may Allah bless you both",
  ),
  /* The full wedding dua, of which the piece above is the opening. */
  barakallahDua: arabic(
    "barakallah-dua",
    1024 / 374,
    "Barakallahu lakuma wa jama'a baynakuma fi khayr: may Allah bless you both and unite you in goodness",
  ),
  alhamdulillah: arabic(
    "alhamdulillah",
    1024 / 451,
    "Alhamdulillah: all praise is due to Allah",
  ),

  /* The five Devanagari pieces, in the order the panel offers them. */
  shubhVivah: devanagari(
    "shubh-vivah",
    900 / 643,
    "Shubh Vivah: an auspicious marriage",
  ),
  sadarNimantran: devanagari(
    "sadar-nimantran",
    900 / 433,
    "Sadar Nimantran: a respectful invitation",
  ),
  shriGaneshaya: devanagari(
    "shri-ganeshaya-namah",
    900 / 472,
    "Shri Ganeshaya Namah: salutations to Shri Ganesha",
  ),
  vivahotsav: devanagari(
    "vivahotsav",
    900 / 531,
    "Vivahotsav: the wedding celebration",
  ),
  radheKrishna: devanagari("radhe-krishna", 900 / 706, "Radhe Krishna"),

  /*
    The nine Gurmukhi pieces, in the order the sheet set them out.

    The alt text says what each piece is MEANT to read. It is not a claim that
    the lettering in the artwork is spelt that way — that is a question for a
    Punjabi reader looking at the files, and see the note above SIKH_ORNAMENTS
    in lib/ornaments/sikh.tsx for why it matters more here than anywhere else.
  */
  ikOnkarCalligraphy: gurmukhi(
    "ik-onkar",
    434 / 324,
    "Ik Onkar: One Creator",
  ),
  satnamWaheguru: gurmukhi(
    "satnam-waheguru",
    422 / 283,
    "Satnam Waheguru",
  ),
  shubhVivaah: gurmukhi(
    "shubh-vivaah",
    471 / 359,
    "Shubh Vivaah: an auspicious marriage",
  ),
  guruKirpa: gurmukhi(
    "guru-kirpa",
    453 / 270,
    "Guru Kirpa Sada Rahe: with the Guru's blessings always",
  ),
  anandKaraj: gurmukhi(
    "anand-karaj",
    491 / 295,
    "Anand Karaj: the Sikh wedding ceremony",
  ),
  ikDoojeDeSang: gurmukhi(
    "ik-dooje-de-sang",
    442 / 269,
    "Ik Dooje De Sang: together, in faith",
  ),
  doRoohanIkRaah: gurmukhi(
    "do-roohan-ik-raah",
    513 / 241,
    "Do Roohan Ik Raah: two souls, one journey",
  ),
  waheguru: gurmukhi("waheguru", 392 / 289, "Waheguru: always with us"),
  sarbatDaBhala: gurmukhi(
    "sarbat-da-bhala",
    471 / 182,
    "Sarbat Da Bhala: may all be well",
  ),
};

/**
 * Which ink to use on a given background.
 *
 * The card's own background, never the guest's system theme. A guest reading an
 * invitation in a dark room is still reading whatever palette the host chose,
 * and `prefers-color-scheme` says nothing about that — a card set in cream is
 * cream on every device, and black is the ink it wants.
 *
 * 0.5 relative luminance is the crossing point, which places every palette the
 * card ships with comfortably on one side or the other rather than near the
 * line: ink, forest and midnight all land at 0.005, and cream, blush and sand
 * between 0.80 and 0.89. A threshold rather than a contrast measurement, and it
 * can be, because nothing here is near the middle — each piece has one file for
 * either half of the scale and no card lands between them.
 */
export function calligraphyGround(background: string): CalligraphyGround {
  return relativeLuminance(background) >= 0.5 ? "light" : "dark";
}

export function calligraphySrc(
  id: CalligraphyId,
  ground: CalligraphyGround,
): string {
  return ART[id].src[ground];
}

export function calligraphyAspect(id: CalligraphyId): number {
  return ART[id].aspect;
}

export function calligraphyAlt(id: CalligraphyId): string {
  return ART[id].alt;
}

/** The mask file for a piece drawn as a shape, or null for one drawn as a picture. */
export function calligraphyMask(id: CalligraphyId): string | null {
  return ART[id].mask ?? null;
}

/**
 * Hindu calligraphy that has been taken out of the pack, and what a card that
 * chose one gets instead.
 *
 * Nine pieces became five. A card saved with one of the four that went still
 * has its id in `enabledOrnaments`, and would otherwise lose its heading
 * without a word — so it is read as Shubh Vivah, the piece every one of the
 * four stood nearest to. Read, not rewritten: the stored card changes only
 * when its host next saves it.
 */
const RETIRED_CALLIGRAPHY: Readonly<Record<string, CalligraphyId>> = {
  togetherForever: "shubhVivah",
  mangalParinay: "shubhVivah",
  madhurMilan: "shubhVivah",
  shubhLabh: "shubhVivah",
};

/**
 * A card's ornament list with retired calligraphy mapped to its replacement,
 * each id once. Anything else it does not know it passes through untouched —
 * the card skips an id its pack cannot find rather than failing on it.
 */
export function withoutRetiredCalligraphy<T extends string>(
  ids: readonly T[],
): readonly T[] {
  if (!ids.some((id) => id in RETIRED_CALLIGRAPHY)) {
    return ids;
  }

  const mapped: T[] = [];
  for (const id of ids) {
    const next = (RETIRED_CALLIGRAPHY[id] ?? id) as T;
    if (!mapped.includes(next)) {
      mapped.push(next);
    }
  }

  return mapped;
}
