import { musicMutedByGuest } from "@/lib/cardMusic";
import { loadRecording } from "@/lib/coverSound";

/**
 * Short sounds a card plays as things happen on it: a letter landing on the
 * table, a paper plane, a note dropping. A cover's own opening sound is
 * lib/coverSound.ts; this is for a template whose sounds belong to moments
 * all down the card, each its own small file.
 *
 * LOADED BEFORE THEY ARE NEEDED. A template asks for its files while the
 * cover is still closed (loadEffectSounds, which a cover can wait on), so a
 * sound is never fetched at the moment it should play. One that fails to load
 * is skipped, in silence, every time it is asked for.
 *
 * ONE CONTEXT, STARTED BY THE GUEST'S TAP. Every mobile browser refuses audio
 * no gesture asked for, so the cover's tap calls unlockEffectSounds, which
 * builds the context inside the gesture and plays a silent sample in it.
 * After that a sound can start from a timer or an animation. The context is
 * suspended once nothing has played for a while, so the phone's audio is not
 * kept awake for a card being read, and woken again for the next sound (or by
 * the next tap, where a browser will only wake it from one).
 *
 * WHAT THE GUEST ASKED FOR. Nothing plays under reduced motion, nor once the
 * guest has turned the card's music off (musicMutedByGuest). The same sound
 * never plays over itself: asked for again while it is still playing, or
 * waiting to, it is skipped.
 *
 * NOTHING HERE MAY MATTER. Every failure is a silent return; a card whose
 * phone stays quiet has lost a flourish and nothing else.
 */

/** About 0.8 of each file's own level: they are trimmed and levelled already. */
const VOLUME = 0.8;

/** How long the context runs with nothing to play before it is suspended. */
const IDLE_SUSPEND_MS = 8000;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type AudioContextConstructor = new () => AudioContext;

const ready = new Map<string, AudioBuffer>();
const loading = new Map<string, Promise<void>>();
/* What is playing or waiting to, by file, so the same sound never plays twice at once. */
const playing = new Map<string, AudioBufferSourceNode>();

let context: AudioContext | null = null;
let idleTimer: number | null = null;
let wakeArmed = false;

function contextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const legacy = (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  return window.AudioContext ?? legacy ?? null;
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Fetches and decodes each file once, and resolves when every one has loaded
 * or failed. Never rejects, and makes no sound.
 */
export function loadEffectSounds(urls: readonly string[]): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  return Promise.all(
    urls.map((url) => {
      const pending = loading.get(url);

      if (pending !== undefined) {
        return pending;
      }

      const next = loadRecording(url).then(
        (buffer) => {
          ready.set(url, buffer);
        },
        () => {
          /* Forgotten, so a later mount may try again. Until then it is skipped. */
          loading.delete(url);
        },
      );

      loading.set(url, next);
      return next;
    }),
  ).then(() => undefined);
}

/** Wakes a suspended context from inside the next tap, for a browser that will only wake it from one. */
function armWake(): void {
  if (wakeArmed) {
    return;
  }

  wakeArmed = true;

  const wake = (): void => {
    wakeArmed = false;
    window.removeEventListener("touchend", wake, true);
    window.removeEventListener("click", wake, true);

    if (context !== null && context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }
  };

  window.addEventListener("touchend", wake, { capture: true, passive: true });
  window.addEventListener("click", wake, { capture: true, passive: true });
}

function scheduleIdle(): void {
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer);
  }

  idleTimer = window.setTimeout(() => {
    idleTimer = null;

    if (playing.size === 0 && context !== null && context.state === "running") {
      void context.suspend().then(armWake, () => undefined);
    }
  }, IDLE_SUSPEND_MS);
}

/**
 * Builds the context ahead of the tap, suspended, in an idle moment. Never
 * throws, and makes no sound.
 *
 * Building one is the slow part: `new AudioContext()` starts the browser's
 * audio thread, and inside the tap it held the cover's first frame on a slow
 * phone. Built here while the guest reads the cover, the tap only resumes it
 * (as lib/coverSound.ts's warmCoverSound does for the shared covers).
 */
export function warmEffectSounds(): void {
  if (typeof window === "undefined" || reducedMotion() || context !== null) {
    return;
  }

  const build = (): void => {
    const Constructor = contextConstructor();

    if (Constructor === null || context !== null) {
      return;
    }

    try {
      context = new Constructor();
    } catch {
      /* The tap builds its own. */
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(build, { timeout: 2000 });
  } else {
    window.setTimeout(build, 200);
  }
}

/**
 * Starts the sounds' context inside a guest's tap, in silence. Never throws.
 * Call it from the handler of the tap itself, not after an await.
 */
export function unlockEffectSounds(): void {
  if (reducedMotion()) {
    return;
  }

  const Constructor = contextConstructor();

  if (Constructor === null) {
    return;
  }

  try {
    if (context === null || context.state === "closed") {
      context = new Constructor();
    }

    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }

    const silence = context.createBufferSource();
    silence.buffer = context.createBuffer(1, 1, context.sampleRate);
    silence.connect(context.destination);
    silence.start();
    scheduleIdle();
  } catch {
    /* The card plays in silence. */
  }
}

/**
 * Plays one sound, `delayMs` from now on the audio clock, and returns a way to
 * call it off if it has not started. Never throws.
 *
 * Skipped, silently: under reduced motion, when the guest has turned the
 * music off, when the file has not loaded, when no tap has started the
 * context, and when this same sound is already playing or waiting to.
 */
export function playEffectSound(url: string, delayMs = 0, volume = VOLUME): () => void {
  const nothing = (): void => {};

  if (typeof window === "undefined" || reducedMotion() || musicMutedByGuest() || playing.has(url)) {
    return nothing;
  }

  const buffer = ready.get(url);

  if (buffer === undefined || context === null || context.state === "closed") {
    return nothing;
  }

  try {
    const audio = context;

    if (audio.state === "suspended") {
      void audio.resume().catch(() => undefined);
    }

    const gain = audio.createGain();
    gain.gain.value = volume;
    gain.connect(audio.destination);

    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    const startAt = audio.currentTime + Math.max(0, delayMs) / 1000;
    let ended = false;

    source.onended = () => {
      ended = true;

      if (playing.get(url) === source) {
        playing.delete(url);
      }

      source.disconnect();
      gain.disconnect();
      scheduleIdle();
    };

    source.start(startAt);
    playing.set(url, source);
    scheduleIdle();

    return () => {
      /* Only a sound still waiting to start: one already heard plays out. */
      if (ended || audio.currentTime >= startAt) {
        return;
      }

      try {
        source.stop();
      } catch {
        /* Already stopped. */
      }
    };
  } catch {
    return nothing;
  }
}
