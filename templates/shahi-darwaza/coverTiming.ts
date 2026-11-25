import type { CoverFilmTiming } from "@/types/coverAnimation";

/*
  Shahi Darwaza's opening, apart from its drawing so the config can read it
  without fetching the cover. Every time is in ms from the moment the opening
  starts. See Cover.tsx for what each part does.

  A touch anywhere on the cover opens it: the key flies to the lock by itself
  first, over FLY_MS (TAPPED). Then, from the moment it is in the lock:

    0 to 420        the click, and the key turns (squashed across and back);
                    a little gold light comes and goes on the lock
    420 to 680      the key fades
    420             the film starts over the door, at 1.2 times its speed
    + FILM_MS       the film ends on the courtyard, which is the card's hero
    + END_FADE_MS   the cover fades onto the hero; the card is let go as the
                    fade starts, so its words come in over the courtyard

  The shell's own timers are only the longest the opening may take: the
  cover tells the shell when the film has really ended (`retime`), so a film
  that starts late is not cut short.
*/
export const FLY_MS = 900;
export const TURN_MS = 420;
export const KEY_FADE_MS = 260;
export const FILM_RATE = 1.2;
/* The film is 10.04s long. */
export const FILM_MS = Math.round(10042 / FILM_RATE);
export const END_FADE_MS = 600;
/* The crossfade from the door to the courtyard, when the film cannot play. */
export const FALLBACK_MS = 1200;
/* Room for a film that starts a moment late, before the shell gives up on it. */
const SLACK_MS = 1500;

function timing(leadMs: number): CoverFilmTiming {
  const durationMs = leadMs + TURN_MS + FILM_MS + END_FADE_MS + SLACK_MS;

  return {
    durationMs,
    revealAt: (durationMs - END_FADE_MS) / durationMs,
    /* The click goes when the key reaches the lock. */
    soundDelayMs: leadMs,
  };
}

/** A touch: the key flies to the lock first. The cover's own timing, for a touch anywhere on it. */
export const TAPPED = timing(FLY_MS);
