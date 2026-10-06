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
  | "anandKaraj"
  | "shubhViah"
  | "satnamWaheguru"
  | "waheguru"
  | "guruKirpa"
  | "sarbatDaBhala"
  | "godIsLove"
  | "loveNeverFails"
  | "twoBecomeOne"
  | "godHasJoined"
  | "holyMatrimony"
  | "loveIsPatient"
  | "jainJaiJinendra"
  | "jainShubhVivah"
  | "jainMangalParinay"
  | "jainNamoArihantanam"
  | "jainShriMahaviraya";

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
  const mask = `/decor/calligraphy/sikh/${slug}.webp`;

  return { src: { light: mask, dark: mask }, aspect, alt, mask };
}

/**
 * The English pieces for a Christian card: six lines in a copperplate hand,
 * each supplied as black lettering on a transparent ground.
 *
 * Published as shapes, like the Devanagari and Gurmukhi ones: one file whose
 * alpha is the lettering, filled with the card's accent through a CSS mask,
 * so the line is the card's own colour on every palette and no second ink is
 * needed.
 */
function english(slug: string, aspect: number, alt: string): CalligraphyArt {
  const mask = `/decor/calligraphy/christian/${slug}.webp`;

  return { src: { light: mask, dark: mask }, aspect, alt, mask };
}

/**
 * The Devanagari pieces for a Jain card: five lines in a brush hand, each
 * supplied as black lettering on a transparent ground.
 *
 * Published as shapes, like every piece since the Arabic ones: one file whose
 * alpha is the lettering, filled with the card's accent through a CSS mask.
 * In a folder and under ids of their own, though two of them say what a Hindu
 * piece says: "shubhVivah" is the Hindu pack's artwork, and "mangalParinay"
 * is a retired Hindu id that RETIRED_CALLIGRAPHY below reads as Shubh Vivah.
 * Each pack owns its own artwork, so every id here is prefixed.
 */
function jain(slug: string, aspect: number, alt: string): CalligraphyArt {
  const mask = `/decor/calligraphy/jain/${slug}.webp`;

  return { src: { light: mask, dark: mask }, aspect, alt, mask };
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
    The six Gurmukhi pieces, in the order the panel offers them. Published as
    shapes, like the Devanagari ones, and filled with the card's accent.

    Each was read letter by letter against the text beside it before it was
    published, and each agrees: the letters, the vowel signs, the tippi in
    ਆਨੰਦ, the bindi under ਸ਼, the sihari in ਸਤਿਨਾਮ and ਵਾਹਿਗੁਰੂ, the addak in
    ਸਰਬੱਤ. That is a reading by eye against a font, not a Punjabi reader's
    review, and it is worth one before a card is printed from these.

    They replace nine earlier pieces. The four of those with no successor are
    in RETIRED_CALLIGRAPHY below.
  */
  /* ਆਨੰਦ ਕਾਰਜ */
  anandKaraj: gurmukhi(
    "anand-karaj",
    900 / 387,
    "Anand Karaj: the Sikh wedding ceremony",
  ),
  /* ਸ਼ੁਭ ਵਿਆਹ */
  shubhViah: gurmukhi("shubh-viah", 900 / 455, "Shubh Viah: an auspicious marriage"),
  /* ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ */
  satnamWaheguru: gurmukhi("satnam-waheguru", 900 / 326, "Satnam Waheguru"),
  /* ਵਾਹਿਗੁਰੂ */
  waheguru: gurmukhi("waheguru", 900 / 372, "Waheguru"),
  /* ਗੁਰੂ ਕਿਰਪਾ ਸਦਾ ਰਹੇ */
  guruKirpa: gurmukhi(
    "guru-kirpa",
    900 / 185,
    "Guru Kirpa Sada Rahe: may the Guru's grace always remain",
  ),
  /* ਸਰਬੱਤ ਦਾ ਭਲਾ */
  sarbatDaBhala: gurmukhi(
    "sarbat-da-bhala",
    900 / 201,
    "Sarbat Da Bhala: may all be well",
  ),

  /*
    The six English pieces, in the order the panel offers them. Each was read
    letter by letter before it was published and each is spelt as its alt
    says. The alt is the line itself: it is English, and needs no gloss.
  */
  godIsLove: english("god-is-love", 900 / 288, "God is Love"),
  loveNeverFails: english("love-never-fails", 900 / 193, "Love Never Fails"),
  twoBecomeOne: english("two-become-one", 900 / 163, "Two Shall Become One"),
  godHasJoined: english("god-has-joined", 900 / 421, "What God Has Joined Together"),
  holyMatrimony: english("holy-matrimony", 900 / 191, "Holy Matrimony"),
  loveIsPatient: english("love-is-patient", 900 / 409, "Love is Patient, Love is Kind"),

  /*
    The five Jain pieces, in the order the panel offers them. Each was read
    letter by letter against the text beside it before it was published, and
    each agrees: the anusvara in मंगल, हं and णं, the short i before र in परिणय
    and अरिहंताणं, the long i in श्री and वी, the visarga closing नमः, and the
    न्द्र conjunct in जिनेन्द्र. That is a reading by eye, not a Jain reader's
    review; see the TODO at the head of lib/jainContent.ts.
  */
  /* जय जिनेन्द्र */
  jainJaiJinendra: jain("jai-jinendra", 900 / 300, "Jai Jinendra: victory to the Jinas"),
  /* शुभ विवाह */
  jainShubhVivah: jain("shubh-vivah", 900 / 311, "Shubh Vivah: an auspicious marriage"),
  /* मंगल परिणय */
  jainMangalParinay: jain("mangal-parinay", 900 / 225, "Mangal Parinay: an auspicious wedding"),
  /* णमो अरिहंताणं */
  jainNamoArihantanam: jain(
    "namo-arihantanam",
    900 / 220,
    "Namo Arihantanam: I bow to the Arihants",
  ),
  /* श्री महावीराय नमः */
  jainShriMahaviraya: jain(
    "shri-mahaviraya-namah",
    900 / 185,
    "Shri Mahaviraya Namah: salutations to Lord Mahavira",
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
 * The calligraphy that says, word for word, what one of its pack's greetings
 * says: the piece's id, and that greeting's row id in the pack's content file.
 *
 * A card heads with its calligraphy and sets its greeting directly under it,
 * so a card with both of a pair here said the same phrase twice, once as
 * lettering and once as type. The card shows the lettering and skips the
 * greeting while the two are together; see greetingSaidByCalligraphy.
 *
 * ONLY A PAIR THAT IS THE SAME PHRASE. The Basmala is not here: the artwork is
 * the whole of it and the "bismillah" greeting is its short form. Waheguru is
 * not here either: no greeting is that one word.
 */
const GREETING_SAID_BY: Partial<Record<CalligraphyId, string>> = {
  /* जय जिनेन्द्र */
  jainJaiJinendra: "jaiJinendra",
  /* णमो अरिहंताणं */
  jainNamoArihantanam: "navkarOpening",
  /* श्री गणेशाय नमः */
  shriGaneshaya: "ganeshaya",
  /* ਸਤਿਨਾਮ ਵਾਹਿਗੁਰੂ */
  satnamWaheguru: "satNaam",
};

/**
 * Whether the calligraphy on the card already says its greeting.
 *
 * Read when the card is drawn and never written back: the host's greeting
 * stays chosen and stays saved, and is on the card again the moment they pick
 * another piece of calligraphy or take this one off. `ornamentIds` is the
 * card's list after withOneCalligraphy, so the one piece in it is the one
 * that heads the card.
 */
export function greetingSaidByCalligraphy(
  greetingId: string | null,
  ornamentIds: readonly string[],
): boolean {
  return (
    greetingId !== null &&
    ornamentIds.some((id) => GREETING_SAID_BY[id as CalligraphyId] === greetingId)
  );
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
  /*
    The four Sikh pieces that went when the set was replaced. A card saved with
    one opens with Anand Karaj, the piece that names the ceremony itself. The
    other five kept their ids and show the new artwork.
  */
  ikOnkarCalligraphy: "anandKaraj",
  shubhVivaah: "anandKaraj",
  ikDoojeDeSang: "anandKaraj",
  doRoohanIkRaah: "anandKaraj",
};

/**
 * A card's ornament list with retired calligraphy mapped to its replacement,
 * each id once, where it last appears — the list's order is the order the host
 * chose in, which is what withOneCalligraphy reads. Anything else it does not
 * know it passes through untouched — the card skips an id its pack cannot find
 * rather than failing on it.
 */
export function withoutRetiredCalligraphy<T extends string>(
  ids: readonly T[],
): readonly T[] {
  if (!ids.some((id) => id in RETIRED_CALLIGRAPHY)) {
    return ids;
  }

  const mapped = ids.map((id) => (RETIRED_CALLIGRAPHY[id] ?? id) as T);
  return mapped.filter((id, index) => mapped.lastIndexOf(id) === index);
}

/**
 * A card's ornament list with at most one piece of calligraphy in it.
 *
 * A card heads with one line of calligraphy, never two stacked. A card saved
 * while the panel still allowed several keeps the one added last — the panel
 * has always appended as it adds, so the last in the list is the host's most
 * recent choice — and everything that is not calligraphy passes through in
 * its order. Works for any tradition: the pack's own list says what counts.
 */
export function withOneCalligraphy<T extends string>(
  ids: readonly T[],
  calligraphyIds: readonly string[],
): readonly T[] {
  const pieces = ids.filter((id) => calligraphyIds.includes(id));

  if (pieces.length <= 1) {
    return ids;
  }

  const kept = pieces[pieces.length - 1];
  return ids.filter((id) => id === kept || !calligraphyIds.includes(id));
}

/**
 * The ornament list after a tap on a calligraphy tile: the tapped piece
 * replaces whichever one the card had, and tapping the chosen piece again
 * takes it off, so a card can head with none.
 */
export function tapCalligraphy<T extends string>(
  ids: readonly T[],
  calligraphyIds: readonly string[],
  id: T,
): readonly T[] {
  const others = ids.filter((current) => !calligraphyIds.includes(current));
  return ids.includes(id) ? others : [...others, id];
}
