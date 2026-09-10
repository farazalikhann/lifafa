/**
 * The sound a cover makes when a guest opens it.
 *
 * SYNTHESISED, NOT A FILE. There is no mp3 in this repo and there deliberately
 * is not going to be one: a cover sound that has to be fetched is a cover sound
 * that arrives after the animation on a slow connection, plays over a card the
 * guest is already reading, and costs every guest a download whether their
 * phone is on silent or not. Four oscillators and a burst of noise cost
 * nothing, start on the same frame as the tap, and cannot fail to load.
 *
 * IT ONLY EVER FOLLOWS A TAP. Nothing here runs on page load, on hydration, or
 * when a cover is skipped — see CoverShell, which calls this from the one
 * handler a guest's own press reaches. That is also what makes it work at all:
 * every mobile browser refuses audio that no gesture asked for, and an
 * AudioContext built anywhere else would be born suspended.
 *
 * IT IS QUIET AND IT IS SHORT. A guest opens invitations in offices, on trains,
 * next to sleeping children. MusicToggle takes the same position about the
 * card's background music and takes it further — that never starts on its own
 * at all. The difference is that this is the sound of the thing they just
 * pressed, it is under a second, and it is over before they have read a word.
 *
 * NOTHING IT DOES IS ALLOWED TO MATTER. Every path out of here is a return: a
 * browser with no Web Audio, a context that will not start, an autoplay policy
 * that says no. A guest whose phone stays silent has still opened their
 * invitation, and an exception thrown on the way into a card would be a far
 * worse trade than a missing flourish.
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

/** How long the context is kept alive. Longer than the longest tail below. */
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
 * envelope settles. The timings shadow EnvelopeSealCover's own stages, so what
 * a guest hears lines up with what they are watching.
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
    start: now + 0.09,
    duration: 0.34,
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
}

/** Cloth pulled aside: one long low rustle, with the heavier drag under it. */
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

    VOICES[sound](context, master, context.currentTime);

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
