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
    openPromptText: "",
    durationMs: 0,
    sound: null,
    supportsReducedMotion: true,
  },
  {
    id: "envelope-seal",
    label: "Envelope seal",
    description: "A sealed envelope breaks open and the card slides out.",
    openPromptText: "Tap seal to open",
    durationMs: 1400,
    sound: "seal",
    supportsReducedMotion: true,
  },
  {
    id: "curtain-reveal",
    label: "Curtain reveal",
    description: "Two curtains draw apart to show the card behind them.",
    openPromptText: "Tap to draw the curtains",
    durationMs: 1100,
    sound: "curtain",
    supportsReducedMotion: true,
  },
  {
    id: "fold-unfold",
    label: "Fold and unfold",
    description: "A folded card opens out flat, one panel at a time.",
    openPromptText: "Tap to unfold",
    durationMs: 1300,
    sound: "fold",
    supportsReducedMotion: true,
  },
  {
    id: "petal-dust",
    label: "Petal dust",
    description: "Petals scatter off the cover and settle to reveal the card.",
    openPromptText: "Tap to scatter the petals",
    durationMs: 1200,
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
