"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";

interface Question {
  question: string;
  answer: string;
}

const QUESTIONS: readonly Question[] = [
  {
    question: "Do my guests need an account?",
    answer:
      "No. They open the link, read the invitation, and reply. Nothing to install and nothing to sign up for.",
  },
  {
    question: "What does ₹999 cover?",
    answer:
      "One invitation for one event, with unlimited guests and every feature. If you are hosting a second event, that is a separate invitation.",
  },
  {
    question: "Can I change the card after sharing it?",
    answer:
      "Yes. The link stays the same, so anything you edit updates for everyone who already has it.",
  },
  {
    question: "How do I know who is coming?",
    answer:
      "Every reply appears on your dashboard with a live headcount, and you can export the full guest list.",
  },
  {
    question: "Does it work on an old phone?",
    answer:
      "Yes. It opens in any browser and is built to stay light on a slow connection.",
  },
  {
    question: "Can I add my own functions?",
    answer:
      "You can add up to six, each with its own date, time and venue. They appear on the card as a timeline.",
  },
];

/**
 * The questions a host asks before paying, answered in place.
 *
 * NATIVE `details` AND `summary`, AND NOTHING ELSE. Opening, closing, keyboard
 * support, the expanded state a screen reader announces: the browser does all
 * of it, before this page has hydrated and on a device that never runs its
 * JavaScript at all. This is a client component only for the scroll reveal.
 *
 * The marker is drawn in CSS on a span inside the summary, a plus whose bars
 * turn into a cross when the item is open. The browser's own triangle is
 * switched off — `list-none` for most engines, the webkit pseudo-element for
 * Safari — because it cannot be coloured or placed to match the page.
 */
export default function Faq(): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      aria-labelledby="faq-heading"
      className={[
        "px-6 py-20 sm:py-24",
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      ].join(" ")}
    >
      <h2
        id="faq-heading"
        className="mx-auto max-w-[16ch] text-center font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)] sm:max-w-[20ch] sm:text-5xl"
      >
        Questions hosts ask
      </h2>

      <div className="mx-auto mt-12 max-w-2xl border-y border-[var(--lifafa-hairline)] sm:mt-14">
        {QUESTIONS.map((item) => (
          <details
            key={item.question}
            className="group border-b border-[var(--lifafa-hairline)] last:border-b-0"
          >
            {/*
              44px is the floor, not the size: a question that wraps to two
              lines on a phone simply grows the row.
            */}
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-4 text-left text-base leading-snug font-medium text-[var(--lifafa-cream)] transition-colors duration-200 hover:text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:text-lg [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>

              <span
                aria-hidden="true"
                className="relative h-3.5 w-3.5 shrink-0 text-[var(--lifafa-marigold)] transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none before:absolute before:top-1/2 before:left-0 before:h-[1.5px] before:w-full before:-translate-y-1/2 before:rounded-full before:bg-current before:content-[''] after:absolute after:top-0 after:left-1/2 after:h-full after:w-[1.5px] after:-translate-x-1/2 after:rounded-full after:bg-current after:content-['']"
              />
            </summary>

            <p className="max-w-[60ch] pr-10 pb-5 text-[0.9375rem] leading-relaxed text-[var(--lifafa-muted)] sm:text-base">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
