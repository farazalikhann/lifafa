/**
 * The table of opening animations, and the lookups that read it.
 *
 * One hand written list is the whole source of truth: the designer renders it
 * in order, and the public card looks a saved id up in it. See
 * types/coverAnimation.ts on why an id here is permanent.
 */

import { breezeArt } from "@/lib/breezeArt";
import { FOLD_FILMS, filmArt, filmTiming } from "@/lib/coverVideos";
import { envelopeLightArt, envelopeLightTiming } from "@/lib/envelopeLightFilm";
import { curtainLightArt, curtainLightTiming } from "@/lib/curtainLightFilm";
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
    description: "A royal envelope breaks its seal, and the card appears out of the light.",
    openPromptText: {
      en: "Tap the seal to open",
      hi: "खोलने के लिए मुहर पर टैप करें",
    },
    /*
      The drawn envelope's timings, which opens when the film cannot.
      2.4s: the seal peeled away (0.3s), the flap turned over (0.7s), the
      letter drawn out (0.8s) and the envelope let go as the letter comes
      forward (0.6s), each given the time real paper takes. The shares are in
      the visual, and are set to the recording's own timings.
    */
    durationMs: 2400,
    /*
      As the letter starts up out of the pocket: RISE_START in the visual.
      That is also when a card's petal burst is thrown.
    */
    revealAt: 0.415,
    sound: "envelope",
    haptic: 10,
    supportsReducedMotion: true,
    /* The envelope fills the screen, so the prompt sits on a plaque of its own. */
    wordsOn: "plaque",
    /*
      Played from film: the seal breaks, the flap lifts on a light that fills
      the screen, and the card comes out of the light. One film for every
      card, and the visual follows the film's own clock, so the timing here
      is only the shell's net. See lib/envelopeLightFilm.ts.
    */
    art: envelopeLightArt,
    film: envelopeLightTiming,
  },
  {
    id: "curtain-reveal",
    label: "Curtain reveal",
    description: "Velvet curtains open on a golden light, and the card appears out of it.",
    openPromptText: {
      en: "Tap to open",
      hi: "खोलने के लिए टैप करें",
    },
    /*
      The drawn curtains' timings, which open when the film cannot. 3.2s: the
      words go (0.25s), the two curtains draw apart over the card (2.6s), and
      the valance lifts away in what is left. The shares are in
      CurtainRevealCover.
    */
    durationMs: 3200,
    /* As soon as there is a gap between the panels to see the card through. */
    revealAt: 0.16,
    sound: "curtain",
    haptic: 10,
    supportsReducedMotion: true,
    /* The cloth fills the screen, so the prompt sits on a plaque of its own. */
    wordsOn: "plaque",
    /*
      Played from film: the curtains open on a light that fills the screen,
      and the card comes out of the light. One film for every card, and the
      visual follows the film's own clock, so the timing here is only the
      shell's net. See lib/curtainLightFilm.ts.
    */
    art: curtainLightArt,
    film: curtainLightTiming,
  },
  {
    id: "fold-unfold",
    label: "Fold and unfold",
    description: "Two doors tied with a ribbon swing open to show the card.",
    openPromptText: {
      en: "Tap to open",
      hi: "खोलने के लिए टैप करें",
    },
    /*
      1.8s: the ribbon slipped off (0.4s), then the two doors, each 0.8s and
      the second 0.2s behind the first. The shares are in the visual, and are
      set to the recording's own timings.
    */
    durationMs: 1800,
    /* As the left door starts to move: LEFT_START in the visual. */
    revealAt: 0.222,
    /* The card's petals are thrown as the second door opens: RIGHT_START. */
    burstAt: 0.333,
    sound: "fold",
    haptic: 10,
    supportsReducedMotion: true,
    /* The doors fill the screen, so the prompt sits on a plaque of its own. */
    wordsOn: "plaque",
    /*
      Played from film, dark or light; see lib/coverVideos.ts. The timings
      above are the drawn cover's, which opens when the film cannot.
    */
    art: filmArt(FOLD_FILMS),
    film: filmTiming(FOLD_FILMS),
  },
  {
    /*
      The id is the petal dust cover's, and stays: it is written into every
      card saved with that cover, and those cards get the breeze.
    */
    id: "petal-dust",
    label: "Breeze",
    description: "A soft breeze blows leaves and petals off the card.",
    openPromptText: {
      en: "Tap to open",
      hi: "खोलने के लिए टैप करें",
    },
    /*
      2.9s: the words go (0.25s), the breeze crosses from the left with the
      veil clearing behind it, and the last leaf is off the right edge at the
      end. The shares are in the visual.
    */
    durationMs: 2900,
    /* With the first of the breeze: the card is what shows where the veil has cleared. */
    revealAt: 0.1,
    /* The card's own petals follow the breeze rather than being lost in it. */
    burstAt: 0.88,
    sound: "petal-dust",
    haptic: 10,
    supportsReducedMotion: true,
    /* Leaves and petals lie all over the screen, so the prompt sits on a plaque of its own. */
    wordsOn: "plaque",
    /* Drawn over the card, not filmed, so the card shows where the breeze has been. See lib/breezeArt.ts. */
    art: breezeArt,
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
