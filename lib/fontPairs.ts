import type { FontPairId } from "@/types/style";

/**
 * Font pairings the host can choose between.
 *
 * Only the CSS variable names live here — every face is declared once through
 * next/font/google in app/layout.tsx and exposed on the html element. Declaring
 * a face is not downloading it: a browser fetches a webfont only when some text
 * on the page is set in it, so a guest's invite pulls the files for its own
 * pair and nothing else. See the note on preloading in app/layout.tsx.
 */
export interface FontPair {
  id: FontPairId;
  label: string;
  headingVar: string;
  bodyVar: string;
  /** Generic family appended after the variable, so text never goes unstyled. */
  headingFallback: string;
  bodyFallback: string;
  /**
   * Headings need an explicit weight because "Inter at heavy weight" cannot be
   * expressed by a family name alone — the modern pair is the same face as its
   * body text and is distinguished only by weight.
   */
  headingWeight: number;
  /**
   * The face for the couple's names on the cover, and for nothing else. Absent
   * means the heading face sets them, which is how the first five pairs work.
   *
   * Kept apart from the heading because the heading face also sets the date,
   * the time, the venue and the countdown, which must stay readable at a
   * glance on a phone. A script face is allowed here and nowhere else.
   */
  names?: NamesFace;
  /**
   * The pair's own Devanagari faces, one per role, as next/font variables
   * declared in app/layout.tsx. Each sits straight after the Latin face of the
   * same role (see pairRoleVar), so a browser sets Latin letters in the Latin
   * face and Devanagari letters in these, even inside one line.
   *
   * A script face (Amita, Tillana) is allowed in `namesHi` and nowhere else,
   * for the same reason `names` is kept apart from the heading.
   */
  namesHi: string;
  headingHi: string;
  bodyHi: string;
}

export interface NamesFace {
  variable: string;
  fallback: string;
  weight: number;
  /**
   * Multiplier on the cover's name size. A script face draws its lowercase far
   * smaller than a serif at the same font-size, so it needs more size to carry
   * the same presence.
   */
  scale: number;
  /**
   * Line height for a name that wraps. Script capitals and descenders reach
   * well past a serif's, and at the serif's 1.05 a wrapped name's two lines
   * run into each other.
   */
  leading: number;
  /**
   * Letter spacing. Zero for a script: its letters are drawn to join, and any
   * tracking pulls the joins apart.
   */
  tracking: string;
  /**
   * Extra room between words. Great Vibes draws its space so narrow that
   * "Mohammad Abdul" reads as one word, so it is opened up; every other face
   * keeps its own.
   */
  wordSpacing: string;
}

export const FONT_PAIRS: readonly FontPair[] = [
  {
    id: "classic",
    label: "Classic",
    headingVar: "--font-display",
    bodyVar: "--font-sans",
    headingFallback: "Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 600,
    /* Martel for the names and headings, Hind for the text. */
    namesHi: "--font-hi-martel",
    headingHi: "--font-hi-martel",
    bodyHi: "--font-hi-hind",
  },
  {
    id: "modern",
    label: "Modern",
    headingVar: "--font-sans",
    /* Manrope, so the text is not Classic's Inter under a heavier heading. */
    bodyVar: "--font-manrope",
    headingFallback: "system-ui, sans-serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 800,
    /* Poppins for the names and headings, Hind for the text. */
    namesHi: "--font-hi-poppins",
    headingHi: "--font-hi-poppins",
    bodyHi: "--font-hi-hind",
  },
  {
    id: "elegant",
    label: "Elegant",
    headingVar: "--font-cormorant",
    /* Raleway: a fine, open sans to sit under Cormorant's thin serif. */
    bodyVar: "--font-raleway",
    headingFallback: "Garamond, Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 600,
    /* Tiro for the names and headings; the text stays in Noto Sans. */
    namesHi: "--font-hi-tiro",
    headingHi: "--font-hi-tiro",
    bodyHi: "--font-devanagari",
  },
  {
    id: "warm",
    label: "Warm",
    headingVar: "--font-lora",
    /* Nunito: rounded terminals, the warmth the pair is named for. */
    bodyVar: "--font-nunito",
    headingFallback: "Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 600,
    /* Laila for the names and headings, Hind for the text. */
    namesHi: "--font-hi-laila",
    headingHi: "--font-hi-laila",
    bodyHi: "--font-hi-hind",
  },
  {
    id: "clean",
    label: "Clean",
    headingVar: "--font-dm-sans",
    bodyVar: "--font-dm-sans",
    headingFallback: "system-ui, sans-serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 700,
    /* Hind throughout, as DM Sans is throughout. */
    namesHi: "--font-hi-hind",
    headingHi: "--font-hi-hind",
    bodyHi: "--font-hi-hind",
  },
  {
    id: "royal",
    label: "Royal",
    headingVar: "--font-cormorant",
    /*
      Montserrat under Cormorant and Great Vibes: three distinct voices, where
      Cormorant set the text as well and the card read as one face throughout.
    */
    bodyVar: "--font-montserrat",
    headingFallback: "Garamond, Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 600,
    /* Amita, a script, for the names only; Tiro for the headings. */
    namesHi: "--font-hi-amita",
    headingHi: "--font-hi-tiro",
    bodyHi: "--font-hi-noto-serif",
    names: {
      variable: "--font-great-vibes",
      fallback: "cursive",
      weight: 400,
      scale: 1.2,
      leading: 1.25,
      tracking: "0",
      wordSpacing: "0.15em",
    },
  },
  {
    id: "regal",
    label: "Regal",
    headingVar: "--font-cinzel",
    bodyVar: "--font-cormorant",
    headingFallback: "Georgia, serif",
    bodyFallback: "Garamond, Georgia, serif",
    headingWeight: 600,
    /* Rozha One for the names and headings, Noto Serif for the text. */
    namesHi: "--font-hi-rozha",
    headingHi: "--font-hi-rozha",
    bodyHi: "--font-hi-noto-serif",
    names: {
      variable: "--font-cinzel",
      fallback: "Georgia, serif",
      weight: 600,
      /* Cinzel has no lowercase, so its capitals are held back a little. */
      scale: 0.85,
      leading: 1.15,
      tracking: "0.02em",
      wordSpacing: "normal",
    },
  },
  {
    id: "romantic",
    label: "Romantic",
    headingVar: "--font-playfair",
    bodyVar: "--font-lora",
    headingFallback: "Georgia, serif",
    bodyFallback: "Georgia, serif",
    headingWeight: 600,
    /*
      Tillana, a script, for the names only; Tiro for the headings, Hind for
      the text. The headings were Kurale, which does not form श्र or the reph:
      "श्री" came out as "शरी" and "शर्मा" with a visible halant.
    */
    namesHi: "--font-hi-tillana",
    headingHi: "--font-hi-tiro",
    bodyHi: "--font-hi-hind",
    names: {
      variable: "--font-parisienne",
      fallback: "cursive",
      weight: 400,
      scale: 1.1,
      leading: 1.25,
      tracking: "0",
      wordSpacing: "normal",
    },
  },
  {
    id: "graceful",
    label: "Graceful",
    headingVar: "--font-marcellus",
    /* Lato: Marcellus is a titling face, and read poorly as running text. */
    bodyVar: "--font-lato",
    headingFallback: "Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    /* Marcellus comes in one weight; asking for more would fake a bold. */
    headingWeight: 400,
    /*
      Amita, a script, for the names only; Tiro, a pen-drawn serif that sits
      beside Amita's calligraphy, for the headings; Noto Serif for the text.
      All three were Kurale, which breaks conjuncts — see Romantic.
    */
    namesHi: "--font-hi-amita",
    headingHi: "--font-hi-tiro",
    bodyHi: "--font-hi-noto-serif",
    names: {
      variable: "--font-pinyon",
      fallback: "cursive",
      weight: 400,
      scale: 1.1,
      leading: 1.3,
      tracking: "0",
      wordSpacing: "normal",
    },
  },
  {
    id: "luxe",
    label: "Luxe",
    headingVar: "--font-bodoni",
    bodyVar: "--font-josefin",
    headingFallback: "Didot, Georgia, serif",
    bodyFallback: "system-ui, sans-serif",
    headingWeight: 500,
    /* Rozha One for the names, Eczar for the headings, Hind for the text. */
    namesHi: "--font-hi-rozha",
    headingHi: "--font-hi-eczar",
    bodyHi: "--font-hi-hind",
    names: {
      variable: "--font-bodoni",
      fallback: "Didot, Georgia, serif",
      weight: 500,
      scale: 1,
      leading: 1.1,
      tracking: "-0.01em",
      wordSpacing: "normal",
    },
  },
];

export const DEFAULT_FONT_PAIR_ID: FontPairId = "classic";

/** The three places a pair sets type: the couple's names, headings, text. */
export type FontRole = "names" | "heading" | "body";

/**
 * The CSS variable holding one role's stack for a pair: its Latin face, then
 * its Devanagari face, e.g. `--pair-royal-names` is Great Vibes then Amita.
 *
 * Set on <html> from PAIR_FONT_STACKS, so it resolves everywhere a card is
 * drawn — the card, the cover over it, the editor's specimens — without any
 * of them having to know the Devanagari face exists. That is also what keeps
 * the download to the card's own pair: nothing names another pair's variable.
 */
export function pairRoleVar(pair: FontPair, role: FontRole): string {
  return `--pair-${pair.id}-${role}`;
}

/** The Latin and the Devanagari face of one role, before either is resolved. */
function roleFaces(pair: FontPair, role: FontRole): [string, string] {
  switch (role) {
    case "names":
      return [pair.names?.variable ?? pair.headingVar, pair.namesHi];
    case "heading":
      return [pair.headingVar, pair.headingHi];
    case "body":
      return [pair.bodyVar, pair.bodyHi];
  }
}

/**
 * Every pair's role stacks, for the style attribute on <html>.
 *
 * Latin first and Devanagari second is the whole mechanism. A browser picks a
 * face per character: a Latin letter is drawn by the Latin face, and a
 * Devanagari one falls past it — each next/font face carries a unicode-range —
 * to the pair's Devanagari face, so "Taj Palace, लखनऊ" is two faces in one
 * line. It also decides the downloads. A face's file is fetched only when a
 * character is drawn in it, so an English card never fetches a Devanagari file,
 * and a Hindi card fetches only the Devanagari faces of its own pair.
 */
export const PAIR_FONT_STACKS: Readonly<Record<string, string>> =
  Object.fromEntries(
    FONT_PAIRS.flatMap((pair) =>
      (["names", "heading", "body"] as const).map((role) => {
        const [latin, devanagari] = roleFaces(pair, role);
        return [pairRoleVar(pair, role), `var(${latin}), var(${devanagari})`];
      }),
    ),
  );

/**
 * The face the cover names are set in. A pair with no face of its own for the
 * names falls back to its heading face at the settings the cover has always
 * used, so the first five pairs render exactly as before.
 *
 * `variable` is the pair's names stack (pairRoleVar), not the bare Latin face,
 * so the cover on the card and the one on the envelope both set Hindi names
 * in the pair's own Devanagari names face.
 */
export function namesFaceOf(pair: FontPair): NamesFace {
  const face: NamesFace = pair.names ?? {
    variable: pair.headingVar,
    fallback: pair.headingFallback,
    weight: pair.headingWeight,
    scale: 1,
    leading: 1.05,
    tracking: "-0.015em",
    wordSpacing: "normal",
  };

  return { ...face, variable: pairRoleVar(pair, "names") };
}

/**
 * Builds a usable font-family string from a variable and its fallback.
 *
 * Noto Sans Devanagari sits straight after `variable`. For a pair's role
 * stack (pairRoleVar) it is the last Devanagari fallback, behind the pair's
 * own Devanagari face, for a glyph that face lacks or while it downloads. For
 * a bare Latin face, such as the product's own sans, it is the Devanagari
 * face. A browser picks a face per character, so Latin text never reaches it.
 */
export function fontFamilyOf(variable: string, fallback: string): string {
  return `var(${variable}), var(--font-devanagari), ${fallback}`;
}

/**
 * The product's display face, for the headings laid out beside a card rather
 * than on it — the reply form, the confirmation, the guest's pass.
 *
 * Those used to name `--font-display` alone, which has no Devanagari, so on a
 * Hindi card their headings were the one line set in whatever the device had.
 * Built with the same helper as the card's own faces, so it carries the same
 * Devanagari fallback and cannot drift from it.
 */
export const DISPLAY_FACE = fontFamilyOf("--font-display", "Georgia, serif");

/**
 * The heading face for what is laid out beside one card: the reply form, the
 * confirmation, the guest's pass, the calendar sheet.
 *
 * The pair's own heading stack, Latin then Devanagari, so the form under a
 * Royal card is headed in Cormorant and the one under a Luxe card in Bodoni.
 * It used to be Fraunces for every pair, which made the reply form the one
 * part of the page that did not change when the host changed the pair.
 */
export function displayFaceFor(pair: FontPair): string {
  return fontFamilyOf(pairRoleVar(pair, "heading"), pair.headingFallback);
}

/** Always resolves — an unknown id falls back to the first pair. */
export function getFontPair(id: FontPairId): FontPair {
  return FONT_PAIRS.find((pair) => pair.id === id) ?? FONT_PAIRS[0];
}
