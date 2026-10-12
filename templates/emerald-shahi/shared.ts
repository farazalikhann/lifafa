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
 * What Emerald Shahi's sections share: its three faces, the few words it says
 * that the card's own copy has no line for, and the ivory theme its paper is
 * set in.
 */

export interface EmeraldFonts {
  /** The couple's names and the script headings: the pair's script face. */
  names: CSSProperties;
  /** Headings in spaced capitals, dates and figures: the pair's serif. */
  heading: CSSProperties;
  /** Sentences: the pair's text face. */
  body: CSSProperties;
}

/** The three faces of the card's font pair, each with its Devanagari face behind it. */
export function emeraldFonts(fontPairId: FontPairId): EmeraldFonts {
  const pair = getFontPair(fontPairId);
  const namesFace = namesFaceOf(pair);

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
    body: {
      fontFamily: fontFamilyOf(pairRoleVar(pair, "body"), pair.bodyFallback),
    },
  };
}

interface EmeraldCopy {
  thankYou: string;
  viewOnMap: string;
  venues: string;
  /** "No. 1" on a function's card. */
  number: (n: number) => string;
}

/* TODO(Faraz): verify these Hindi lines with a native reader before launch. */
const COPY: Readonly<Record<CardLanguage, EmeraldCopy>> = {
  en: {
    thankYou: "Thank you",
    viewOnMap: "View on map",
    venues: "The Venues",
    number: (n) => `No. ${n}`,
  },
  hi: {
    thankYou: "धन्यवाद",
    viewOnMap: "नक्शे पर देखें",
    venues: "समारोह स्थल",
    number: (n) => `क्र. ${n}`,
  },
};

export function emeraldCopy(language: CardLanguage): EmeraldCopy {
  return COPY[language];
}

/** Script lines sit taller in Devanagari, whose marks reach above and below the line. */
export function scriptLeading(language: CardLanguage): number {
  return language === "hi" ? 1.5 : 1.2;
}

/**
 * The theme the reply form is drawn in on this card: ivory paper, emerald
 * ink and a gold dark enough to read on it. The form sets every colour it has
 * from the theme it is handed, so this is all that puts it on paper; its
 * fields, its rules and its checks are untouched.
 */
export function paperTheme(theme: Theme): Theme {
  return {
    ...theme,
    background: "#F2E8D7",
    surface: "#FBF5E9",
    accent: "#8A6A1F",
    textPrimary: "#0B3A27",
    textMuted: "#4C6558",
    roles: {
      heading: "#0B3A27",
      title: "#0B3A27",
      detail: "#0B3A27",
      mark: "#8A6A1F",
      body: "#33503F",
    },
  };
}

/**
 * Which stage a function is held on, by what it is called: the marigold one
 * for a haldi or a mehndi, the lit one for a sangeet, a reception or a walima,
 * and the ivory one for the wedding itself and anything else. Read in English
 * and in Hindi, since a Hindi card names its functions in Hindi.
 */
export type Stage = "haldi" | "reception" | "wedding";

export function stageFor(label: string): Stage {
  const name = label.toLowerCase();

  if (/haldi|mehndi|mehendi|mehandi|हल्दी|मेहंदी|मेंहदी/.test(name)) {
    return "haldi";
  }

  if (/sangeet|reception|walima|valima|संगीत|रिसेप्शन|स्वागत|वलीमा/.test(name)) {
    return "reception";
  }

  return "wedding";
}

export const STAGE_ART: Readonly<Record<Stage, string>> = {
  haldi: "/templates/emerald-shahi/stage-haldi.webp",
  reception: "/templates/emerald-shahi/stage-reception.webp",
  wedding: "/templates/emerald-shahi/stage-wedding.webp",
};
