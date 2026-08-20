/** Change the support address here and every mention follows. */
export const SUPPORT_EMAIL = "hello@getlifafa.co.in";

export default function HelpFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col items-center gap-4 border-t border-[var(--lifafa-hairline)] px-6 py-20 text-center sm:py-24">
      <p className="text-base text-[var(--lifafa-cream)] sm:text-lg">
        Questions before your event?
      </p>

      <a
        href={`mailto:${SUPPORT_EMAIL}`}
        className="text-base text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-[var(--lifafa-marigold)] focus-visible:decoration-[var(--lifafa-marigold)] focus-visible:outline-none sm:text-lg"
      >
        {SUPPORT_EMAIL}
      </a>

      <p className="mt-6 text-xs tracking-[0.14em] text-[var(--lifafa-muted)] uppercase">
        Lifafa {year}
      </p>
    </footer>
  );
}
