/**
 * The sound a cover makes when a guest opens it.
 *
 * A RECORDING PER COVER, in public/sounds/: about three seconds each, made to
 * the cover's own timeline — the wax, the flap, the letter and a chime for the
 * envelope; the ribbon, the two doors and a chime for the gatefold. They used
 * to be oscillators and bursts of noise built on the spot, which could not
 * fail to load and did not sound like anything in particular.
 *
 * A sound that has to be fetched is a sound that can arrive late, and one
 * that starts late plays over a card the guest is already reading. So the
 * file is fetched AND decoded while the cover is still closed —
 * preloadCoverSound, called from CoverShell — and at the tap it is either
 * ready to start on that frame or it is not played at all. A slow or missing
 * file costs a guest the flourish and nothing else: the cover never waits
 * for it, and nothing is said about it.
 *
 * ONLY THE CARD'S OWN. One cover, one file. The other three are never asked
 * for.
 *
 * IT ONLY EVER FOLLOWS A TAP. Nothing here plays on page load, on hydration,
 * or when a cover is skipped — see CoverShell, which calls playCoverSound from
 * the one handler a guest's own press reaches. preloadCoverSound runs before
 * that, but it makes no sound and opens no audio device: it decodes in an
 * offline context, which no autoplay policy applies to. The tap is also what
 * makes the audio work at all: every mobile browser refuses audio that no
 * gesture asked for, and the context that plays is built inside the tap.
 *
 * THROUGH WEB AUDIO, NOT AN <audio> ELEMENT. On an iPhone an element ignores
 * the volume a page sets and plays through the silent switch. Web Audio
 * respects both, so a phone on silent opens its invitation in silence — the
 * one mute control every guest already has, and the only one this needs.
 *
 * IT IS QUIET AND IT IS SHORT. A guest opens invitations in offices, on trains,
 * next to sleeping children. MusicToggle takes the same position about the
 * card's background music and takes it further — that never starts on its own
 * at all. The difference is that this is the sound of the thing they just
 * pressed, and its tail is a chime dying away as the card settles in.
 *
 * NOTHING IT DOES IS ALLOWED TO MATTER. Every path out of here is a return: a
 * browser with no Web Audio, a context that will not start, an autoplay policy
 * that says no, a recording that will not download or decode. A guest whose
 * phone stays silent has still opened their invitation, and an exception
 * thrown on the way into a card would be a far worse trade than a missing
 * flourish.
 */

/** Which recording a cover plays. One per cover that has anything to say. */
export type CoverSoundId = "curtain" | "envelope" | "petal-dust" | "fold";

/** Served from public/, so the path is also the URL. */
const RECORDINGS: Record<CoverSoundId, string> = {
  curtain: "/sounds/curtain-open.mp3",
  envelope: "/sounds/envelope-open.mp3",
  "petal-dust": "/sounds/petal-dust-open.mp3",
  fold: "/sounds/fold-open.mp3",
};

/**
 * How loud, of the file's own level. The recordings peak a little under full
 * scale, so this sits them under a phone's notification volume: a flourish
 * under a fingertip, not an alert.
 */
const VOLUME = 0.6;

/** How quickly a sound that is cut short — a skip, a replay, a tab left — is faded out. A hard stop clicks. */
const STOP_FADE_S = 0.08;

type AudioContextConstructor = new () => AudioContext;
type OfflineContextConstructor = new (
  channels: number,
  length: number,
  sampleRate: number,
) => OfflineAudioContext;

/** The constructor, under either of its names, or null where there is none. */
function audioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const legacy = (window as Window & {
    webkitAudioContext?: AudioContextConstructor;
  }).webkitAudioContext;

  return window.AudioContext ?? legacy ?? null;
}

function offlineContextConstructor(): OfflineContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const legacy = (window as Window & {
    webkitOfflineAudioContext?: OfflineContextConstructor;
  }).webkitOfflineAudioContext;

  return window.OfflineAudioContext ?? legacy ?? null;
}

/**
 * decodeAudioData, in the one form every browser takes.
 *
 * Safari before 14.1 has only the callback signature and returns nothing.
 * Everything newer takes the callbacks too and also returns a promise, which
 * rejects alongside the error callback; it is quietened so a failure is
 * reported once, not twice.
 */
function decode(context: BaseAudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const pending = context.decodeAudioData(bytes, resolve, reject) as
      | Promise<AudioBuffer>
      | undefined;

    void pending?.catch(() => undefined);
  });
}

/**
 * Recordings ready to play. Module level, so a cover that mounts again (a
 * host replaying the preview) neither fetches nor decodes again.
 */
const readyRecordings = new Map<CoverSoundId, AudioBuffer>();

/** Sounds whose fetch has started, so a cover mounted twice asks once. */
const requestedRecordings = new Set<CoverSoundId>();

/**
 * Fetches and decodes a cover's recording, and never throws.
 *
 * Called while the cover is still closed, so the file has the time a guest
 * spends looking at it to arrive in. Decoded in an offline context: that
 * needs no gesture and opens no audio device, and the buffer it gives plays
 * in the context the tap builds.
 */
export function preloadCoverSound(sound: CoverSoundId | null | undefined): void {
  if (sound === null || sound === undefined || requestedRecordings.has(sound)) {
    return;
  }

  const Offline = offlineContextConstructor();

  if (Offline === null || typeof fetch !== "function") {
    return;
  }

  const url = RECORDINGS[sound];
  requestedRecordings.add(sound);

  void fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`${url} answered ${response.status}`);
      }

      return response.arrayBuffer();
    })
    .then((bytes) => decode(new Offline(2, 1, 44100), bytes))
    .then((buffer) => {
      readyRecordings.set(sound, buffer);
    })
    .catch(() => {
      /*
        Forgotten rather than remembered as failed, so the next cover to mount
        tries again. This one opens in silence, and says nothing about it.
      */
      requestedRecordings.delete(sound);
    });
}

/** The sound playing now, if one is: its context, its gain, and the timer that closes it. */
let playing: {
  context: AudioContext;
  gain: GainNode;
  source: AudioBufferSourceNode;
  closing: number;
} | null = null;

/**
 * Stops the opening sound, if one is playing, with a short fade. Never throws.
 *
 * For a guest who skips the cover, a host who replays it, and a page that is
 * left: a three-second sound outlives all three.
 */
export function stopCoverSound(): void {
  const current = playing;

  if (current === null) {
    return;
  }

  playing = null;
  window.clearTimeout(current.closing);

  try {
    const now = current.context.currentTime;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setValueAtTime(current.gain.gain.value, now);
    current.gain.gain.linearRampToValueAtTime(0, now + STOP_FADE_S);
  } catch {
    /* A context already closing has nothing left to fade. */
  }

  window.setTimeout(() => {
    void current.context.close().catch(() => undefined);
  }, STOP_FADE_S * 1000 + 40);
}

/** A page being left, or put in the background: the sound does not follow the guest out. */
function stopWhenHidden(): void {
  if (document.visibilityState === "hidden") {
    stopCoverSound();
  }
}

/** Closes a context once its recording has run out, and forgets it if it is still the one playing. */
function closeAfter(context: AudioContext, ms: number): number {
  return window.setTimeout(() => {
    if (playing?.context === context) {
      playing = null;
      document.removeEventListener("visibilitychange", stopWhenHidden);
      window.removeEventListener("pagehide", stopCoverSound);
    }

    void context.close().catch(() => undefined);
  }, ms);
}

/**
 * Starts the sound that is playing, or waiting to, again from its top and at
 * once. Never throws.
 *
 * For a cover that was to open from its film, with the sound held back to
 * meet it, and is opening from its drawing instead, which moves on the tap.
 * In the context the tap built: a new one made here, outside the gesture,
 * is one an iPhone would refuse to start.
 */
export function restartCoverSound(): void {
  const current = playing;

  if (current === null || current.source.buffer === null) {
    return;
  }

  try {
    const buffer = current.source.buffer;
    const source = current.context.createBufferSource();
    source.buffer = buffer;
    source.connect(current.gain);

    current.source.stop();
    current.source.disconnect();
    source.start(current.context.currentTime);

    window.clearTimeout(current.closing);
    current.source = source;
    current.closing = closeAfter(current.context, buffer.duration * 1000 + 300);
  } catch {
    /* Whatever was scheduled plays as it was, or not at all. */
  }
}

/**
 * Plays one cover's sound from its start, and never throws.
 *
 * Only if its recording is ready: one still on its way is left to land
 * unheard. A fresh context per open, closed when the recording has ended.
 * Holding one for the life of the page would keep an audio device awake for a
 * sound that plays once.
 *
 * `delayMs` holds the start back from the tap, for a cover whose film is
 * still for a moment first. Scheduled on the audio clock inside the tap, not
 * on a timer after it, so it is as exact as the sound itself and needs no
 * second gesture.
 */
export function playCoverSound(sound: CoverSoundId | null | undefined, delayMs = 0): void {
  if (sound === null || sound === undefined) {
    return;
  }

  const buffer = readyRecordings.get(sound);
  const Constructor = audioContextConstructor();

  if (buffer === undefined || Constructor === null) {
    return;
  }

  /* One at a time: a replay starts again from the top rather than over the last. */
  stopCoverSound();

  try {
    const context = new Constructor();

    const gain = context.createGain();
    gain.gain.value = VOLUME;
    gain.connect(context.destination);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    /*
      Suspended is the normal state on iOS even inside a gesture, and resume()
      is what a gesture buys. It resolves after the sound has been scheduled,
      which is fine: currentTime does not advance while the context is
      suspended.
    */
    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }

    source.start(context.currentTime + delayMs / 1000);

    const closing = closeAfter(context, delayMs + buffer.duration * 1000 + 300);

    playing = { context, gain, source, closing };
    document.addEventListener("visibilitychange", stopWhenHidden);
    window.addEventListener("pagehide", stopCoverSound);
  } catch {
    /*
      Not surfaced. A blocked or exhausted audio context is a detail of the
      guest's browser, and the invitation behind this cover opens either way.
    */
  }
}
