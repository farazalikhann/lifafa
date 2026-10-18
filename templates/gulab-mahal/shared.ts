import type { CSSProperties } from "react";
import {
  fontFamilyOf,
  getFontPair,
  namesFaceOf,
  pairRoleVar,
} from "@/lib/fontPairs";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { FontPairId } from "@/types/style";

/**
 * What Gulab Mahal's pages share: its colours, its faces, and the few words
 * it says that the card's own copy has no line for.
 */

/* The one palette: blush velvet, wine ink, rose gold and ivory. */
export const BLUSH = "#E9BDBB";
export const WINE = "#5A1E2B";
export const WINE_SOFT = "#7B3A48";
export const ROSE_GOLD = "#B76E79";
/* Rose gold dark enough for small type on ivory. */
export const ROSE_GOLD_DEEP = "#97505C";
export const IVORY = "#FBF4EE";
/* Ivory a step quieter, for the lesser lines set on the velvet. */
export const IVORY_MUTED = "#EBD6CE";
/* The velvet's own colour, for what shows before it has loaded. */
export const VELVET = "#8A4C48";

export interface GulabFonts {
  /** The couple's names and the initials: the pair's script. */
  names: CSSProperties;
  /** Small spaced capitals, dates: the pair's serif. */
  heading: CSSProperties;
  /** Sentences: the pair's text face. */
  body: CSSProperties;
  /**
   * The italic lines (the invitation line, the prompt under the envelope): Lora's own
   * italic, which is loaded, rather than a slanted copy of an upright face.
   * Devanagari has no italic and is set upright in the pair's text face.
   */
  italic: (language: CardLanguage) => CSSProperties;
}

export function gulabFonts(fontPairId: FontPairId): GulabFonts {
  const pair = getFontPair(fontPairId);
  const namesFace = namesFaceOf(pair);
  const body: CSSProperties = {
    fontFamily: fontFamilyOf(pairRoleVar(pair, "body"), pair.bodyFallback),
  };

  return {
    names: {
      fontFamily: fontFamilyOf(namesFace.variable, namesFace.fallback),
      fontWeight: namesFace.weight,
      letterSpacing: namesFace.tracking,
    },
    heading: {
      fontFamily: fontFamilyOf(pairRoleVar(pair, "heading"), pair.headingFallback),
      fontWeight: pair.headingWeight,
    },
    body,
    italic: (language) =>
      language === "hi"
        ? body
        : {
            fontFamily: fontFamilyOf("--font-lora", "Georgia, serif"),
            fontStyle: "italic",
          },
  };
}

/** Runs `run` once the browser has a moment, or soon; returns how to call it off. */
export function whenIdle(run: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(run, { timeout: 600 });
    return () => window.cancelIdleCallback(handle);
  }

  const handle = window.setTimeout(run, 200);
  return () => window.clearTimeout(handle);
}

/** Script lines sit taller in Devanagari, whose marks reach above and below the line. */
export function scriptLeading(language: CardLanguage): number {
  return language === "hi" ? 1.45 : 1.18;
}

interface GulabCopy {
  swipeUp: string;
  /** Under the closed scroll. */
  pullScroll: string;
  /** "No. 1" on a function's card. */
  number: (n: number) => string;
  previous: string;
  next: string;
  /** "2 / 4", and what it says aloud. */
  counter: (at: number, of: number) => string;
  counterSpoken: (at: number, of: number) => string;
  /** Page 6's heading, and its way to the map. */
  venueHeading: string;
  viewOnMap: string;
  /** Page 7: the host's note's heading. */
  noteHeading: string;
  /** Page 8, once the letter has gone. */
  onItsWay: string;
  /** What each page is called, for its dot and its placeholder. */
  pages: {
    date: string;
    couple: string;
    functions: string;
    venue: string;
    details: string;
    rsvp: string;
    thanks: string;
  };
}

/* TODO(Faraz): verify these Hindi lines with a native reader before launch. */
const COPY: Readonly<Record<CardLanguage, GulabCopy>> = {
  en: {
    swipeUp: "Swipe up",
    pullScroll: "Pull the scroll to open",
    number: (n) => `No. ${n}`,
    previous: "Previous",
    next: "Next",
    counter: (at, of) => `${at} / ${of}`,
    counterSpoken: (at, of) => `Celebration ${at} of ${of}`,
    venueHeading: "Venue",
    viewOnMap: "View on map",
    noteHeading: "A Note for You",
    onItsWay: "Your reply is on its way",
    pages: {
      date: "Save the Date",
      couple: "The Couple",
      functions: "The Celebrations",
      venue: "The Venue",
      details: "Details",
      rsvp: "Kindly Reply",
      thanks: "Thank You",
    },
  },
  hi: {
    swipeUp: "ऊपर स्वाइप करें",
    pullScroll: "खोलने के लिए स्क्रॉल नीचे खींचें",
    number: (n) => `क्र. ${n}`,
    previous: "पिछला",
    next: "अगला",
    counter: (at, of) => `${at} / ${of}`,
    counterSpoken: (at, of) => `समारोह ${at}, कुल ${of}`,
    venueHeading: "स्थल",
    viewOnMap: "नक्शे पर देखें",
    noteHeading: "आपके लिए संदेश",
    onItsWay: "आपका उत्तर रवाना हो गया है",
    pages: {
      date: "तिथि याद रखें",
      couple: "वर-वधू",
      functions: "समारोह",
      venue: "स्थल",
      details: "विवरण",
      rsvp: "कृपया उत्तर दें",
      thanks: "धन्यवाद",
    },
  },
};

export function gulabCopy(language: CardLanguage): GulabCopy {
  return COPY[language];
}

/**
 * The theme the reply form is drawn in on this card: ivory letter paper, wine
 * ink, rose gold for its marks, and its headings in the card's script. The form sets every colour it has from the
 * theme it is handed, so this is all that puts it on the paper.
 */
export function letterTheme(theme: Theme): Theme {
  /*
    The letter's headings in the pair's script: its display face is the
    pair's heading stack, `var(--pair-<id>-heading)`, beside which every pair
    has its names stack under the same id.
  */
  const script = theme.displayFontFamily?.replace("-heading)", "-names)");

  return {
    ...theme,
    displayFontFamily: script ?? theme.displayFontFamily,
    displayFontWeight: 400,
    background: "#F7EAE4",
    surface: IVORY,
    accent: ROSE_GOLD_DEEP,
    textPrimary: WINE,
    textMuted: WINE_SOFT,
    roles: {
      heading: WINE,
      title: WINE,
      detail: WINE,
      mark: ROSE_GOLD_DEEP,
      body: WINE_SOFT,
    },
  };
}
