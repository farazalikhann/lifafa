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
 * What Sheesh Mahal's pages share: its colours, its faces, and the few words
 * it says that the card's own copy has no line for.
 */

/* The one palette: a night palace of mirrors. */
export const INDIGO = "#0E1030";
/* The ink for words on the moon and on paper. */
export const INDIGO_INK = "#181C4A";
export const GOLD = "#C9A45C";
/* Antique gold dark enough for small type on parchment. */
export const GOLD_DEEP = "#7E5F24";
export const SILVER = "#D9DEE8";
export const IVORY = "#F8F1E3";
/* Ivory a step quieter, for the lesser lines set on the night. */
export const IVORY_MUTED = "#D8CDB8";
export const DIYA = "#FFB347";

export interface SheeshFonts {
  /** The couple's names and the initials: the pair's script. */
  names: CSSProperties;
  /** Small spaced capitals, dates, headings: the pair's serif. */
  heading: CSSProperties;
  /** Sentences: the same refined serif, a little lighter. */
  body: CSSProperties;
}

export function sheeshFonts(fontPairId: FontPairId): SheeshFonts {
  const pair = getFontPair(fontPairId);
  const namesFace = namesFaceOf(pair);
  const serif = fontFamilyOf(pairRoleVar(pair, "heading"), pair.headingFallback);

  return {
    names: {
      fontFamily: fontFamilyOf(namesFace.variable, namesFace.fallback),
      fontWeight: namesFace.weight,
      letterSpacing: namesFace.tracking,
    },
    heading: { fontFamily: serif, fontWeight: pair.headingWeight },
    body: { fontFamily: serif, fontWeight: 500 },
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
  return language === "hi" ? 1.5 : 1.2;
}

interface SheeshCopy {
  /** The cover's prompt. */
  tapToOpen: string;
  swipeUp: string;
  /** Page 2's small line over the names. */
  invitationLine: string;
  /** Page 4: the line over each name, and the hint under the dots. */
  couple: {
    groom: string;
    bride: string;
    swipe: string;
  };
  /** Page 5: each card's number, the buttons under the cards, and the count between them. */
  functions: {
    number: (n: number) => string;
    previous: string;
    next: string;
    counter: (at: number, of: number) => string;
    counterSpoken: (at: number, of: number) => string;
  };
  /** Page 6: the venue's map, as Gulab Mahal says it. */
  viewOnMap: string;
  /** Page 7: the heading over the host's note, as Gulab Mahal says it. */
  noteHeading: string;
  /** Page 8, once a reply has gone. */
  onItsWay: string;
  /** What each page is called, for its heading and a screen reader. */
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
const COPY: Readonly<Record<CardLanguage, SheeshCopy>> = {
  en: {
    tapToOpen: "Tap to open",
    swipeUp: "Swipe up",
    invitationLine: "Together with their families",
    couple: {
      groom: "The Groom",
      bride: "The Bride",
      swipe: "Swipe",
    },
    functions: {
      number: (n) => `No. ${n}`,
      previous: "Previous",
      next: "Next",
      counter: (at, of) => `${at} / ${of}`,
      counterSpoken: (at, of) => `Celebration ${at} of ${of}`,
    },
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
    tapToOpen: "खोलने के लिए टैप करें",
    swipeUp: "ऊपर स्वाइप करें",
    invitationLine: "अपने परिवारों के आशीर्वाद के साथ",
    couple: {
      groom: "वर",
      bride: "वधू",
      swipe: "स्वाइप करें",
    },
    functions: {
      number: (n) => `क्र. ${n}`,
      previous: "पिछला",
      next: "अगला",
      counter: (at, of) => `${at} / ${of}`,
      counterSpoken: (at, of) => `समारोह ${at}, कुल ${of}`,
    },
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

export function sheeshCopy(language: CardLanguage): SheeshCopy {
  return COPY[language];
}

/**
 * The theme the reply form is drawn in on this card: parchment, indigo ink,
 * antique gold for its marks, and its headings in the card's script. The form
 * sets every colour it has from the theme it is handed, so this is all that
 * puts it on the farmaan.
 */
export function farmaanTheme(theme: Theme): Theme {
  const script = theme.displayFontFamily?.replace("-heading)", "-names)");

  return {
    ...theme,
    displayFontFamily: script ?? theme.displayFontFamily,
    displayFontWeight: 400,
    background: "#F1E6CF",
    surface: "#F8F0DE",
    accent: GOLD_DEEP,
    textPrimary: INDIGO_INK,
    textMuted: "#3A3F6E",
    roles: {
      heading: INDIGO_INK,
      title: INDIGO_INK,
      detail: INDIGO_INK,
      mark: GOLD_DEEP,
      body: "#3A3F6E",
    },
  };
}
