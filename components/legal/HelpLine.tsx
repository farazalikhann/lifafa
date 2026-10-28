import type { ReactElement } from "react";
import { HELP_EMAIL, HELP_MAILTO } from "@/lib/site";

/**
 * "Questions? help@getlifafa.co.in": one small line where a host is likely
 * to get stuck, the dashboard and the checkout. Light theme only (the host's
 * pages), small muted type, and the address is the link.
 */
export default function HelpLine({
  className = "",
}: {
  className?: string;
}): ReactElement {
  return (
    <p className={`text-xs text-[var(--lifafa-muted)] ${className}`}>
      Questions?{" "}
      <a
        href={HELP_MAILTO}
        className="rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        {HELP_EMAIL}
      </a>
    </p>
  );
}
