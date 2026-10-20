/**
 * The card's background music, started by the guest's tap on the cover.
 *
 * MusicToggle owns the music: its <audio> element, created in the browser
 * with nothing fetched until it is played, and the button that pauses and
 * plays it. It hands the element here (registerMusic), so the cover, which is
 * not part of the card, can start it from the one moment a phone allows it:
 * inside the guest's own tap.
 *
 * STARTED IN THE TAP ITSELF, SILENT. play() is called synchronously in the
 * cover's tap handler, muted, which is what unlocks an element on every
 * mobile browser (a play() after an await or a timer is refused there, and
 * that refusal was the music that sometimes never came). It plays on in
 * silence under the cover's own sound, and is faded in to its normal volume
 * when that sound has ended (an iPhone, which lets no page set an element's
 * volume, simply unmutes it then).
 *
 * REFUSED ANYWAY, it waits: the next pointerdown, touchend or keydown
 * anywhere on the page starts it, once, at its normal volume, and until then
 * the button shows it paused, which it is. A press on the music button itself
 * is left to the button.
 *
 * THE GUEST DECIDES. Once they have paused it with the button it is never
 * started again by anything but the button, and the card's other sounds can
 * ask whether they did (musicMutedByGuest). Not started at all under reduced
 * motion, when the cover makes no sound either. Every failure is silent: a
 * card that cannot play its music still opens.
 */

/** How long the music takes to come up to its volume once the cover's sound has ended. */
const FADE_MS = 1500;
const FADE_STEP_MS = 50;
/* The element's own, full: what the button plays it at. */
const VOLUME = 1;

let music: HTMLAudioElement | null = null;
let mutedByGuest = false;
let fadeTimer: number | null = null;
let disarm: (() => void) | null = null;

function stopFade(): void {
  if (fadeTimer !== null) {
    window.clearTimeout(fadeTimer);
    window.clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

/** MusicToggle's element, while it has one; returns how to take it back. */
export function registerMusic(audio: HTMLAudioElement): () => void {
  music = audio;

  return () => {
    if (music === audio) {
      music = null;
      stopFade();
      disarm?.();
    }
  };
}

/** The guest pressed the music button: playing, or paused. */
export function noteGuestChoice(playing: boolean): void {
  mutedByGuest = !playing;
  stopFade();
  disarm?.();

  if (playing && music !== null) {
    music.muted = false;
    trySetVolume(music, VOLUME);
  }
}

/** Whether the guest has turned the card's music off. */
export function musicMutedByGuest(): boolean {
  return mutedByGuest;
}

/** The volume, where the browser lets a page set it (an iPhone does not, and may throw). */
function trySetVolume(audio: HTMLAudioElement, volume: number): void {
  try {
    audio.volume = volume;
  } catch {
    /* Left at the element's own. */
  }
}

/** Up from silence to its volume, in small steps; on an iPhone, simply unmuted. */
function fadeIn(audio: HTMLAudioElement): void {
  stopFade();

  if (mutedByGuest || audio.paused) {
    return;
  }

  trySetVolume(audio, 0);
  audio.muted = false;
  const started = performance.now();

  fadeTimer = window.setInterval(() => {
    const share = Math.min(1, (performance.now() - started) / FADE_MS);
    trySetVolume(audio, VOLUME * share * share);

    if (share >= 1) {
      stopFade();
    }
  }, FADE_STEP_MS);
}

/** Refused in the tap: started by the guest's next touch or key anywhere, once. */
function waitForNextGesture(audio: HTMLAudioElement): void {
  disarm?.();
  const kinds = ["pointerdown", "touchend", "keydown"] as const;

  const onGesture = (event: Event): void => {
    const target = event.target instanceof Element ? event.target : null;
    off();

    /* The music button's own press is the button's to answer. */
    if (target?.closest("[data-music-toggle]") || mutedByGuest || music !== audio) {
      return;
    }

    audio.muted = false;
    trySetVolume(audio, VOLUME);
    void audio.play().catch(() => undefined);
  };

  const off = (): void => {
    for (const kind of kinds) {
      document.removeEventListener(kind, onGesture, true);
    }
    if (disarm === off) {
      disarm = null;
    }
  };

  for (const kind of kinds) {
    document.addEventListener(kind, onGesture, { capture: true, passive: true });
  }
  disarm = off;
}

/**
 * Called inside the guest's tap on the cover, synchronously: starts the music
 * muted, and brings it in `fadeInAfterMs` later, when the cover's sound has
 * ended. Does nothing for a card with no music or one the guest silenced.
 */
export function startMusicFromTap(fadeInAfterMs: number): void {
  const audio = music;

  if (audio === null || mutedByGuest) {
    return;
  }

  /* Already started silent by the tap, and now the cover is skipped: brought in sooner. */
  if (!audio.paused) {
    if (audio.muted) {
      stopFade();
      fadeTimer = window.setTimeout(() => fadeIn(audio), Math.max(0, fadeInAfterMs));
    }

    return;
  }

  audio.muted = true;
  let playing: Promise<void>;

  try {
    playing = audio.play() ?? Promise.resolve();
  } catch (cause) {
    playing = Promise.reject(cause);
  }

  void playing.then(
    () => {
      stopFade();
      fadeTimer = window.setTimeout(() => fadeIn(audio), Math.max(0, fadeInAfterMs));
    },
    () => {
      audio.muted = false;
      waitForNextGesture(audio);
    },
  );
}
