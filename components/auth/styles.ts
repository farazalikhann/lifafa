/** The sign-in page's buttons and field, shared by SignInForm and EmailCodeForm. */

export const PRIMARY_SIGNIN_BUTTON =
  "flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[var(--lifafa-marigold)] px-5 text-base font-semibold text-[var(--lifafa-ink)] shadow-sm transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:-translate-y-px disabled:cursor-wait disabled:opacity-70";

export const SECONDARY_SIGNIN_BUTTON =
  "flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-5 text-[0.9375rem] font-semibold text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-wait disabled:opacity-70";

export const SIGNIN_FIELD =
  "min-h-12 w-full rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 text-base text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)] focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none aria-invalid:border-[var(--lifafa-rose)]";

export const SIGNIN_TEXT_BUTTON =
  "inline-flex min-h-11 items-center rounded px-1 text-sm font-medium text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:text-[var(--lifafa-muted)] disabled:no-underline";
