"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import { useInView } from "@/hooks/useInView";

/*
  What one payment buys, and every line has to be something the product does
  today. The tradition count is the ornament packs in lib/traditionPacks.tsx —
  a card with no tradition has occasion motifs but nothing traditional — and
  the functions are the host's own sub-events, which the card sets as a
  timeline.
*/
const INCLUDED: readonly string[] = [
  "Unlimited guests",
  "Your headcount, always up to date when you open it",
  "Every function: mehndi, sangeet, reception",
  "Traditional motifs for six traditions",
  "QR check-in on the event day",
  "Guest list export",
  "Works on every phone, no app needed",
];

/** Hand drawn tick, marigold via currentColor on the list item. */
function Tick(): ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[0.3rem] h-[18px] w-[18px] shrink-0 text-[var(--lifafa-marigold)]"
    >
      <path d="M3.5 10.5 Q6 12.5 8 15 Q11.5 7.5 16.5 4" />
    </svg>
  );
}

export default function Pricing() {
  const { ref, isInView } = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      aria-labelledby="pricing-heading"
      className={[
        "flex min-h-[80svh] items-center justify-center px-6 py-20",
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      ].join(" ")}
    >
      <div className="w-full max-w-[420px] rounded-3xl border border-[var(--lifafa-marigold)]/45 bg-[var(--lifafa-ink-raised)] px-7 py-10 sm:px-9 sm:py-12">
        {/*
          The section's name for anything navigating by headings. The label
          under it says what the price is, which is what a sighted visitor
          needs above a number; "Pricing" above it said only what they could
          already see.
        */}
        <h2 id="pricing-heading" className="sr-only">
          Pricing
        </h2>

        <p className="text-center text-[0.6875rem] tracking-[0.28em] text-[var(--lifafa-muted)] uppercase">
          One event, one payment
        </p>

        <p className="mt-5 text-center font-[family-name:var(--font-display)] text-[3.5rem] leading-none font-semibold tracking-[-0.02em] text-[var(--lifafa-cream)] sm:text-6xl">
          ₹999
        </p>
        <p className="mt-3 text-center text-sm text-[var(--lifafa-muted)]">
          No subscription. No per-guest charge.
        </p>

        <div
          aria-hidden="true"
          className="my-8 h-px w-full bg-[var(--lifafa-hairline)]"
        />

        <ul className="flex flex-col gap-4">
          {INCLUDED.map((item) => (
            <li key={item} className="flex items-start gap-3">
              <Tick />
              <span className="text-[0.9375rem] leading-relaxed text-[var(--lifafa-cream)] sm:text-base">
                {item}
              </span>
            </li>
          ))}
        </ul>

        {/*
          The card states a price and lists what it buys, and a visitor who
          has just read both is ready to act on them. Outlined rather than
          filled: the hero and the closing section carry the filled pill, and a
          third one this close to the second would compete with it.
        */}
        <Link
          href="/create"
          className="mt-9 flex min-h-12 w-full items-center justify-center rounded-full border border-[var(--lifafa-marigold)]/60 px-6 text-[0.9375rem] font-semibold text-[var(--lifafa-marigold)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] hover:bg-[var(--lifafa-marigold)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Start your invitation
        </Link>
      </div>
    </section>
  );
}
