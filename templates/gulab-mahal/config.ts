import dynamic from "next/dynamic";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { COVER_IMAGES } from "@/templates/gulab-mahal/art";
import {
  IVORY,
  IVORY_MUTED,
  ROSE_GOLD,
  VELVET,
  WINE,
  letterTheme,
} from "@/templates/gulab-mahal/shared";
import { SWITCHABLE_SECTIONS } from "@/templates/shared/fromPreset";
import { GULAB_MAHAL_LISTING } from "@/templates/premium";
import type { TemplateConfig } from "@/templates/types";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/**
 * The envelope: the template's own cover, on every card in it.
 *
 * Built on the envelope the editor already offers, for its id (so a stored
 * card names a cover the database knows), its prompt ("Tap the seal to open",
 * in both languages), its tick and its own sound, with this template's own
 * drawing and timings:
 *
 *   2.8s in all. The card is let go under the cover at 2.15s, as the letter
 *   that has grown across the screen starts to fade, which is `revealAt`.
 *   See Cover.tsx for the parts.
 *
 *   It waits for the envelope's three pictures, the letter and the four
 *   petals, and the fonts, and no longer than five seconds; none of the films
 *   or drawings the stock envelope falls back to are fetched.
 *
 *   The prompt is lettered by the cover itself, under the envelope; the shell
 *   sets only "You are invited" over it.
 */
const ENVELOPE = getCoverAnimation("envelope-seal");
const COVER_ART = {
  images: COVER_IMAGES,
  timeoutMs: 5000,
  /* Ivory on the velvet, over a soft dark shadow. */
  tone: "dark" as const,
  wordsLine: false,
  ink: IVORY,
  inkMuted: IVORY_MUTED,
};

const COVER_OPTION: CoverAnimationOption = {
  ...ENVELOPE,
  durationMs: 2800,
  revealAt: 2150 / 2800,
  burstAt: undefined,
  wordsOn: "visual",
  art: () => COVER_ART,
  film: undefined,
};

/**
 * Gulab Mahal: rose and velvet, a card of full-screen pages.
 *
 * A blush envelope under a rose-gold seal cracks open and gives up a letter
 * with the couple's names, onto a stack of
 * pages that a swipe moves through one at a time, each with an entrance of
 * its own, over blush damask with rose petals drifting down behind them. Its
 * Card and its Cover are loaded on demand, so a guest of any other template
 * downloads neither.
 *
 * A CARD FOR EVERY WEDDING: roses and velvet, and no symbol of any faith. In
 * the Premium Collection at the premium price, after Emerald Shahi, with a
 * "New" badge; its gallery preview is the closed envelope. Its sample is the
 * Hindu wedding.
 *
 * ITS OWN PAGE TOO: the reply is its page 8 and the thanks its page 9
 * (`page`), and it draws its own "Swipe up", so the page's scroll cue is left
 * off.
 *
 * ONE PALETTE. The font pairs are the three that set names in a romantic
 * script over an elegant serif, each with its own Devanagari faces.
 */
export const GULAB_MAHAL: TemplateConfig = {
  ...GULAB_MAHAL_LISTING,
  description:
    "A blush envelope under a rose-gold seal, and a card of full-screen pages in blush velvet.",
  /* Only for which sample wedding its demo shows: the Premium Collection has no chips. */
  category: "hindu",
  categoryLabel: "For every wedding",
  badge: "New",
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
      /*
        The velvet's own colour for the ground (what shows before it has
        loaded, and round the edges of the page), and ivory for anything the
        guest's page sets straight on it; what is on ivory paper is in wine,
        drawn by the pages themselves and the letter theme.
      */
      textColors: {
        textPrimary: IVORY,
        textSecondary: IVORY_MUTED,
        cardColor: VELVET,
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
    coverAnimation: "envelope-seal",
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
  /*
    Its sheets in the card's own order: the names with the date, the couple,
    the functions, the venue, and then who to ring, the host's sections and
    their note together. The countdown is not printed.
  */
  printLayout: {
    sheetOf: { cover: 0, details: 0, family: 1, timeline: 2, venue: 3, contact: 4, message: 4, countdown: null },
    customSheet: 4,
  },
};
