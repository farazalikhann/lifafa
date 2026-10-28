import { loadEffectSounds, warmEffectSounds } from "@/lib/effectSound";

/**
 * Dak Ghar's sounds, in public/sounds/dak-ghar/ (trimmed and levelled, played
 * as they are), and what the cover waits for before it is shown.
 *
 *   tap      the guest's tap on the post box, inside the tap itself
 *   slip     the date slip printing up out of the slot
 *   stamp    the postmark landing on it
 *   whoosh   the letter, and the telegram, landing on the table
 *   plane    the paper plane carrying the reply
 *   noteDrop the thank-you note landing
 *
 * Each starts SOUND_LEAD_MS before the moment it belongs to, so the ear and
 * the eye meet. Played through lib/effectSound.ts: never over itself, never
 * under reduced motion or with the music turned off, skipped if it failed.
 */
const DIR = "/sounds/dak-ghar";

export const SOUND = {
  tap: `${DIR}/dg-postbox-tap.mp3`,
  slip: `${DIR}/dg-slip-print.mp3`,
  stamp: `${DIR}/dg-stamp.mp3`,
  whoosh: `${DIR}/dg-paper-whoosh.mp3`,
  plane: `${DIR}/dg-plane.mp3`,
  noteDrop: `${DIR}/dg-note-drop.mp3`,
} as const;

export const SOUND_LEAD_MS = 60;

const ALL_SOUNDS: readonly string[] = Object.values(SOUND);

/*
  The faces the cover and the first page are lettered in (DAK_FONTS, and the
  shell's "You are invited" in the Elegant pair), by the variables
  app/layout.tsx declares them under; Devanagari only on a Hindi card.
*/
const FACES: readonly { variable: string; weight: number; hindi: boolean }[] = [
  { variable: "--font-cormorant", weight: 600, hindi: false },
  { variable: "--font-manrope", weight: 600, hindi: false },
  { variable: "--font-manrope", weight: 500, hindi: false },
  { variable: "--font-hi-noto-serif", weight: 600, hindi: true },
  { variable: "--font-hi-tiro", weight: 400, hindi: true },
];

/** Resolves once the cover's own faces are in, or have failed. Never rejects. */
function facesReady(): Promise<void> {
  if (typeof document.fonts !== "object") {
    return Promise.resolve();
  }

  const styles = getComputedStyle(document.documentElement);
  const hindi = document.querySelector('[lang="hi"], [lang="hi-IN"]') !== null;

  return Promise.all(
    FACES.filter((face) => hindi || !face.hindi).map((face) => {
      const family = styles.getPropertyValue(face.variable).trim();

      if (family === "") {
        return undefined;
      }

      return document.fonts
        .load(`${face.weight} 16px ${family}`, face.hindi ? "अ" : "A")
        .then(() => undefined, () => undefined);
    }),
  ).then(() => undefined);
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * What the cover waits for besides its pictures: its faces, and every sound
 * on the card (none under reduced motion, which plays none). A sound that
 * fails is let through; the card plays without it.
 */
export function coverExtrasReady(): Promise<void> {
  /* The audio context too, built while the cover waits, so the tap only has to start it. */
  warmEffectSounds();
  return Promise.all([facesReady(), reducedMotion() ? undefined : loadEffectSounds(ALL_SOUNDS)]).then(() => undefined);
}
