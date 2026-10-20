/**
 * The landing page's few shared looks, as full class strings so Tailwind sees
 * them at build time. Every button is at least 48px tall for a thumb.
 */

/** The page's main action: the marigold pill. */
export const PRIMARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--lifafa-marigold)] px-7 text-base font-semibold whitespace-nowrap text-[var(--lifafa-ink)] shadow-[0_10px_30px_-12px_rgba(232,163,61,0.55)] transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/** A second way on, beside the main one: outlined, so the two never compete. */
export const SECONDARY_BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-[var(--lifafa-marigold)]/60 px-7 text-base font-semibold whitespace-nowrap text-[var(--lifafa-marigold)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] hover:bg-[var(--lifafa-marigold)]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]";

/** A small link-like button inside a card. */
export const CARD_LINK =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--lifafa-hairline)] px-4 text-sm font-semibold whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

/** A section's small label over its heading. */
export const EYEBROW =
  "text-[0.6875rem] font-semibold tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase";

/** A section's heading. */
export const SECTION_HEADING =
  "font-[family-name:var(--font-display)] text-[clamp(1.875rem,7.5vw,3rem)] leading-[1.12] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)]";

/** The line under a section's heading. */
export const SECTION_LEAD =
  "text-base leading-relaxed text-balance text-[var(--lifafa-muted)] sm:text-lg";
