/**
 * The bar's two buttons, as the wizard draws them (Wizard.tsx) and as the
 * server draws them before it has run (GalleryFirstScreen.tsx). A plain
 * module, so a Server Component can read the strings themselves.
 */
export const PRIMARY_BUTTON =
  "min-h-12 rounded-full bg-[var(--lifafa-marigold)] px-6 text-[0.9375rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px disabled:opacity-60";
/**
 * Said beside Next while no design has been chosen, in the place of Preview:
 * Next is off until one is, and there is nothing of the card's own to preview.
 */
export const CHOOSE_DESIGN_HINT = "Choose a design to continue";
export const CHOOSE_DESIGN_HINT_ID = "wizard-choose-design";
export const HINT_TEXT =
  "min-w-0 text-[0.8125rem] leading-snug text-[var(--lifafa-muted)]";
export const QUIET_BUTTON =
  "min-h-12 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.9375rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
