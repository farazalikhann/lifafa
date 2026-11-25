import { getCoverAnimation } from "@/lib/coverAnimations";
import { DEFAULT_DESIGN } from "@/lib/designDefaults";
import { COVER_IMAGES } from "@/templates/shahi-darwaza/art";
import { TAPPED } from "@/templates/shahi-darwaza/coverTiming";
import {
  KEY_PROMPT,
  GOLD_DEEP,
  INK,
  INK_SOFT,
  IVORY,
  IVORY_SOFT,
  PAPER,
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
  openPromptText: KEY_PROMPT,
  durationMs: TAPPED.durationMs,
  revealAt: TAPPED.revealAt,
  burstAt: undefined,
  sound: "shahi-darwaza",
  /* The cover's own 10ms tick, on the first touch (Cover.tsx); the shell's would make it two. */
  haptic: undefined,
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
 * invitation, the names and the date over its sky. Below it everything is on
 * ivory paper in maroon ink: a letter in a sealed envelope, the couple in a
 * marble arch, the month with the day circled, the functions down a silk
 * thread, the palace, the countdown over the courtyard at night, and the
 * reply form on a scroll. See Card.tsx.
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
    { id: "own", label: "Ivory and maroon", paletteId: "cream", accentOverride: GOLD_DEEP },
  ],
  fontPairs: ["royal", "graceful", "romantic"],
  sections: SWITCHABLE_SECTIONS,
  baseDesign: {
    ...DEFAULT_DESIGN,
    style: {
      fontPairId: "royal",
      /* The nearest of the card's palettes, for anything that reads one by name. */
      paletteId: "cream",
      density: "comfortable",
      accentOverride: GOLD_DEEP,
      /* The paper and its inks: what the card below the hero, and the page round it, are painted in. */
      textColors: {
        textPrimary: INK,
        textSecondary: INK_SOFT,
        cardColor: PAPER,
        accent: GOLD_DEEP,
        chosen: false,
      },
    },
    /* Its decoration is its own artwork, its rose petals included (Petals.tsx): none of the card's shared ones. */
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
