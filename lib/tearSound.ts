/**
 * The sound of the date's paper strip being torn (components/card/TearReveal.tsx).
 *
 * MADE ON THE SPOT, NOT FETCHED: a third of a second of noise, shaped into a
 * rip. Nothing to download, so nothing that can arrive late. The noise is
 * broken into grains of uneven loudness, which is what makes a tear crackle
 * where plain noise would hiss, and passed through a band that climbs as the
 * paper parts.
 *
 * IT ONLY EVER FOLLOWS THE GUEST'S OWN SWIPE OR TAP, and nothing it does is
 * allowed to matter: a browser with no Web Audio, a context that will not
 * start, an autoplay policy that says no. Each is a return, and the paper
 * tears in silence. Through Web Audio and not an <audio> element, so a phone
 * on silent stays silent; see lib/coverSound.ts.
 */

/** How loud, of full scale. The same as a cover's sound. */
const VOLUME = 0.6;

const DURATION_S = 0.36;

let context: AudioContext | null = null;

export function playTearSound(): void {
  try {
    const Constructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (Constructor === undefined) {
      return;
    }

    context ??= new Constructor();
    const audio = context;

    if (audio.state === "suspended") {
      void audio.resume().catch(() => undefined);
    }

    const length = Math.floor(audio.sampleRate * DURATION_S);
    const buffer = audio.createBuffer(1, length, audio.sampleRate);
    const samples = buffer.getChannelData(0);

    /* Grains of 2 to 9ms, each at its own loudness, under one rise and fall. */
    let grainEnd = 0;
    let grain = 0;

    for (let index = 0; index < length; index += 1) {
      if (index >= grainEnd) {
        grainEnd = index + Math.floor(audio.sampleRate * (0.002 + Math.random() * 0.007));
        grain = Math.random() ** 2;
      }

      const t = index / length;
      const envelope = Math.min(1, t / 0.04) * (1 - t) ** 1.6;

      samples[index] = (Math.random() * 2 - 1) * (0.25 + 0.75 * grain) * envelope;
    }

    const source = audio.createBufferSource();
    source.buffer = buffer;

    const band = audio.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 0.7;
    band.frequency.setValueAtTime(1700, audio.currentTime);
    band.frequency.exponentialRampToValueAtTime(4600, audio.currentTime + DURATION_S);

    const high = audio.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = 700;

    const gain = audio.createGain();
    gain.gain.value = VOLUME;

    source.connect(band).connect(high).connect(gain).connect(audio.destination);
    source.start();
  } catch {
    /* No sound, and the paper tears all the same. */
  }
}
