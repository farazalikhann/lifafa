import Link from "next/link";

/** Change the support address here and every mention follows. */
export const SUPPORT_EMAIL = "hello@getlifafa.co.in";

/**
 * Pinned to India rather than read off the runtime's clock. `getFullYear()`
 * resolves in whatever zone the process sits in, so a UTC server and an IST
 * browser disagree for the five and a half hours around New Year. Formatting
 * against a fixed zone makes the value deterministic.
 */
function currentYearInIndia(): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}

interface FooterLink {
  href: string;
  label: string;
  /**
   * False for a page that does not exist yet. Next prefetches every link that
   * scrolls into view, and prefetching a route that is not there only fills
   * the network panel with 404s.
   */
  prefetch: boolean;
}

const FOOTER_LINKS: readonly FooterLink[] = [
  { href: "/login", label: "Sign in", prefetch: true },
  { href: "/create", label: "Create an invitation", prefetch: true },
  /*
    Linked before the pages are written, so the footer does not change shape
    the day they are. Until then both land on the not-found page.
  */
  { href: "/terms", label: "Terms", prefetch: false },
  { href: "/refunds", label: "Refunds", prefetch: false },
];

/** Shared by every link in the footer: quiet text, a 44px tap target, an underline on hover. */
const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded text-sm underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

/**
 * The foot of the landing page.
 *
 * Three short columns from `sm` up — who this is, where to go, how to ask —
 * and one centred column below that. Deliberately the quietest thing on the
 * page: small type, muted colour, no buttons. The closing call to action sits
 * directly above it, and a footer that competed for the tap would be taking it
 * from there.
 */
export default function HelpFooter() {
  const year = currentYearInIndia();

  return (
    <footer className="border-t border-[var(--lifafa-hairline)] px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-5xl gap-12 text-center sm:grid-cols-3 sm:gap-8 sm:text-left">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)]">
            Lifafa
          </p>
          <p className="mx-auto mt-3 max-w-[30ch] text-sm leading-relaxed text-[var(--lifafa-muted)] sm:mx-0">
            Digital invitations with a live guest count, for every Indian
            celebration.
          </p>
        </div>

        <nav aria-label="Footer">
          {/*
            Pulled up by the half of a 44px tap target that sits above its
            text, so the first link lines up with the tops of the other two
            columns rather than a line below them.
          */}
          <ul className="flex flex-col items-center sm:-mt-3 sm:items-start">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={link.prefetch ? undefined : false}
                  className={`${LINK_CLASS} text-[var(--lifafa-cream)]`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col items-center sm:items-start">
          <p className="text-sm text-[var(--lifafa-cream)]">
            Questions before your event?
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={`${LINK_CLASS} text-[var(--lifafa-marigold)]`}
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>

      <p className="mt-16 text-center text-xs tracking-[0.14em] text-[var(--lifafa-muted)] uppercase">
        Lifafa {year}
      </p>
    </footer>
  );
}
