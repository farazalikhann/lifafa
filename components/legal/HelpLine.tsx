import type { ReactElement } from "react";
import WhatsAppLink from "@/components/legal/WhatsAppLink";
import { HELP_EMAIL, HELP_MAILTO } from "@/lib/site";

const LINK =
  "rounded font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

/**
 * "Questions? help@getlifafa.co.in or Chat on WhatsApp": one small line where
 * a host is likely to get stuck, the dashboard and the checkout. Light theme
 * only (the host's pages), small muted type, and the address and the chat are
 * the links.
 */
export default function HelpLine({
  className = "",
}: {
  className?: string;
}): ReactElement {
  return (
    <p className={`text-xs text-[var(--lifafa-muted)] ${className}`}>
      Questions?{" "}
      <a href={HELP_MAILTO} className={LINK}>
        {HELP_EMAIL}
      </a>{" "}
      or{" "}
      <WhatsAppLink className={`align-bottom ${LINK}`} />
    </p>
  );
}
