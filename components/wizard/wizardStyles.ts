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
/** The line under the gallery's heading saying what is free and when payment comes (CreateIntro's TRUST_LINE). */
export const TRUST_TEXT = "text-sm leading-relaxed font-medium text-[var(--lifafa-cream)]";
export const HINT_TEXT =
  "min-w-0 text-[0.8125rem] leading-snug text-[var(--lifafa-muted)]";
export const QUIET_BUTTON =
  "min-h-12 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.9375rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

/**
 * What saving costs, said near the top of /create and beside every save
 * button of a card not yet paid for. True to the code: a card is saved to a
 * free account for nothing, and paid for once (Rs 699 or Rs 999, by template)
 * when it is published, which is what lets guests open its link
 * (lib/db/inviteEvent.ts: an unpaid card is shown to its host only).
 */
export const FREE_SAVE_LINE = "Saving is free. You pay only when you share your invitation.";
