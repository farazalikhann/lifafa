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
