import dynamic from "next/dynamic";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { COVER_IMAGES } from "@/templates/emerald-shahi/art";
import { paperTheme } from "@/templates/emerald-shahi/shared";
import { SWITCHABLE_SECTIONS } from "@/templates/shared/fromPreset";
import { EMERALD_SHAHI_LISTING } from "@/templates/premium";
import type { TemplateConfig } from "@/templates/types";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/*
  The artwork's own colours. The card has one colourway, since the pictures
  are emerald and gold and nothing else: a deep emerald ground, gold for the
  accent, ivory and a quieter ivory for the two inks.
*/
const EMERALD = "#082A1C";
const GOLD = "#D8B26A";
const IVORY = "#F3E7C9";
const IVORY_SOFT = "#D9CBA6";

/**
 * The envelope: the template's own cover, on every card in it.
 *
 * Built on the envelope the editor already offers, for its prompt ("Tap the
 * seal to open", in both languages), its sound and its tick, with this
 * template's own timings and pictures:
 *
 *   2.4s in all. The card page is let go under the cover at 1.7s, as the
 *   envelope starts to fade, which is `revealAt`. See Cover.tsx for the parts.
 *
 *   It waits for its four pictures and no longer than five seconds; none of
 *   the films or drawings the stock envelope falls back to are loaded.
 *
 *   The prompt is drawn by the cover itself, under the envelope.
 */
const ENVELOPE = getCoverAnimation("envelope-seal");
const COVER_ART = {
  images: COVER_IMAGES,
  timeoutMs: 5000,
  tone: "dark" as const,
  /* "You are invited" alone above the envelope: the line under it has no room on a short phone. */
  wordsLine: false,
  ink: IVORY,
  inkMuted: IVORY_SOFT,
};

const COVER_OPTION: CoverAnimationOption = {
  ...ENVELOPE,
  durationMs: 2400,
  revealAt: 1700 / 2400,
  burstAt: undefined,
  wordsOn: "visual",
  art: () => COVER_ART,
  film: undefined,
};

/**
 * Emerald Shahi: the first template with a card of its own.
 *
 * A velvet envelope under a gold seal opens onto an emerald card patterned in
 * gold, with ivory roses in its corners and the couple drawn in gold line.
 * Its Card and its Cover are loaded on demand, so a guest of any other
 * template downloads neither.
 *
 * A CARD FOR EVERY WEDDING: there is no symbol of any faith on it. It is in
 * the Premium Collection, which is first in the gallery and has no tradition
 * chips, with a "New" badge. Its sample is the Hindu wedding.
 *
 * SCRATCH ON THE COUNTDOWN, FROM THE START: a new card on this template has
 * its four coins covered (`countdownScratch`; see switchTemplate), and the
 * host can switch that off in step 3.
 *
 * ITS OWN PAGE TOO: the reply form sits on ivory paper and the closing words
 * are its own (`page`), and its printed copy is on ivory (`print`).
 *
 * ONE COLOURWAY, so step 3 offers no choice of colour. The font pairs are the
 * three that set names in a script and headings in a serif, each with its own
 * Devanagari faces for a Hindi card.
 */
export const EMERALD_SHAHI: TemplateConfig = {
  /* The "Made with Lifafa" credit in the card's gold accent. */
  creditInk: "accent",
  ...EMERALD_SHAHI_LISTING,
  description:
    "A velvet envelope and a gold seal, on emerald with ivory roses and gold line art.",
  /* Only for which sample wedding its demo shows: the Premium Collection has no chips. */
  category: "hindu",
  categoryLabel: "For every wedding",
  badge: "New",
  palettes: [
    { id: "own", label: "Emerald", paletteId: "forest", accentOverride: GOLD },
  ],
  fontPairs: ["royal", "graceful", "romantic"],
  sections: SWITCHABLE_SECTIONS,
  baseDesign: {
    ...DEFAULT_DESIGN,
    style: {
      fontPairId: "royal",
      /* The nearest of the card's palettes, for anything that reads one by name. */
      paletteId: "forest",
      density: "comfortable",
      accentOverride: GOLD,
      /* The ground and the inks themselves; these are what the card is painted in. */
      textColors: {
        textPrimary: IVORY,
        textSecondary: IVORY_SOFT,
        cardColor: EMERALD,
        accent: GOLD,
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
  Card: dynamic(() => import("@/templates/emerald-shahi/Card")),
  cover: {
    option: COVER_OPTION,
    Visual: dynamic(() => import("@/templates/emerald-shahi/Cover")),
  },
  page: {
    RsvpFrame: dynamic(() => import("@/templates/emerald-shahi/RsvpFrame")),
    rsvpTheme: paperTheme,
    Closing: dynamic(() => import("@/templates/emerald-shahi/Closing")),
    /* Its ribbon and petals are red roses, which are no part of this card. */
    keepsakeArt: false,
  },
  print: { background: "#F6EFE0", textPrimary: "#0B3A27" },
  countdownScratch: true,
};
