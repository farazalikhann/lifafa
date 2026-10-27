import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import MetaPixelNoscript from "@/components/analytics/MetaPixelNoscript";
import LegalFooter from "@/components/legal/LegalFooter";

/**
 * One policy page: the wordmark home, the title and its date, a short summary
 * in plain words, then the full text, and the shared footer.
 *
 * The same bloom and type as the sign-in and not-found pages, so reading a
 * policy does not feel like leaving Lifafa. The text column is held to about
 * 68 characters, a comfortable line on a desktop, and fills a 360px phone
 * with the page's 20px gutters.
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
    <div className="relative flex min-h-screen flex-col bg-[var(--lifafa-ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[50vh]"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,163,61,0.08), transparent 70%)",
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

      <main className="relative z-10 flex-1 px-5 pt-4 pb-16 sm:px-8 sm:pt-8">
        <article className="mx-auto w-full max-w-[68ch] min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-[2rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)] sm:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-3 text-sm text-[var(--lifafa-muted)]">
            Last updated {updated}
          </p>

          <section
            aria-labelledby="legal-summary"
            className="mt-8 rounded-2xl border border-[var(--lifafa-marigold)]/30 bg-[var(--lifafa-marigold)]/[0.06] px-5 py-5"
          >
            <h2
              id="legal-summary"
              className="text-[0.6875rem] font-semibold tracking-[0.2em] text-[var(--lifafa-marigold)] uppercase"
            >
              In short
            </h2>
            <ul className="mt-3 flex flex-col gap-2.5">
              {summary.map((point, index) => (
                <li
                  key={index}
                  className="flex gap-3 text-[0.9375rem] leading-relaxed text-[var(--lifafa-cream)]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--lifafa-marigold)]"
                  />
                  <span className="min-w-0">{point}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-10 flex flex-col gap-10">{children}</div>
        </article>
      </main>

      <LegalFooter />
      <MetaPixelNoscript />
    </div>
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
      <h2 className="font-[family-name:var(--font-display)] text-xl leading-snug font-semibold text-balance text-[var(--lifafa-cream)] sm:text-2xl">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** A heading inside a section. */
export function Subheading({ children }: { children: ReactNode }): ReactElement {
  return (
    <h3 className="mt-2 text-base font-semibold text-[var(--lifafa-cream)]">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }): ReactElement {
  return (
    <p className="text-[0.9375rem] leading-[1.75] break-words text-[var(--lifafa-cream)]/90">
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
          className="flex gap-3 text-[0.9375rem] leading-[1.75] break-words text-[var(--lifafa-cream)]/90"
        >
          <span
            aria-hidden="true"
            className="mt-[0.75em] h-1 w-1 shrink-0 rounded-full bg-[var(--lifafa-muted)]"
          />
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A link inside the text: marigold and underlined, so it reads as one in a paragraph. */
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): ReactElement {
  const className =
    "rounded font-medium text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

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
