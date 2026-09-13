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
 * both ways. For the Arabic pieces that is black and white. For the Devanagari
 * and Gurmukhi ones it cannot be — they are coloured artwork — so the second
 * file is the artwork adjusted for a dark ground rather than recoloured; see
 * `devanagari` and `gurmukhi` below, which adjust it in two different ways for
 * two different reasons.
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
  | "shubhVivah"
  | "sadarNimantran"
  | "radheKrishna"
  | "shriGaneshaya"
  | "vivahotsav"
  | "togetherForever"
  | "mangalParinay"
  | "madhurMilan"
  | "shubhLabh"
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
 * The Devanagari pieces, cut from one supplied sheet of nine.
 *
 * Their two files are not two inks the way the Arabic ones are — this artwork
 * is gold and maroon, not black, so there is no second colour it could simply
 * be set in. The light file is the artwork as drawn. The dark file is that
 * artwork with each pixel's channels scaled up together until its brightest
 * reaches 215 and then mixed three parts in ten toward gold: scaling all three
 * channels by one factor holds the hue exactly, the ceiling leaves the gold
 * that was already bright alone, and the gold mix keeps the lifted maroon from
 * arriving as neon orange. Without it "Mangal Parinay" and "Madhur Milan" were
 * very nearly invisible on ink, forest and midnight.
 *
 * Both files are cut from ONE box — the light one's trim, applied to both — for
 * the reason the Bismillah's pair shares a crop: the card picks between them on
 * the fly, and a pair that disagreed on proportion would have a host watching
 * the lettering resize when they tried another palette.
 */
function devanagari(
  slug: string,
  aspect: number,
  alt: string,
): CalligraphyArt {
  return {
    src: {
      light: `/decor/hindu/${slug}-light.webp`,
      dark: `/decor/hindu/${slug}-dark.webp`,
    },
    aspect,
    alt,
  };
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
    alt: "Bismillah ir-Rahman ir-Rahim — In the name of Allah, the Most Gracious, the Most Merciful",
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
    alt: "And We created you in pairs — Quran 78:8",
  },

  /* The nine Devanagari pieces, in the order the sheet set them out. */
  shubhVivah: devanagari(
    "shubh-vivah",
    460 / 342,
    "Shubh Vivah — an auspicious marriage",
  ),
  sadarNimantran: devanagari(
    "sadar-nimantran",
    458 / 235,
    "Sadar Nimantran — a respectful invitation",
  ),
  radheKrishna: devanagari("radhe-krishna", 376 / 320, "Radhe Krishna"),
  shriGaneshaya: devanagari(
    "shri-ganeshaya",
    443 / 310,
    "Shri Ganeshaya Namah — salutations to Shri Ganesha",
  ),
  vivahotsav: devanagari(
    "vivahotsav",
    476 / 282,
    "Vivahotsav — the wedding celebration",
  ),
  togetherForever: devanagari(
    "together-forever",
    426 / 280,
    "Together Forever",
  ),
  mangalParinay: devanagari(
    "mangal-parinay",
    483 / 343,
    "Mangal Parinay — an auspicious union",
  ),
  madhurMilan: devanagari(
    "madhur-milan",
    439 / 229,
    "Madhur Milan — a sweet union",
  ),
  shubhLabh: devanagari(
    "shubh-labh",
    424 / 253,
    "Shubh Labh — auspiciousness and prosperity",
  ),

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
    "Ik Onkar — One Creator",
  ),
  satnamWaheguru: gurmukhi(
    "satnam-waheguru",
    422 / 283,
    "Satnam Waheguru",
  ),
  shubhVivaah: gurmukhi(
    "shubh-vivaah",
    471 / 359,
    "Shubh Vivaah — an auspicious marriage",
  ),
  guruKirpa: gurmukhi(
    "guru-kirpa",
    453 / 270,
    "Guru Kirpa Sada Rahe — with the Guru's blessings always",
  ),
  anandKaraj: gurmukhi(
    "anand-karaj",
    491 / 295,
    "Anand Karaj — the Sikh wedding ceremony",
  ),
  ikDoojeDeSang: gurmukhi(
    "ik-dooje-de-sang",
    442 / 269,
    "Ik Dooje De Sang — together, in faith",
  ),
  doRoohanIkRaah: gurmukhi(
    "do-roohan-ik-raah",
    513 / 241,
    "Do Roohan Ik Raah — two souls, one journey",
  ),
  waheguru: gurmukhi("waheguru", 392 / 289, "Waheguru — always with us"),
  sarbatDaBhala: gurmukhi(
    "sarbat-da-bhala",
    471 / 182,
    "Sarbat Da Bhala — may all be well",
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
