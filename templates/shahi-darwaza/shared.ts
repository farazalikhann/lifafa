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
 * What Shahi Darwaza's parts share: its colours, its three faces, the words
 * its cover says, and the paper theme its reply form is set in.
 */

export const MAROON = "#3A0A14";
export const MAROON_DEEP = "#22050B";
export const GOLD = "#D9B36C";
export const IVORY = "#F5E9D3";
export const IVORY_SOFT = "#DCC9A8";
/* The paper the card below the hero is set on, and its inks. */
export const PAPER = "#F3E7D2";
export const INK = "#4A0F1A";
export const INK_SOFT = "#6E3A3A";
export const GOLD_DEEP = "#8A5A1A";

export interface DarwazaFonts {
  /** The couple's names: the pair's script face. */
  names: CSSProperties;
  /** Headings, initials and the date: the pair's serif. */
  heading: CSSProperties;
  /** Sentences: the pair's text face. */
  body: CSSProperties;
}

/** The three faces of the card's font pair, each with its Devanagari face behind it. */
export function darwazaFonts(fontPairId: FontPairId): DarwazaFonts {
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

/* TODO(Faraz): verify these Hindi lines with a native reader before launch. */
const PROMPTS: Readonly<Record<CardLanguage, { drag: string; tap: string }>> = {
  en: { drag: "Drag the key to the lock", tap: "Tap to open" },
  hi: { drag: "चाबी को ताले तक ले जाइए", tap: "खोलने के लिए छुइए" },
};

/** What the cover asks a guest to do: drag the key, or, with no motion, tap. */
export const DRAG_PROMPT: Readonly<Record<CardLanguage, string>> = {
  en: PROMPTS.en.drag,
  hi: PROMPTS.hi.drag,
};

export function tapPrompt(language: CardLanguage): string {
  return PROMPTS[language].tap;
}

interface DarwazaCopy {
  /** Over the venue's card. */
  venue: string;
  /** The venue card's one button. */
  openInMaps: string;
  /** Over the reply form, on the scroll. */
  swagatPatra: string;
  /** The closing's first words. */
  withLove: string;
  /** Under the guest's signed name, once the reply is sent. */
  signedBy: string;
  /** The calendar's weekday initials, Sunday first. */
  weekdays: readonly string[];
}

/* TODO(Faraz): verify these Hindi lines with a native reader before launch. */
const COPY: Readonly<Record<CardLanguage, DarwazaCopy>> = {
  en: {
    venue: "The Venue",
    openInMaps: "Open in Maps",
    swagatPatra: "Swagat Patra",
    withLove: "With love",
    signedBy: "Signed",
    weekdays: ["S", "M", "T", "W", "T", "F", "S"],
  },
  hi: {
    venue: "समारोह स्थल",
    openInMaps: "मैप में खोलें",
    swagatPatra: "स्वागत पत्र",
    withLove: "सप्रेम",
    signedBy: "हस्ताक्षर",
    weekdays: ["र", "सो", "मं", "बु", "गु", "शु", "श"],
  },
};

export function darwazaCopy(language: CardLanguage): DarwazaCopy {
  return COPY[language];
}

/**
 * The gold icon for a function, by what it is called: the mehendi cone, the
 * dholak, the chandelier for a reception or a dinner, and the rings for the
 * wedding and anything else. Read in English and in Hindi.
 *
 * "Wedding Reception" is a reception: the reception names are tried before
 * the wedding ones, since a reception is so often called after the wedding.
 */
export function functionIcon(label: string): string {
  const name = label.toLowerCase();

  if (/mehendi|mehndi|mehandi|mehadi|henna|मेहंदी|मेंहदी|मेहँदी/.test(name)) {
    return "/decor/shahi-darwaza/icon-mehendi.webp";
  }

  if (/sangeet|sangit|music|संगीत/.test(name)) {
    return "/decor/shahi-darwaza/icon-sangeet.webp";
  }

  if (/reception|dinner|रिसेप्शन|स्वागत समारोह|प्रीतिभोज|भोज/.test(name)) {
    return "/decor/shahi-darwaza/icon-reception.webp";
  }

  return "/decor/shahi-darwaza/icon-wedding.webp";
}

/** Script lines sit taller in Devanagari, whose marks reach above and below the line. */
export function scriptLeading(language: CardLanguage): number {
  return language === "hi" ? 1.5 : 1.2;
}

/**
 * The theme the reply form is drawn in on this card: ivory paper, maroon ink
 * and a gold dark enough to read on it. The form sets every colour it has
 * from the theme it is handed, so this is all that puts it on paper; its
 * fields, its rules and its checks are untouched.
 */
export function paperTheme(theme: Theme): Theme {
  return {
    ...theme,
    background: "#F3E7D2",
    surface: "#FBF4E6",
    accent: "#8A5A1A",
    textPrimary: "#4A0F1A",
    textMuted: "#6E4A45",
    roles: {
      heading: "#4A0F1A",
      title: "#4A0F1A",
      detail: "#4A0F1A",
      mark: "#8A5A1A",
      body: "#5A2A2C",
    },
  };
}
