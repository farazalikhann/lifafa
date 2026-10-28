import dynamic from "next/dynamic";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { playEffectSound, unlockEffectSounds } from "@/lib/effectSound";
import { COVER_IMAGES } from "@/templates/dak-ghar/art";
import { DURATION, LIFT_AT } from "@/templates/dak-ghar/coverTiming";
import { SOUND, coverExtrasReady } from "@/templates/dak-ghar/sounds";
import { CREAM, INK, INK_MUTED, POST_RED, dakCopy, replyCardTheme } from "@/templates/dak-ghar/shared";
import { SWITCHABLE_SECTIONS } from "@/templates/shared/fromPreset";
import { DAK_GHAR_LISTING } from "@/templates/premium";
import type { TemplateConfig } from "@/templates/types";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/**
 * The post box: the template's own cover, on every card in it.
 *
 * Built on the envelope the editor already offers ("envelope-seal"), for its
 * id only, so a stored card names a cover the database knows; the drawing,
 * the timings, the prompt and the sound are this template's:
 *
 *   2.5s in all. The slip prints and is postmarked, holds, and lifts away
 *   as the courtyard fades; the card is let go under it at 1.9s
 *   (`revealAt`). See Cover.tsx and coverTiming.ts.
 *
 *   It is never shown half loaded. It waits, with no time limit, for every
 *   picture in the cover and the first page (each decoded), its own faces
 *   and every sound on the card, on the Lifafa red dot in the paper's own
 *   cream. After 4 seconds the dot says the connection is slow, after 12 it
 *   offers "Try again". A file that fails is let through at once, and a
 *   sound that fails is simply not played.
 *
 *   "Tap to open" is lettered by the cover itself, under the post box; the
 *   shell sets only "You are invited" over it.
 *
 *   The sounds are Dak Ghar's own (sounds.ts, lib/effectSound.ts): the tap
 *   on the post box is played inside the tap (`onTap`, which also starts the
 *   audio for the rest of the card), the slip printing and the postmark by
 *   the cover on its own clock. So the shell has no recording to play.
 */
const ENVELOPE = getCoverAnimation("envelope-seal");
const COVER_ART = {
  images: COVER_IMAGES,
  timeoutMs: null,
  waitFor: coverExtrasReady,
  loader: {
    kind: "dot" as const,
    slow: { en: dakCopy("en").slowLoad, hi: dakCopy("hi").slowLoad },
    retry: { en: dakCopy("en").tryAgain, hi: dakCopy("hi").tryAgain },
  },
  /* Sepia ink over a cream light at the head; Skip on a cream plaque over the cobbles. */
  tone: "light" as const,
  wordsLine: false,
  ink: INK,
  inkMuted: INK_MUTED,
  plaque: "rgb(245 227 191 / 0.9)",
  plaqueEdge: POST_RED,
};

const COVER_OPTION: CoverAnimationOption = {
  ...ENVELOPE,
  openPromptText: {
    en: dakCopy("en").tapToOpen,
    hi: dakCopy("hi").tapToOpen,
  },
  durationMs: DURATION,
  revealAt: LIFT_AT / DURATION,
  burstAt: undefined,
  sound: null,
  /* Inside the tap: the audio started for the whole card, and the post box's own sound. */
  onTap: () => {
    unlockEffectSounds();
    playEffectSound(SOUND.tap);
  },
  haptic: 10,
  wordsOn: "visual",
  art: () => COVER_ART,
  film: undefined,
};

/**
 * Dak Ghar: a vintage Indian post office.
 *
 * The guest taps a red pillar post box in a golden-hour courtyard and a date
 * slip prints out of its slot and is postmarked; then the card: the names on
 * letter paper by a writing desk, the host's note as a telegram, each
 * function on its own postage stamp, the venue on a postcard, the countdown
 * on a brass clock, and the reply as a card a pigeon carries off. Its Card
 * and its Cover are loaded on demand, so a guest of any other template
 * downloads neither.
 *
 * UNLISTED while it is being finished: seen at /demo/dak-ghar only. A card
 * for every wedding, with no symbol of any faith; its sample is the Hindu
 * wedding in Jaipur, in English and Hindi.
 *
 * ONE COLOURWAY AND ONE TYPE PAIR. The card sets its own two faces whatever
 * pair it is saved with (Cormorant Garamond and Manrope, with Noto Serif
 * Devanagari behind both; DAK_FONTS in shared.ts); "elegant" is saved as the
 * pair because it is Cormorant too, which is what the shell sets "You are
 * invited" in.
 */
export const DAK_GHAR: TemplateConfig = {
  /* The "Made with Lifafa" credit in the card's text colour. */
  creditInk: "text",
  ...DAK_GHAR_LISTING,
  description:
    "A post box in a haveli courtyard prints your date, then letters, stamps and a postcard.",
  /* Only for which sample wedding its demo shows. */
  category: "hindu",
  categoryLabel: "For every wedding",
  palettes: [
    { id: "own", label: "Cream", paletteId: "cream", accentOverride: POST_RED },
  ],
  fontPairs: ["elegant"],
  sections: SWITCHABLE_SECTIONS,
  baseDesign: {
    ...DEFAULT_DESIGN,
    style: {
      fontPairId: "elegant",
      paletteId: "cream",
      density: "comfortable",
      accentOverride: POST_RED,
      /* The paper's cream for the ground (and the loader), and sepia ink on it. */
      textColors: {
        textPrimary: INK,
        textSecondary: INK_MUTED,
        cardColor: CREAM,
        accent: POST_RED,
        chosen: false,
      },
    },
    /* Its decoration is its own artwork: nothing scattered, flying or falling over it. */
    borderStyle: "none",
    decorMotion: "none",
    butterflies: "none",
    leaves: false,
    petals: "none",
    coverAnimation: "envelope-seal",
    traditionId: "none",
    dateReveal: "simple",
  },
  Card: dynamic(() => import("@/templates/dak-ghar/Card")),
  cover: {
    option: COVER_OPTION,
    Visual: dynamic(() => import("@/templates/dak-ghar/Cover")),
  },
  page: {
    RsvpFrame: dynamic(() => import("@/templates/dak-ghar/RsvpFrame")),
    rsvpTheme: replyCardTheme,
    Closing: dynamic(() => import("@/templates/dak-ghar/Closing")),
    keepsakeArt: false,
    /* Compact, at the top of the page only: pinned, it came back over the headings and stamps. */
    languageSwitch: "top",
  },
  print: { background: "#FBF4E6", textPrimary: INK },
};
