import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import MetaPixelNoscript from "@/components/analytics/MetaPixelNoscript";
import LegalFooter from "@/components/legal/LegalFooter";
import PaperTheme from "@/components/theme/PaperTheme";

/**
 * One policy page: the wordmark home, the title and its date, a short summary
 * in plain words, then the full text, and the shared footer.
 *
 * In the light theme (DESIGN.md), with the same bloom as the sign-in and
 * not-found pages, so reading a policy does not feel like leaving Lifafa.
 * Set for reading: a column of about 68 characters (34em, as Manrope runs
 * about half an em a letter in prose), body text at 16px on a
 * phone and 17px from 640px, a line height of 1.7, and solid ink rather than
 * a tint. On a 360px phone the column is the screen less 20px gutters.
 */
export default function LegalPage({
  title,
  updated,
  summary,
  children,
}: {
  title: string;
  /** As it is printed: "20 October 2026". */
  updated: string;
  /** The points that matter most, in plain words, each a short sentence. */
  summary: readonly ReactNode[];
  children: ReactNode;
}): ReactElement {
  return (
    <PaperTheme className="flex flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, var(--lifafa-bloom), transparent 70%)",
        }}
      />

      <header className="relative z-10 px-5 py-6 sm:px-8">
        <Link
          href="/"
          className="rounded font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Lifafa
        </Link>
      </header>

      <main className="relative z-10 flex-1 px-5 pt-4 pb-20 sm:px-8 sm:pt-10">
        <article className="mx-auto w-full max-w-[34em] min-w-0 text-base sm:text-[1.0625rem]">
          <h1 className="font-[family-name:var(--paper-display)] text-[clamp(2.125rem,7vw,3rem)] leading-[1.1] font-semibold tracking-[-0.02em] text-balance text-[var(--paper-ink)]">
            {title}
          </h1>
          <p className="mt-4 text-sm font-medium text-[var(--paper-muted)]">
            Last updated {updated}
          </p>

          <section
            aria-labelledby="legal-summary"
            className="mt-8 rounded-3xl border border-[var(--paper-hairline)] bg-[var(--paper-card)] px-5 py-6 sm:px-7"
          >
            <h2
              id="legal-summary"
              className="text-xs font-bold tracking-[0.22em] text-[var(--paper-gold-ink)] uppercase"
            >
              In short
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {summary.map((point, index) => (
                <li
                  key={index}
                  className="flex gap-3 leading-[1.7] text-[var(--paper-ink)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rotate-45 bg-[var(--paper-emerald)]"
                  />
                  <span className="min-w-0">{point}</span>
                </li>
              ))}
            </ul>
          </section>

          <div aria-hidden="true" className="mt-12 flex items-center">
            <span className="h-px flex-1 bg-[var(--paper-gold)]/45" />
            <span className="mx-3 h-2 w-2 rotate-45 border border-[var(--paper-gold)]" />
            <span className="h-px flex-1 bg-[var(--paper-gold)]/45" />
          </div>
          <div className="mt-12 flex flex-col gap-12">{children}</div>
        </article>
      </main>

      <LegalFooter />
      <MetaPixelNoscript />
    </PaperTheme>
  );
}

/** One part of a policy, under its own heading. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-[family-name:var(--paper-display)] text-[1.5rem] leading-[1.2] font-semibold tracking-[-0.01em] text-balance text-[var(--paper-ink)] sm:text-[1.75rem]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A heading inside a section. */
export function Subheading({ children }: { children: ReactNode }): ReactElement {
  return (
    <h3 className="mt-2 font-[family-name:var(--paper-display)] text-[1.1875rem] leading-snug font-semibold text-[var(--paper-ink)]">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="leading-[1.7] break-words text-[var(--paper-ink)]">
      {children}
    </p>
  );
}

export function List({ items }: { items: readonly ReactNode[] }): ReactElement {
  return (
    <ul className="flex flex-col gap-2.5 pl-1">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex gap-3 leading-[1.7] break-words text-[var(--paper-ink)]"
        >
          <span
            aria-hidden="true"
            className="mt-[0.75em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--paper-gold)]"
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A link inside the text: emerald and underlined in gold, so it reads as one in a paragraph. */
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): ReactElement {
  const className =
    "rounded font-semibold text-[var(--paper-emerald)] underline decoration-[var(--paper-gold)] underline-offset-4 hover:decoration-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)]";

  if (href.startsWith("/")) {
    return (
      <Link href={href} prefetch={false} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <a href={href} className={className} rel="noopener noreferrer">
      {children}
    </a>
  );
}
