/**
 * The sound a cover makes when a guest opens it.
 *
 * SYNTHESISED, EXCEPT THE CURTAIN. The seal, the fold and the chime are
 * oscillators and bursts of noise built on the spot: they cost nothing, start
 * on the same frame as the tap, and cannot fail to load. The curtain plays a
 * recording, public/sounds/curtain.mp3, and a recording has none of that for
 * free. A sound that has to be fetched is a sound that arrives after the
 * animation on a slow connection and plays over a card the guest is already
 * reading. So the file is fetched while the cover is still closed —
 * preloadCoverSound, called from CoverShell — and at the tap it is either
 * already in memory or not used at all: the synthesised curtain plays in its
 * place. A slow or missing file changes what a guest hears, never when.
 *
 * IT ONLY EVER FOLLOWS A TAP. Nothing here plays on page load, on hydration,
 * or when a cover is skipped — see CoverShell, which calls playCoverSound from
 * the one handler a guest's own press reaches. preloadCoverSound runs before
 * that, but it only fetches bytes: no context, no decoding, no sound. The tap
 * is also what makes the audio work at all: every mobile browser refuses audio
 * that no gesture asked for, and an AudioContext built anywhere else would be
 * born suspended.
 *
 * IT IS QUIET AND IT IS SHORT. A guest opens invitations in offices, on trains,
 * next to sleeping children. MusicToggle takes the same position about the
 * card's background music and takes it further — that never starts on its own
 * at all. The difference is that this is the sound of the thing they just
 * pressed, it lasts no longer than the cover does, and it is over before they
 * have read a word. The recording goes through the same master gain as the
 * synthesised voices, and is cut where its cover ends.
 *
 * NOTHING IT DOES IS ALLOWED TO MATTER. Every path out of here is a return: a
 * browser with no Web Audio, a context that will not start, an autoplay policy
 * that says no, a recording that will not download or decode. A guest whose
 * phone stays silent has still opened their invitation, and an exception
 * thrown on the way into a card would be a far worse trade than a missing
 * flourish.
 */

/** Which sound a cover makes. One per animation that has anything to say. */
export type CoverSoundId = "seal" | "curtain" | "fold" | "chime";

/**
 * The ceiling on everything below, applied once at the master gain.
 *
 * Low enough to sit under a phone's notification volume: this is a flourish
 * under a fingertip, not an alert. Every voice further down is mixed as a
 * fraction of it, so the whole feature has exactly one loudness to tune.
 */
const MASTER_GAIN = 0.22;

/**
 * How long the context is kept alive. Longer than the longest tail below, the
 * recording's included, with room for decoding it first.
 */
const CONTEXT_LIFETIME_MS = 2200;

type AudioContextConstructor = new () => AudioContext;

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

/**
 * White noise, which is the raw material for every non-tonal sound here — paper
 * tearing, cloth moving, a crease being pressed flat.
 *
 * Math.random is safe in this one place. Nothing about this buffer is rendered,
 * hydrated or compared against server output; it exists for a few hundred
 * milliseconds inside a click handler and is then thrown away.
 */
function noiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const frames = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, frames, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let frame = 0; frame < frames; frame += 1) {
    data[frame] = Math.random() * 2 - 1;
  }

  return buffer;
}

/**
 * One burst of filtered noise: a tear, a rustle, a crease.
 *
 * The filter is what turns undifferentiated hiss into a material. A bandpass
 * high up is paper; the same noise low and wide is cloth. `sweepTo` slides the
 * filter across the burst, which is what stops it sounding like a switch being
 * flipped on a hiss generator.
 *
 * Gains are ramped to a small positive value rather than to zero, because
 * exponentialRampToValueAtTime cannot reach or start from zero — a linear ramp
 * out of silence audibly clicks, and this is the standard way around it.
 */
function burst(
  context: AudioContext,
  master: GainNode,
  options: {
    start: number;
    duration: number;
    frequency: number;
    sweepTo?: number;
    q: number;
    gain: number;
    /** How much of the burst is spent rising. The rest is the tail. */
    attack?: number;
  },
): void {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context, options.duration);

  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = options.q;
  filter.frequency.setValueAtTime(options.frequency, options.start);

  if (options.sweepTo !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(
      options.sweepTo,
      options.start + options.duration,
    );
  }

  const gain = context.createGain();
  const attack = options.attack ?? 0.02;

  gain.gain.setValueAtTime(0.0001, options.start);
  gain.gain.exponentialRampToValueAtTime(
    options.gain,
    options.start + attack,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    options.start + options.duration,
  );

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  source.start(options.start);
  source.stop(options.start + options.duration);
}

/** One tonal voice: a struck partial, or the body of a soft thud. */
function tone(
  context: AudioContext,
  master: GainNode,
  options: {
    start: number;
    duration: number;
    frequency: number;
    /** Where the pitch ends up. A fall is what makes a thud land. */
    glideTo?: number;
    gain: number;
    type?: OscillatorType;
  },
): void {
  const oscillator = context.createOscillator();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(options.frequency, options.start);

  if (options.glideTo !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      options.glideTo,
      options.start + options.duration,
    );
  }

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, options.start);
  gain.gain.exponentialRampToValueAtTime(options.gain, options.start + 0.012);
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    options.start + options.duration,
  );

  oscillator.connect(gain);
  gain.connect(master);

  oscillator.start(options.start);
  oscillator.stop(options.start + options.duration);
}

/**
 * A wax seal breaking and a flap falling open.
 *
 * Two events, and the gap between them is the point: the crack of the seal
 * comes first, then the longer drag of the paper, then a soft body as the
 * envelope settles, and last the lighter slide of the letter coming out. The
 * timings shadow EnvelopeSealCover's own stages, so what a guest hears lines
 * up with what they are watching.
 */
function playSeal(context: AudioContext, master: GainNode, now: number): void {
  /* The seal itself: short, dry, high. */
  burst(context, master, {
    start: now,
    duration: 0.1,
    frequency: 2400,
    sweepTo: 1400,
    q: 1.1,
    gain: 0.5,
    attack: 0.006,
  });

  /* The flap dragging over the pocket. */
  burst(context, master, {
    start: now + 0.22,
    duration: 0.55,
    frequency: 1500,
    sweepTo: 700,
    q: 0.7,
    gain: 0.34,
    attack: 0.05,
  });

  /* The envelope's own weight, under both. */
  tone(context, master, {
    start: now + 0.1,
    duration: 0.26,
    frequency: 150,
    glideTo: 78,
    gain: 0.3,
  });

  /* The letter sliding up out of the pocket: lighter, and higher. */
  burst(context, master, {
    start: now + 0.88,
    duration: 0.5,
    frequency: 2600,
    sweepTo: 1800,
    q: 0.6,
    gain: 0.16,
    attack: 0.12,
  });
}

/**
 * Cloth pulled aside: one long low rustle, with the heavier drag under it.
 *
 * The curtain's fallback now, heard only when its recording has not arrived by
 * the tap or will not decode — see RECORDINGS.
 */
function playCurtain(context: AudioContext, master: GainNode, now: number): void {
  burst(context, master, {
    start: now,
    duration: 0.62,
    frequency: 900,
    sweepTo: 320,
    q: 0.55,
    gain: 0.42,
    attack: 0.16,
  });

  burst(context, master, {
    start: now + 0.04,
    duration: 0.5,
    frequency: 260,
    sweepTo: 140,
    q: 0.8,
    gain: 0.26,
    attack: 0.2,
  });
}

/** Card stock opening out: two creases, the second lighter than the first. */
function playFold(context: AudioContext, master: GainNode, now: number): void {
  burst(context, master, {
    start: now,
    duration: 0.2,
    frequency: 1900,
    sweepTo: 1100,
    q: 0.9,
    gain: 0.4,
    attack: 0.015,
  });

  burst(context, master, {
    start: now + 0.26,
    duration: 0.26,
    frequency: 1500,
    sweepTo: 820,
    q: 0.8,
    gain: 0.3,
    attack: 0.03,
  });

  tone(context, master, {
    start: now + 0.3,
    duration: 0.22,
    frequency: 180,
    glideTo: 110,
    gain: 0.18,
  });
}

/**
 * Petals lifting: a small struck bell.
 *
 * Three partials rather than one sine, because a single tone reads as a beep
 * and a bell is what its overtones do. They are tuned a little sharp of the
 * harmonic series and decay at different rates, which is what real metal does.
 */
function playChime(context: AudioContext, master: GainNode, now: number): void {
  tone(context, master, { start: now, duration: 1.1, frequency: 932, gain: 0.34 });
  tone(context, master, { start: now, duration: 0.72, frequency: 1400, gain: 0.2 });
  tone(context, master, { start: now, duration: 0.46, frequency: 1868, gain: 0.11 });

  /* The strike itself, so the bell is hit rather than faded in. */
  burst(context, master, {
    start: now,
    duration: 0.07,
    frequency: 3200,
    q: 1.4,
    gain: 0.22,
    attack: 0.004,
  });
}

const VOICES: Record<
  CoverSoundId,
  (context: AudioContext, master: GainNode, now: number) => void
> = {
  seal: playSeal,
  curtain: playCurtain,
  fold: playFold,
  chime: playChime,
};

/** A recorded sound, and where it sits in the mix. */
interface Recording {
  /** Served from public/, so the path is also the URL. */
  url: string;
  /** A fraction of MASTER_GAIN, like every synthesised voice above. */
  gain: number;
  /**
   * Where the recording is cut, in seconds from its start.
   *
   * A file can run on in room tone well past its cover, and a sound still
   * playing over the card is the thing this whole file is built to avoid.
   */
  end: number;
  /** How long the fade into `end` takes. A hard stop, even on room tone, clicks. */
  fade: number;
}

/**
 * The sounds that play a file. Each still has its entry in VOICES, which is
 * what plays when the file cannot.
 *
 * The curtain's numbers were measured, not guessed. The file's two hits land
 * at about 0.5s and 1.5s and its cover runs for 1.6s, so the cut comes just
 * after the second one; what follows it is a second of room tone. At 0.7 its
 * loudest moment sits level with the synthesised curtain's, so falling back
 * changes what the cover sounds like, not how loud it is.
 */
const RECORDINGS: Partial<Record<CoverSoundId, Recording>> = {
  curtain: { url: "/sounds/curtain.mp3", gain: 0.7, end: 1.75, fade: 0.2 },
};

/**
 * Recordings fetched so far, as bytes.
 *
 * Kept undecoded because decoding needs an AudioContext, and one built before
 * the tap would be born suspended — see the header. Module level, so a cover
 * that mounts again (a host replaying the preview) does not fetch again.
 */
const fetchedRecordings = new Map<CoverSoundId, ArrayBuffer>();

/** Sounds whose fetch has started, so a cover mounted twice asks once. */
const requestedRecordings = new Set<CoverSoundId>();

/**
 * Starts fetching a cover's recording, if it has one, and never throws.
 *
 * Called while the cover is still closed, so the file has the time a guest
 * spends reading the names to arrive in. A sound with no recording, or one
 * already asked for, returns at once.
 */
export function preloadCoverSound(sound: CoverSoundId | null | undefined): void {
  if (sound === null || sound === undefined) {
    return;
  }

  const recording = RECORDINGS[sound];

  if (recording === undefined || requestedRecordings.has(sound)) {
    return;
  }

  requestedRecordings.add(sound);

  void fetch(recording.url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`${recording.url} answered ${response.status}`);
      }

      return response.arrayBuffer();
    })
    .then((bytes) => {
      fetchedRecordings.set(sound, bytes);
    })
    .catch((cause: unknown) => {
      /*
        Forgotten rather than remembered as failed, so the next cover to mount
        tries again. This one opens to the synthesised voice.
      */
      requestedRecordings.delete(sound);
      console.warn("[cover] could not fetch the opening sound:", cause);
    });
}

/**
 * decodeAudioData, in the one form every browser takes.
 *
 * Safari before 14.1 — the one still behind webkitAudioContext — has only the
 * callback signature and returns nothing. Everything newer takes the callbacks
 * too and also returns a promise, which rejects alongside the error callback;
 * it is quietened so a failure is reported once, not twice.
 */
function decode(context: AudioContext, bytes: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const pending = context.decodeAudioData(bytes, resolve, reject) as
      | Promise<AudioBuffer>
      | undefined;

    void pending?.catch(() => undefined);
  });
}

/**
 * Plays a fetched recording through the master, faded out at its `end`.
 *
 * Through Web Audio rather than an <audio> element, because on an iPhone an
 * element ignores the volume a page sets and plays through the silent switch.
 * Web Audio respects both, which the rest of this file already relies on.
 *
 * Decoded here, inside the tap's own context. A copy is decoded, not the bytes
 * themselves: decoding detaches the buffer it is handed, and the next open
 * needs them again. It takes a few milliseconds, so the recording starts that
 * much after the tap; if it fails, `fallback` plays the synthesised voice
 * instead, just as late.
 */
function playRecording(
  context: AudioContext,
  master: GainNode,
  recording: Recording,
  bytes: ArrayBuffer,
  fallback: () => void,
): void {
  decode(context, bytes.slice(0))
    .then((buffer) => {
      const now = context.currentTime;

      const source = context.createBufferSource();
      source.buffer = buffer;

      const gain = context.createGain();
      gain.gain.setValueAtTime(recording.gain, now);
      gain.gain.setValueAtTime(
        recording.gain,
        now + recording.end - recording.fade,
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, now + recording.end);

      source.connect(gain);
      gain.connect(master);

      source.start(now);
      source.stop(now + recording.end);
    }, fallback)
    .catch((cause: unknown) => {
      console.warn("[cover] could not play the opening sound:", cause);
    });
}

/**
 * Plays one cover's sound, and never throws.
 *
 * A fresh context per open, closed on a timer afterwards. Holding one for the
 * life of the page would keep an audio device awake for a sound that plays once
 * — and a guest who opens their invitation, reads it and leaves has no more use
 * for it. The close is scheduled rather than chained to an ended event because
 * several voices end at different times and the last of them is not worth
 * tracking.
 */
export function playCoverSound(sound: CoverSoundId | null | undefined): void {
  if (sound === null || sound === undefined) {
    return;
  }

  const Constructor = audioContextConstructor();

  if (Constructor === null) {
    return;
  }

  try {
    const context = new Constructor();

    const master = context.createGain();
    master.gain.value = MASTER_GAIN;
    master.connect(context.destination);

    /*
      Suspended is the normal state on iOS even inside a gesture, and resume()
      is what a gesture buys. It resolves after the sound has been scheduled,
      which is fine: the schedule is relative to currentTime, which does not
      advance while the context is suspended.
    */
    if (context.state === "suspended") {
      void context.resume().catch(() => undefined);
    }

    const synthesise = (): void => {
      VOICES[sound](context, master, context.currentTime);
    };

    const recording = RECORDINGS[sound];
    const bytes = fetchedRecordings.get(sound);

    /*
      The recording only if it is already here. One still in flight is left to
      land unheard: waiting for it would put the sound after the animation,
      which is the one thing a fetched sound must never do.
    */
    if (recording !== undefined && bytes !== undefined) {
      playRecording(context, master, recording, bytes, synthesise);
    } else {
      synthesise();
    }

    window.setTimeout(() => {
      void context.close().catch(() => undefined);
    }, CONTEXT_LIFETIME_MS);
  } catch (cause: unknown) {
    /*
      Logged, not surfaced. A blocked or exhausted audio context is a detail of
      the guest's browser, and the invitation behind this cover opens either way.
    */
    console.warn("[cover] could not play the opening sound:", cause);
  }
}
