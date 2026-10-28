import Link from "next/link";
import Logo from "@/components/brand/Logo";
import LegalFooter from "@/components/legal/LegalFooter";
import { SUPPORT_EMAIL } from "@/lib/legal";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/** Where a visitor goes next. The five policy pages are in the strip below, shared with every host page. */
const FOOTER_LINKS: readonly { href: string; label: string }[] = [
  { href: "/login", label: "Sign in" },
  { href: NEW_CARD_HREF, label: "Create your card" },
  { href: "/contact", label: "Contact us" },
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
 * from there. Under it, the policy links and the copyright line every host
 * page carries (components/legal/LegalFooter.tsx).
 */
export default function HelpFooter() {
  return (
    <>
      <footer className="border-t border-[var(--lifafa-hairline)] px-6 pt-20 pb-14 sm:pt-24 sm:pb-16">
        <div className="mx-auto grid max-w-5xl gap-12 text-center sm:grid-cols-3 sm:gap-8 sm:text-left">
          <div>
            <Logo className="mx-auto h-8 sm:mx-0 lg:h-10" />
            <p className="mx-auto mt-3 max-w-[30ch] text-sm leading-relaxed text-[var(--lifafa-muted)] sm:mx-0">
              Beautiful digital invitations that tell you who is coming, for
              every Indian celebration.
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
      </footer>
      <LegalFooter as="div" />
    </>
  );
}
