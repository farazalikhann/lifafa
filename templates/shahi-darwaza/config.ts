import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { COVER_IMAGES } from "@/templates/shahi-darwaza/art";
import { TAPPED } from "@/templates/shahi-darwaza/coverTiming";
import {
  DRAG_PROMPT,
  GOLD,
  IVORY,
  IVORY_SOFT,
  MAROON,
  paperTheme,
} from "@/templates/shahi-darwaza/shared";
import { SWITCHABLE_SECTIONS } from "@/templates/shared/fromPreset";
import { SHAHI_DARWAZA_LISTING } from "@/templates/premium";
import type { TemplateConfig } from "@/templates/types";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/**
 * The door: the template's own cover, on every card in it.
 *
 * A gold key hangs on maroon velvet. The guest drags it to the lock of a
 * carved palace door, or taps and it flies there by itself; it turns with a
 * click, and a film of the door opening plays onto the courtyard inside,
 * which is the card's first screen. See Cover.tsx for the parts and
 * coverTiming.ts for the times.
 *
 *   It waits for the fonts, the key and the door, and no longer than five
 *   seconds. The film is fetched once the cover is up.
 *
 *   Its own sound, a soft brass click, goes as the key reaches the lock.
 *
 *   The shell's "You are invited" is left off the closed cover: the
 *   courtyard says it, with the names and the date, as the film ends.
 */
const ENVELOPE = getCoverAnimation("envelope-seal");
const COVER_ART = {
  images: COVER_IMAGES,
  timeoutMs: 5000,
  tone: "dark" as const,
  invite: false,
  ink: IVORY,
  inkMuted: IVORY_SOFT,
};

const COVER_OPTION: CoverAnimationOption = {
  ...ENVELOPE,
  openPromptText: DRAG_PROMPT,
  durationMs: TAPPED.durationMs,
  revealAt: TAPPED.revealAt,
  burstAt: undefined,
  sound: "shahi-darwaza",
  haptic: 10,
  wordsOn: "visual",
  art: () => COVER_ART,
  /* The film's timings, for a tap: the key's flight, the turn, the film and the fade. */
  film: () => TAPPED,
};

/**
 * Shahi Darwaza: a palace door opened with a key.
 *
 * Maroon velvet and a hanging gold key; the door's film opens onto a
 * courtyard of drapes, roses and lanterns, which is the hero, with the
 * invitation, the names and the date over its sky. The sections below are
 * the card's own, set in ivory and gold on maroon, and the reply form is on
 * ivory paper.
 *
 * NOT IN THE GALLERY YET (`listed: false` in premium.ts): it is seen at
 * /demo/shahi-darwaza while it is built.
 *
 * A CARD FOR EVERY WEDDING: there is no symbol of any faith on it. Its
 * sample is the Hindu wedding.
 */
export const SHAHI_DARWAZA: TemplateConfig = {
  creditInk: "accent",
  ...SHAHI_DARWAZA_LISTING,
  description:
    "A gold key and a carved palace door that opens onto a courtyard of roses and lanterns.",
  /* Only for which sample wedding its demo shows: the Premium Collection has no chips. */
  category: "hindu",
  categoryLabel: "For every wedding",
  badge: "New",
  palettes: [
    { id: "own", label: "Maroon", paletteId: "maroon", accentOverride: GOLD },
  ],
  fontPairs: ["royal", "graceful", "romantic"],
  sections: SWITCHABLE_SECTIONS,
  baseDesign: {
    ...DEFAULT_DESIGN,
    style: {
      fontPairId: "royal",
      paletteId: "maroon",
      density: "comfortable",
      accentOverride: GOLD,
      textColors: {
        textPrimary: IVORY,
        textSecondary: IVORY_SOFT,
        cardColor: MAROON,
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
  cover: {
    option: COVER_OPTION,
  },
  page: {
    rsvpTheme: paperTheme,
    keepsakeArt: false,
  },
  print: { background: "#F6EFE0", textPrimary: "#4A0F1A" },
};
