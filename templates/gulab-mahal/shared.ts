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
 * ink, rose gold for its marks. The form sets every colour it has from the
 * theme it is handed, so this is all that puts it on the paper.
 */
export function letterTheme(theme: Theme): Theme {
  return {
    ...theme,
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
