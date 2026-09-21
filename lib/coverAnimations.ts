/**
 * The table of opening animations, and the lookups that read it.
 *
 * One hand written list is the whole source of truth: the designer renders it
 * in order, and the public card looks a saved id up in it. See
 * types/coverAnimation.ts on why an id here is permanent.
 */

import type { CoverAnimationId, CoverAnimationOption } from "@/types/coverAnimation";

export const COVER_ANIMATIONS: readonly CoverAnimationOption[] = [
  {
    id: "none",
    label: "No animation",
    description: "The card is open the moment the guest arrives.",
    openPromptText: { en: "", hi: "" },
    durationMs: 0,
    revealAt: 0,
    sound: null,
    supportsReducedMotion: true,
  },
  {
    id: "envelope-seal",
    label: "Envelope seal",
    description: "A sealed envelope breaks open and the card slides out.",
    openPromptText: {
      en: "Tap seal to open",
      hi: "खोलने के लिए मुहर पर टैप करें",
    },
    /*
      1.8s, from 2.2. The guest has just tapped a link in a chat and is holding
      the phone waiting; every stage keeps its share of the open, so the seal,
      the flap and the letter all run a fifth quicker rather than any one of
      them being cut.
    */
    durationMs: 1800,
    /* As the letter starts towards the guest: EXIT_START in the visual is 0.64. */
    revealAt: 0.62,
    sound: "seal",
    supportsReducedMotion: true,
  },
  {
    id: "curtain-reveal",
    label: "Curtain reveal",
    description: "Two curtains draw apart to show the card behind them.",
    openPromptText: {
      en: "Tap to draw the curtains",
      hi: "पर्दे हटाने के लिए टैप करें",
    },
    durationMs: 1600,
    /* As soon as there is a gap between the panels to see the card through. */
    revealAt: 0.12,
    sound: "curtain",
    supportsReducedMotion: true,
  },
  {
    id: "fold-unfold",
    label: "Fold and unfold",
    description: "A folded card opens out flat, one panel at a time.",
    openPromptText: {
      en: "Tap to unfold",
      hi: "खोलने के लिए टैप करें",
    },
    durationMs: 1800,
    /* As the opened card starts to lift away: EXIT_START in the visual is 0.54. */
    revealAt: 0.5,
    sound: "fold",
    supportsReducedMotion: true,
  },
  {
    id: "petal-dust",
    label: "Petal dust",
    description: "Leaves and petals blow off the cover to reveal the card.",
    openPromptText: {
      en: "Tap to scatter the petals",
      hi: "पंखुड़ियाँ बिखेरने के लिए टैप करें",
    },
    durationMs: 2000,
    /* With the first gust: the ground starts clearing at 0.1 in the visual. */
    revealAt: 0.1,
    sound: "chime",
    supportsReducedMotion: true,
  },
];

/** What a new card gets before the host picks anything. */
export const DEFAULT_COVER_ANIMATION: CoverAnimationId = "envelope-seal";

/** The option every unknown id falls back to, kept here so lookups cannot fail. */
const NONE_OPTION: CoverAnimationOption = COVER_ANIMATIONS[0];

/** True when the value is one of the saved animation ids. */
export function isCoverAnimationId(value: unknown): value is CoverAnimationId {
  return COVER_ANIMATIONS.some((option) => option.id === value);
}

/**
 * The option a saved id names, or the "none" option when it names nothing.
 *
 * Rows written by an older build, or edited by hand, can carry an id this build
 * has never heard of, or no id at all. A card that renders with no animation is
 * a far better answer there than a card that throws, so a missing column is
 * accepted at the type level too.
 */
export function getCoverAnimation(id: string | null | undefined): CoverAnimationOption {
  const match = COVER_ANIMATIONS.find((option) => option.id === id);
  return match ?? NONE_OPTION;
}
