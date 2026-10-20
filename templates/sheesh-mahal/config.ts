import dynamic from "next/dynamic";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { DURATION, REVEAL_AT, SETTLE_LIMIT } from "@/templates/sheesh-mahal/coverTiming";
import {
  coverImages,
  COVER_FULL,
  COVER_LIGHT,
  COVER_PRELOAD,
  goLighter,
} from "@/templates/sheesh-mahal/lighter";
import {
  GOLD,
  INDIGO,
  INDIGO_INK,
  IVORY,
  IVORY_MUTED,
  farmaanTheme,
  sheeshCopy,
} from "@/templates/sheesh-mahal/shared";
import { askTilt } from "@/templates/sheesh-mahal/tilt";
import { SWITCHABLE_SECTIONS } from "@/templates/shared/fromPreset";
import { SHEESH_MAHAL_LISTING } from "@/templates/premium";
import type { TemplateConfig } from "@/templates/types";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/**
 * The doors of mirrors: the template's own cover, on every card in it.
 *
 * Built on the doors the editor already offers ("fold-unfold", the gatefold),
 * for its id only, so a stored card names a cover the database knows; the
 * drawing, the timings, the prompt and the sound are this template's:
 *
 *   3.3s in all: the camera is through the doors at 3s, and the cover's hall
 *   has faded into page 2's own by 3.25s. The card is let go at the very end
 *   (`revealAt`), so page 2's names make their entrance in front of the
 *   guest. See Cover.tsx. The opening waits at most a quarter of a second
 *   for fullscreen (`settleLimitMs`).
 *
 *   It waits for the wall, both doors and the hall, and the fonts, and no
 *   longer than five seconds; nothing of the stock doors' film is fetched.
 *   On a slow connection those four are the lighter set, and kept waiting
 *   2.5 seconds the loader says so (lighter.ts, `slowLoad`).
 *
 *   "Tap to open" is lettered by the cover itself, over the doors' foot; the
 *   shell sets only "You are invited" over it.
 *
 *   The tap asks for the phone's tilt, where the browser wants asking, for
 *   the mirrors' glints (tilt.ts): the one prompt an iPhone may show.
 */
const DOORS = getCoverAnimation("fold-unfold");
const COVER_ART = {
  images: COVER_FULL,
  timeoutMs: 5000,
  /* Ivory on the night, over a soft dark shadow. */
  tone: "dark" as const,
  wordsLine: false,
  ink: IVORY,
  inkMuted: IVORY_MUTED,
};

/*
  The four pictures in the set this guest's connection was given (see
  lighter.ts), named on the server as none: the page's own head script asks
  for them there, as the HTML arrives. One object for each, so the shell's
  wait is set up once.
*/
const COVER_ART_LIGHT = { ...COVER_ART, images: COVER_LIGHT };
const COVER_ART_NONE = { ...COVER_ART, images: [] as readonly string[] };
const coverArt = (): typeof COVER_ART => {
  const images = coverImages();
  return images === COVER_FULL ? COVER_ART : images === COVER_LIGHT ? COVER_ART_LIGHT : COVER_ART_NONE;
};

const COVER_OPTION: CoverAnimationOption = {
  ...DOORS,
  openPromptText: {
    en: sheeshCopy("en").tapToOpen,
    hi: sheeshCopy("hi").tapToOpen,
  },
  durationMs: DURATION,
  revealAt: REVEAL_AT / DURATION,
  burstAt: undefined,
  sound: "sheesh-mahal",
  haptic: 10,
  wordsOn: "visual",
  art: coverArt,
  /* Asks for the cover's four pictures, in the set for this guest's connection, as the HTML arrives. */
  earlyScript: COVER_PRELOAD,
  /* Kept waiting: said under the loader, and every room after the cover in its lighter pictures. */
  slowLoad: {
    text: { en: sheeshCopy("en").slowLoad, hi: sheeshCopy("hi").slowLoad },
    onSlow: goLighter,
  },
  film: undefined,
  onTap: askTilt,
  /* Starts within a quarter of a second of the tap, fullscreen or not. */
  settleLimitMs: SETTLE_LIMIT,
};

/**
 * Sheesh Mahal: a night palace of mirrors, the most premium of the cards.
 *
 * The guest taps a door of mirror-work, the doors swing open and the camera
 * walks in, and then through room after room, one swipe each:
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
  ...SHEESH_MAHAL_LISTING,
  description:
    "Open doors of mirror-work and walk on through a night palace, room by room.",
  /* Only for which sample wedding its demo shows. */
  category: "hindu",
  categoryLabel: "For every wedding",
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
