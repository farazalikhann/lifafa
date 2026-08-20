/**
 * WCAG relative luminance and contrast, plus the one thing the card actually
 * needs from them: how much decoration may sit between text and its background
 * before the text stops being readable.
 *
 * Pure functions over hex strings, no JSX and no imports, so both the card tree
 * and any build-time check can use them.
 */

/** Parses "#RRGGBB" into 0-255 channels. Malformed input reads as black. */
function channels(hex: string): readonly [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());

  if (match === null) {
    return [0, 0, 0];
  }

  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

/** sRGB channel to linear light, per WCAG 2.x. */
function linearise(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : Math.pow((scaled + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex);
  return (
    0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b)
  );
}

/** WCAG contrast ratio, 1 to 21. Order of the arguments does not matter. */
export function contrastRatio(a: string, b: string): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The colour an opaque background becomes once a translucent overlay is laid
 * over it. Compositing happens in sRGB, which is what a browser does, so the
 * result is the colour a glyph behind that overlay is really read against.
 */
function composite(overlay: string, background: string, alpha: number): string {
  const [fr, fg, fb] = channels(overlay);
  const [br, bg, bb] = channels(background);

  const mix = (front: number, back: number): number =>
    Math.round(front * alpha + back * (1 - alpha));

  return [mix(fr, br), mix(fg, bg), mix(fb, bb)]
    .reduce(
      (hex, part) => hex + part.toString(16).padStart(2, "0"),
      "#",
    )
    .toUpperCase();
}

/** WCAG's threshold for text below 18.66px, which is all of the card's body copy. */
const SMALL_TEXT_RATIO = 4.5;

/**
 * Steps per unit alpha. 200 gives 0.5% resolution — finer than the eye can
 * separate, coarse enough that the scan stays cheap.
 *
 * Counted in whole steps rather than accumulated as a float, so the result is
 * an exact multiple of 1/200 and lands in the markup as "0.15" rather than
 * "0.15000000000000005".
 */
const ALPHA_STEPS = 200;

/**
 * The largest overlay alpha that still leaves `text` readable on `background`.
 *
 * The decor layer sits behind the card's words, so wherever a motif crosses a
 * glyph it *is* that glyph's background. This answers how strong a motif may
 * get before that stops being true, for one specific set of colours — which
 * matters because the answer is not a constant: a bright gold on near-black
 * washes out much faster than a muted green on near-black, and a host who
 * overrides the accent moves the answer again.
 *
 * Scans upward from zero and stops at the first failing step rather than
 * bisecting, so the result is safe even where contrast is not monotonic in
 * alpha — which happens whenever the accent's own luminance falls between the
 * background's and the text's.
 */
export function maxOverlayAlpha(
  overlay: string,
  background: string,
  text: string,
  ceiling: number,
  minRatio: number = SMALL_TEXT_RATIO,
): number {
  if (contrastRatio(text, background) < minRatio) {
    /* Already failing with no decoration at all — do not make it worse. */
    return 0;
  }

  let safe = 0;

  for (let step = 1; step <= Math.floor(ceiling * ALPHA_STEPS); step += 1) {
    const alpha = step / ALPHA_STEPS;

    if (contrastRatio(text, composite(overlay, background, alpha)) < minRatio) {
      break;
    }

    safe = alpha;
  }

  return safe;
}
