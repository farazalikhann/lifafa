import dynamic from "next/dynamic";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { PREMIUM_PRICE_PAISE } from "@/lib/pricing";
import { COVER_IMAGES } from "@/templates/sheesh-mahal/art";
import { DURATION, REVEAL_AT } from "@/templates/sheesh-mahal/coverTiming";
import {
  GOLD,
  INDIGO,
  INDIGO_INK,
  IVORY,
  IVORY_MUTED,
  farmaanTheme,
} from "@/templates/sheesh-mahal/shared";
import { askTilt } from "@/templates/sheesh-mahal/tilt";
import { SWITCHABLE_SECTIONS } from "@/templates/shared/fromPreset";
import type { TemplateConfig } from "@/templates/types";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/**
 * The diya and the doors: the template's own cover, on every card in it.
 *
 * Built on the doors the editor already offers ("fold-unfold", the gatefold),
 * for its id only, so a stored card names a cover the database knows; the
 * drawing, the timings, the prompt and the sound are this template's:
 *
 *   3.9s in all: the camera is through the doors at 3.5s, and the cover's
 *   hall fades into page 2's own by 3.85s. The card is let go under it at
 *   3.3s (`revealAt`), so its names arrive as that fade begins. See Cover.tsx.
 *
 *   It waits for the wall, both doors, the diya and the hall, and the fonts,
 *   and no longer than five seconds; nothing of the stock doors' film is
 *   fetched.
 *
 *   The prompt is lettered by the cover itself, under the diya; the shell sets
 *   only "You are invited" over it.
 *
 *   The tap asks for the phone's tilt, where the browser wants asking, for
 *   the mirrors' glints (tilt.ts): the one prompt an iPhone may show.
 */
const DOORS = getCoverAnimation("fold-unfold");
const COVER_ART = {
  images: COVER_IMAGES,
  timeoutMs: 5000,
  /* Ivory on the night, over a soft dark shadow. */
  tone: "dark" as const,
  wordsLine: false,
  ink: IVORY,
  inkMuted: IVORY_MUTED,
};

const COVER_OPTION: CoverAnimationOption = {
  ...DOORS,
  openPromptText: {
    en: "Tap to light the diya",
    hi: "दीया जलाने के लिए टैप करें",
  },
  durationMs: DURATION,
  revealAt: REVEAL_AT / DURATION,
  burstAt: undefined,
  sound: "sheesh-mahal",
  haptic: 10,
  wordsOn: "visual",
  art: () => COVER_ART,
  film: undefined,
  onTap: askTilt,
};

/**
 * Sheesh Mahal: a night palace of mirrors, the most premium of the cards.
 *
 * The guest lights a diya before a door of mirror-work, the doors swing open
 * and the camera walks in, and then through room after room, one swipe each:
 * the hall where the names are, the moon through a jharokha, the couple, the
 * functions down the hall, the venue, a farmaan, the reply and a kandeel.
 * The glints on the mirrors answer the phone's tilt. Its Card and its Cover
 * are loaded on demand, so a guest of any other template downloads neither.
 *
 * NOT YET OFFERED: built in five parts, it is seen only at
 * /demo/sheesh-mahal until it is finished. At the premium price for now; its
 * own is decided later. A card for every wedding, with no symbol of any
 * faith; its sample is the Hindu wedding in Jaipur, in English and Hindi.
 *
 * ITS OWN PAGE TOO: the reply is its page 8 and the thanks its page 9
 * (`page`), and it draws its own "Swipe up", so the page's scroll cue is left
 * off.
 *
 * ONE PALETTE. The font pairs are the three that set names in a script over
 * a refined serif, each with its own Devanagari faces: Great Vibes over
 * Cormorant first.
 */
export const SHEESH_MAHAL: TemplateConfig = {
  id: "sheesh-mahal",
  name: "Sheesh Mahal",
  description:
    "Light a diya, walk through doors of mirror-work, and on through a night palace, room by room.",
  /* Only for which sample wedding its demo shows. */
  category: "hindu",
  categoryLabel: "For every wedding",
  listed: false,
  collection: "premium",
  price: PREMIUM_PRICE_PAISE,
  preview: null,
  palettes: [
    { id: "own", label: "Midnight", paletteId: "midnight", accentOverride: GOLD },
  ],
  fontPairs: ["royal", "graceful", "romantic"],
  sections: SWITCHABLE_SECTIONS,
  baseDesign: {
    ...DEFAULT_DESIGN,
    style: {
      fontPairId: "royal",
      paletteId: "midnight",
      density: "comfortable",
      accentOverride: GOLD,
      /*
        The night's own indigo for the ground (what shows before a room has
        loaded, and round the column on a wide screen), and ivory for what the
        guest's page sets straight on it.
      */
      textColors: {
        textPrimary: IVORY,
        textSecondary: IVORY_MUTED,
        cardColor: INDIGO,
        accent: GOLD,
        chosen: false,
      },
    },
    /* Its decoration is its own artwork: nothing of the card's scattered, flying or falling over it. */
    borderStyle: "none",
    decorMotion: "none",
    butterflies: "none",
    leaves: false,
    petals: "none",
    coverAnimation: "fold-unfold",
    traditionId: "none",
    dateReveal: "simple",
  },
  Card: dynamic(() => import("@/templates/sheesh-mahal/Card")),
  cover: {
    option: COVER_OPTION,
    Visual: dynamic(() => import("@/templates/sheesh-mahal/Cover")),
  },
  page: {
    RsvpFrame: dynamic(() => import("@/templates/sheesh-mahal/RsvpFrame")),
    rsvpTheme: farmaanTheme,
    Closing: dynamic(() => import("@/templates/sheesh-mahal/Closing")),
    keepsakeArt: true,
    scrollCue: false,
  },
  print: { background: "#F8F1E3", textPrimary: INDIGO_INK },
};
