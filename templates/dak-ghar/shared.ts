import type { CSSProperties } from "react";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";

/**
 * What Dak Ghar's parts share: its colours, its two faces, and the few words
 * it says that the card's own copy has no line for.
 */

/* The paper's own cream (sampled off paper.webp), and the inks that read on it. */
export const CREAM = "#F5E3BF";
export const LETTER = "#EFD4AC";
export const INK = "#2A1E14";
export const INK_MUTED = "#5A4630";
/* The post box's red: buttons, small capitals and the one accent on each page. */
export const POST_RED = "#9E2A24";
/* The postmark's blue-black. */
export const STAMP_INK = "#2E3F66";

export interface DakFonts {
  /** Headings, the names and the date: Cormorant Garamond 600. */
  serif: CSSProperties;
  /** Details: Manrope. */
  sans: CSSProperties;
}

/*
  The card's two faces whatever pair it is saved with, each with Noto Serif
  Devanagari behind it for Hindi and the rupee sign. Both are already declared
  by app/layout.tsx and fetched only by a card that sets text in them.
*/
export const DAK_FONTS: DakFonts = {
  serif: {
    fontFamily: "var(--font-cormorant), var(--font-hi-noto-serif), Garamond, Georgia, serif",
    fontWeight: 600,
    /* Cormorant's own figures are old-style; dates and times read better level. */
    fontVariantNumeric: "lining-nums",
  },
  sans: {
    fontFamily: "var(--font-manrope), var(--font-hi-noto-serif), system-ui, sans-serif",
  },
};

interface DakCopy {
  tapToOpen: string;
  /** Under the date on the names letter. */
  invitationLine: string;
  telegram: string;
  functions: string;
  venue: string;
  seeRoute: string;
  countdown: string;
  days: string;
  hours: string;
  minutes: string;
  reply: string;
  replySent: string;
  thanks: string;
  /** The slip's middle panel joins the weekday and the time with this. */
  at: string;
  /** Under the loader's dot, for a guest kept waiting, and the reload after it. */
  slowLoad: string;
  tryAgain: string;
}

/* TODO(Faraz): verify these Hindi lines with a native reader before launch. */
const COPY: Readonly<Record<CardLanguage, DakCopy>> = {
  en: {
    tapToOpen: "Tap to open",
    invitationLine: "Together with their families",
    telegram: "A Telegram for You",
    functions: "The Celebrations",
    venue: "The Venue",
    seeRoute: "See the route",
    countdown: "Counting the Days",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    reply: "Reply by Post",
    replySent: "Your reply is on its way",
    thanks: "With love",
    at: "at",
    slowLoad: "Your connection seems slow. The invitation is on its way.",
    tryAgain: "Try again",
  },
  hi: {
    tapToOpen: "खोलने के लिए टैप करें",
    invitationLine: "अपने परिवारों के आशीर्वाद के साथ",
    telegram: "आपके लिए तार",
    functions: "समारोह",
    venue: "स्थल",
    seeRoute: "रास्ता देखें",
    countdown: "दिन गिनते हुए",
    days: "दिन",
    hours: "घंटे",
    minutes: "मिनट",
    reply: "उत्तर भेजें",
    replySent: "आपका उत्तर रवाना हो गया है",
    thanks: "सप्रेम",
    at: "",
    slowLoad: "आपका इंटरनेट धीमा लग रहा है। निमंत्रण आ रहा है।",
    tryAgain: "फिर से कोशिश करें",
  },
};

export function dakCopy(language: CardLanguage): DakCopy {
  return COPY[language];
}

/** Devanagari sits taller: its marks reach above and below the line. */
export function leading(language: CardLanguage, latin: number): number {
  return language === "hi" ? Math.max(latin, 1.5) : latin;
}

/** Small capitals with tracking in English; Devanagari is never spaced or capitalised. */
export function caps(language: CardLanguage): CSSProperties {
  return language === "hi" ? {} : { letterSpacing: "0.18em", textTransform: "uppercase" };
}

/**
 * The reply form's theme on the reply card: cream paper, sepia ink and the
 * post box's red. The form takes every colour it has from its theme, so this
 * is all that dresses it; its fields and checks are the card's own.
 */
export function replyCardTheme(theme: Theme): Theme {
  return {
    ...theme,
    background: CREAM,
    surface: "#FBF1DC",
    accent: POST_RED,
    textPrimary: INK,
    textMuted: INK_MUTED,
    roles: {
      heading: INK,
      title: INK,
      detail: INK,
      mark: POST_RED,
      body: INK_MUTED,
    },
  };
}
