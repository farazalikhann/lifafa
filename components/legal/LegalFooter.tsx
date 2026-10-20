import type { ReactElement } from "react";
import Link from "next/link";
import { POLICY_LINKS, currentYearInIndia } from "@/lib/legal";

/**
 * The five policy pages and the copyright line, the same on every host page:
 * the landing page (inside its own footer), /create, /login, the dashboard
 * and the policy pages themselves.
 *
 * Quiet on purpose: small muted type and no buttons, so it never competes
 * with the page's own way forward. Each link is a 44px tap target.
 */
export default function LegalFooter({
  className = "",
  as: Element = "footer",
}: {
  /** Extra classes, such as bottom padding to clear a bar pinned over the page. */
  className?: string;
  /**
   * "div" where the page already has a footer of its own (the landing page),
   * so it does not carry two contentinfo landmarks.
   */
  as?: "footer" | "div";
}): ReactElement {
  return (
    <Element
      className={`border-t border-[var(--lifafa-hairline)] px-5 pt-6 pb-8 sm:px-8 ${className}`}
    >
      <nav aria-label="Policies" className="mx-auto max-w-5xl">
        <ul className="flex flex-wrap justify-center gap-x-5 sm:justify-start">
          {POLICY_LINKS.map((link) => (
            <li key={link.href}>
              {/*
                Not prefetched: this footer sits on every host page, and five
                policy pages fetched whenever it scrolls into view is data a
                phone on a slow connection pays for and almost never uses.
              */}
              <Link
                href={link.href}
                prefetch={false}
                className="inline-flex min-h-11 items-center rounded text-[0.8125rem] text-[var(--lifafa-muted)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:text-[var(--lifafa-cream)] hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-xs text-[var(--lifafa-muted)] sm:text-left">
          © {currentYearInIndia()} Lifafa
        </p>
      </nav>
    </Element>
  );
}
