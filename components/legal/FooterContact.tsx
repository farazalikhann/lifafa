import type { ReactElement } from "react";
import InstagramIcon from "@/components/brand/InstagramIcon";
import { HELP_EMAIL, HELP_MAILTO, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

const LINK =
  "rounded underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

/**
 * Lifafa on Instagram, and where to write for help. In every host page's
 * footer (LegalFooter) and in the landing page's own (HelpFooter).
 *
 * `layout`: "row" lays the two side by side where there is room, for the
 * strip under every page; "column" stacks them, for a column of the landing
 * footer. Both centre on a phone.
 */
export default function FooterContact({
  layout = "row",
}: {
  layout?: "row" | "column";
}): ReactElement {
  return (
    <div
      className={
        layout === "row"
          ? "flex flex-col items-center gap-x-6 sm:flex-row sm:flex-wrap sm:items-center"
          : "flex flex-col items-center gap-1 sm:items-start"
      }
    >
      {/* The icon is emerald and warms to gold on hover; the handle stays ink. */}
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Lifafa on Instagram, ${INSTAGRAM_HANDLE} (opens in a new tab)`}
        className={`group inline-flex min-h-11 items-center gap-2 text-sm text-[var(--lifafa-cream)] ${LINK}`}
      >
        <InstagramIcon className="text-[var(--lifafa-marigold)] transition-colors duration-200 group-hover:text-[var(--paper-gold)]" />
        {INSTAGRAM_HANDLE}
      </a>

      <p className="py-2 text-center text-sm text-[var(--lifafa-muted)] sm:text-left">
        Need help? Write to us at{" "}
        <a
          href={HELP_MAILTO}
          aria-label={`Email Lifafa for help at ${HELP_EMAIL}`}
          className={`font-medium text-[var(--lifafa-marigold)] ${LINK}`}
        >
          {HELP_EMAIL}
        </a>
      </p>
    </div>
  );
}
