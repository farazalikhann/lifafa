/**
 * The one thing every cover visual needs the same way: a CSS transition sized
 * as a fraction of the shell's own timer.
 *
 * `--cover-ms` is set once on each visual's root from `option.durationMs`, the
 * same number CoverShell counts down before it unmounts the cover. Writing
 * every duration and delay as a share of that variable is what keeps a drawing
 * from finishing early and leaving a still frame on screen, or finishing late
 * and being cut off mid-motion. Shares within one cover should reach exactly 1.
 *
 * Deliberately the only thing shared between the covers. Four of them is still
 * too few to know what a "cover visual" abstraction should look like, and each
 * file is easier to read as its own drawing.
 */

/** One `transition` entry: property, duration, easing, delay. */
export function stage(
  property: string,
  share: number,
  start: number,
  easing: string,
): string {
  return `${property} calc(var(--cover-ms)*${share}) ${easing} calc(var(--cover-ms)*${start})`;
}
