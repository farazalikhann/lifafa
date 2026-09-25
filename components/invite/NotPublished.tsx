import type { ReactElement } from "react";

/**
 * What a guest sees for an invitation that is not paid for yet.
 *
 * DELIBERATELY SAYS NOTHING ABOUT THE EVENT. No names, no date, no venue, not
 * even the language it was written in: the page that renders this is handed
 * no event, so none of it can reach the HTML. The same words for every unpaid
 * card, in English, which is also why it takes no props.
 */
export default function NotPublished(): ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--lifafa-ink)] px-6 py-16 text-center">
      <p className="text-xs font-medium tracking-[0.2em] text-[var(--lifafa-marigold)] uppercase">
        Lifafa
      </p>

      <h1 className="max-w-[22ch] font-[family-name:var(--font-display)] text-3xl leading-tight text-balance text-[var(--lifafa-cream)] sm:text-4xl">
        This invitation is not active yet.
      </h1>

      <p className="max-w-[40ch] text-sm leading-relaxed text-[var(--lifafa-muted)]">
        Please check back later.
      </p>
    </main>
  );
}
