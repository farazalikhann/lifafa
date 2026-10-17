import dynamic from "next/dynamic";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { PREMIUM_PRICE_PAISE } from "@/lib/pricing";
import { COVER_IMAGES } from "@/templates/gulab-mahal/art";
import {
  BLUSH,
  ROSE_GOLD,
  WINE,
  WINE_SOFT,
  letterTheme,
} from "@/templates/gulab-mahal/shared";
import { SWITCHABLE_SECTIONS } from "@/templates/shared/fromPreset";
import type { TemplateConfig } from "@/templates/types";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/**
 * The rose: the template's own cover, on every card in it.
 *
 * Built on the Rose Bloom the editor already offers, for its id (so a stored
 * card names a cover the database knows), its tick and its sound (the
 * breeze's petals: the nearest there is until this cover has its own), with
 * this template's own drawing and timings:
 *
 *   2.6s in all. The card is let go under the cover at 1.7s, as the petals
 *   start to drift away and the blush ground to fade, which is `revealAt`.
 *   See Cover.tsx for the parts.
 *
 *   It waits for the rose and the four petals, and the fonts, and no longer
 *   than five seconds; the film the stock Rose Bloom plays is never fetched.
 *
 *   The prompt is lettered by the cover itself, under the rose; the shell
 *   sets only "You are invited" over it.
 */
const BLOOM = getCoverAnimation("rose-bloom");
const COVER_ART = {
  images: COVER_IMAGES,
  timeoutMs: 5000,
  tone: "light" as const,
  wordsLine: false,
  ink: WINE,
  inkMuted: WINE_SOFT,
};

const COVER_OPTION: CoverAnimationOption = {
  ...BLOOM,
  openPromptText: {
    en: "Tap the rose to open",
    /* TODO(Faraz): verify this Hindi line with a native reader before launch. */
    hi: "खोलने के लिए गुलाब को छुएँ",
  },
  durationMs: 2600,
  revealAt: 1700 / 2600,
  burstAt: undefined,
  wordsOn: "visual",
  art: () => COVER_ART,
  film: undefined,
};

/**
 * Gulab Mahal: rose and velvet, a card of full-screen pages.
 *
 * A rose blooms open into a plate with the couple's initials, onto a stack of
 * pages that a swipe moves through one at a time, each with an entrance of
 * its own, over blush damask with rose petals drifting down behind them. Its
 * Card and its Cover are loaded on demand, so a guest of any other template
 * downloads neither.
 *
 * A CARD FOR EVERY WEDDING: roses and velvet, and no symbol of any faith. In
 * the Premium Collection at the premium price, and NOT YET OFFERED: `listed`
 * is false until its last pages are drawn, so the gallery leaves it out while
 * its live demo, /demo/gulab-mahal, is there to be looked at. Its sample is
 * the Hindu wedding.
 *
 * ITS OWN PAGE TOO: the reply is its page 8 and the thanks its page 9
 * (`page`), and it draws its own "Swipe up", so the page's scroll cue is left
 * off.
 *
 * ONE PALETTE. The font pairs are the three that set names in a romantic
 * script over an elegant serif, each with its own Devanagari faces.
 */
export const GULAB_MAHAL: TemplateConfig = {
  id: "gulab-mahal",
  name: "Gulab Mahal",
  description:
    "A rose that blooms open, and a card of full-screen pages in blush velvet and rose gold.",
  /* Only for which sample wedding its demo shows: the Premium Collection has no chips. */
  category: "hindu",
  categoryLabel: "For every wedding",
  badge: "New",
  listed: false,
  collection: "premium",
  price: PREMIUM_PRICE_PAISE,
  preview: null,
  palettes: [
    { id: "own", label: "Blush", paletteId: "blush", accentOverride: ROSE_GOLD },
  ],
  fontPairs: ["romantic", "graceful", "royal"],
  sections: SWITCHABLE_SECTIONS,
  baseDesign: {
    ...DEFAULT_DESIGN,
    style: {
      fontPairId: "romantic",
      /* The nearest of the card's palettes, for anything that reads one by name. */
      paletteId: "blush",
      density: "comfortable",
      accentOverride: ROSE_GOLD,
      /* The ground and the inks themselves; these are what the card is painted in. */
      textColors: {
        textPrimary: WINE,
        textSecondary: WINE_SOFT,
        cardColor: BLUSH,
        accent: ROSE_GOLD,
        chosen: false,
      },
    },
    /* Its decoration is its own artwork: nothing of the card's scattered, flying or falling over it. */
    borderStyle: "none",
    decorMotion: "none",
    butterflies: "none",
    leaves: false,
    petals: "none",
    coverAnimation: "rose-bloom",
    traditionId: "none",
    dateReveal: "simple",
  },
  Card: dynamic(() => import("@/templates/gulab-mahal/Card")),
  cover: {
    option: COVER_OPTION,
    Visual: dynamic(() => import("@/templates/gulab-mahal/Cover")),
  },
  page: {
    RsvpFrame: dynamic(() => import("@/templates/gulab-mahal/RsvpFrame")),
    rsvpTheme: letterTheme,
    Closing: dynamic(() => import("@/templates/gulab-mahal/Closing")),
    keepsakeArt: true,
    scrollCue: false,
  },
  print: { background: "#FBF4EE", textPrimary: WINE },
};
