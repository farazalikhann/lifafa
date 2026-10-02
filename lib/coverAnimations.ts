/**
 * The table of opening animations, and the lookups that read it.
 *
 * One hand written list is the whole source of truth: the designer renders it
 * in order, and the public card looks a saved id up in it. See
 * types/coverAnimation.ts on why an id here is permanent.
 */

import { curtainArt } from "@/lib/curtainArt";
import { envelopeArt } from "@/lib/envelopeArt";
import { petalCoverArt } from "@/lib/petalCoverArt";
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
      en: "Tap the seal to open",
      hi: "खोलने के लिए मुहर पर टैप करें",
    },
    /*
      2.4s: the seal peeled away (0.3s), the flap turned over (0.7s), the
      letter drawn out (0.8s) and the envelope let go as the letter comes
      forward (0.6s), each given the time real paper takes. The shares are in
      the visual; the sound's own timings in lib/coverSound.ts shadow them.
    */
    durationMs: 2400,
    /*
      As the letter starts up out of the pocket: RISE_START in the visual.
      That is also when a card's petal burst is thrown.
    */
    revealAt: 0.36,
    sound: "seal",
    haptic: 10,
    supportsReducedMotion: true,
    art: envelopeArt,
  },
  {
    id: "curtain-reveal",
    label: "Curtain reveal",
    description: "Two curtains draw apart to show the card behind them.",
    openPromptText: {
      en: "Tap to open",
      hi: "खोलने के लिए टैप करें",
    },
    /*
      The curtains take 1.6s to draw, and the valance over them then fades in
      the 350ms that are left: DRAW_SHARE in the visual is 1600 of these.
    */
    durationMs: 1950,
    /*
      As soon as there is a gap between the panels to see the card through,
      which is also when a card's petal burst should start.
    */
    revealAt: 0.12,
    sound: "curtain",
    supportsReducedMotion: true,
    /* The cloth fills the screen, so the prompt sits on a plaque of its own. */
    wordsOn: "plaque",
    art: curtainArt,
  },
  {
    id: "fold-unfold",
    label: "Fold and unfold",
    description: "A folded card opens out flat, one panel at a time.",
    openPromptText: {
      en: "Tap to unfold",
      hi: "खोलने के लिए टैप करें",
    },
    /*
      2s, from 1.8. The card now slips its ribbon and settles to fit the
      screen as it opens, and at 1.8 the ribbon and the turn ran together.
    */
    durationMs: 2000,
    /* As the opened card starts to come forward: EXIT_START in the visual is 0.56. */
    revealAt: 0.54,
    sound: "fold",
    supportsReducedMotion: true,
  },
  {
    id: "petal-dust",
    label: "Petal dust",
    description: "Leaves and petals blow off the cover to reveal the card.",
    openPromptText: {
      en: "Tap to open",
      hi: "खोलने के लिए टैप करें",
    },
    /* 1.8s: the gust crosses the screen in the first half of it, and the last petals leave in the rest. */
    durationMs: 1800,
    /* With the first of the gust: the card is what shows where the petals have gone. */
    revealAt: 0.1,
    /* The card's own petals follow the gust rather than being lost in it. */
    burstAt: 0.86,
    sound: "chime",
    haptic: 10,
    supportsReducedMotion: true,
    /* The picture has an oval left empty for them, and the visual letters them into it. */
    wordsOn: "visual",
    art: petalCoverArt,
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
