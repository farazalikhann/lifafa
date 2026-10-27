/**
 * The landing page's shared looks, as full class strings so Tailwind sees
 * them at build time. The values are the tokens on `.lifafa-paper` in
 * globals.css; the roles are in DESIGN.md. Every button is at least 48px tall.
 */

/** Side padding for a section: clear of the pattern strips at every width. */
export const SECTION_X = "px-5 sm:px-14 lg:px-24";

/** Vertical rhythm for a section. */
export const SECTION_Y = "py-[4.5rem] lg:py-28";

/** The one primary action: an emerald pill with ivory text. */
export const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--paper-emerald)] px-7 text-base font-semibold whitespace-nowrap text-[var(--paper-washi)] transition-[transform,background-color] duration-200 ease-out hover:-translate-y-0.5 active:bg-[var(--paper-emerald-press)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--paper-emerald)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** The second way on: an emerald outline, so the two never compete. */
export const SECONDARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-[var(--paper-emerald)] px-7 text-base font-semibold whitespace-nowrap text-[var(--paper-emerald)] transition-colors duration-200 hover:bg-[var(--paper-emerald)]/[0.06] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--paper-emerald)]";

/** The primary button inverted, for the emerald closing band. */
export const ON_EMERALD_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--paper-washi)] px-7 text-base font-semibold whitespace-nowrap text-[var(--paper-emerald)] transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--paper-gold-soft)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** An underlined text link in emerald. */
export const TEXT_LINK =
  "inline-flex min-h-11 items-center rounded px-1 font-semibold text-[var(--paper-emerald)] underline decoration-[var(--paper-gold)] decoration-1 underline-offset-[5px] transition-colors duration-200 hover:decoration-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)]";

/** A section's small label over its heading. */
export const EYEBROW =
  "text-xs font-bold tracking-[0.22em] text-[var(--paper-gold-ink)] uppercase";

/** A section's heading. */
export const SECTION_HEADING =
  "font-[family-name:var(--paper-display)] text-[clamp(1.875rem,6.5vw,3rem)] leading-[1.12] font-semibold tracking-[-0.02em] text-balance text-[var(--paper-ink)]";

/** The line under a section's heading. */
export const SECTION_LEAD =
  "text-base leading-[1.6] text-pretty text-[var(--paper-muted)] sm:text-lg";

/** A card: paper on washi with a gold hairline, no shadow. */
export const CARD =
  "rounded-3xl border border-[var(--paper-hairline)] bg-[var(--paper-card)]";

/** A small outlined link inside a card. */
export const CARD_LINK =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--paper-hairline)] px-4 text-sm font-semibold whitespace-nowrap text-[var(--paper-ink)] transition-colors duration-150 hover:border-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)]";
