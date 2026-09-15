"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";

type Accent = "marigold" | "rose";

interface Step {
  numeral: string;
  heading: string;
  copy: string;
  accent: Accent;
  art: ReactElement;
}

/** Full class strings so Tailwind can see them at build time. */
const ACCENT_TEXT: Record<Accent, string> = {
  marigold: "text-[var(--lifafa-marigold)]",
  rose: "text-[var(--lifafa-rose)]",
};

/**
 * The gap between one step arriving and the next.
 *
 * The same 80ms the invitation staggers its own lines by — see `lineDelay` in
 * lib/cardFormat.ts. Written again here rather than imported, because that
 * module brings the card's copy tables with it, and the landing page would ship
 * both languages of invitation wording to show three steps.
 */
const STAGGER_MS = 80;

/**
 * Shared frame for the line drawings, in the same hand as the scroll story:
 * `currentColor` strokes with round ends, so the step's accent colours the
 * whole drawing.
 */
function StepArt({ children }: { children: ReactElement }): ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-14 w-14 shrink-0"
    >
      {children}
    </svg>
  );
}

/* 1 — A card with a pencil at its edge. */
function BuildArt(): ReactElement {
  return (
    <StepArt>
      <g>
        <path d="M14 10 Q13 7 16 7 L39 8 Q42 8 42 11 L41 53 Q41 56 38 56 L16 55 Q13 55 13 52 Z" />
        <path d="M19.5 19 L35 19.5" />
        <path d="M19.5 27 L31 27.4" opacity={0.7} />
        <path d="M19.5 35 L33 35.3" opacity={0.7} />
        <path d="M45 46 L56 30 Q58 27.5 60.5 29.5 Q62.5 31.5 60.5 34 L49.5 50 L44 52 Z" />
        <path d="M53.5 33 L57.5 36" />
      </g>
    </StepArt>
  );
}

/* 2 — A chat bubble carrying a link. */
function ShareArt(): ReactElement {
  return (
    <StepArt>
      <g>
        <path d="M9 15 Q9 9 15 9 L49 10 Q55 10 55 16 L54 37 Q54 43 48 43 L28 42 L17 52 L19 42 Q9 41 9 35 Z" />
        <path d="M27 30 L23.5 30 Q19 30 19 25.5 Q19 21 23.5 21 L30 21 Q34 21 34.4 25" />
        <path d="M37 21 L40.5 21 Q45 21 45 25.5 Q45 30 40.5 30 L34 30 Q30 30 29.6 26" />
      </g>
    </StepArt>
  );
}

/* 3 — A rising tally with a tick beside it. */
function CountArt(): ReactElement {
  return (
    <StepArt>
      <g>
        <path d="M8 55 L56 55" opacity={0.5} />
        <path d="M14 55 L14 43" />
        <path d="M25 55 L25 33" />
        <path d="M36 55 L36 22" />
        <path d="M48 10 Q55 10 55 17 Q55 24 48 24 Q41 24 41 17 Q41 10 48 10 Z" />
        <path d="M44.5 17.2 L47 19.7 L51.8 14.6" />
      </g>
    </StepArt>
  );
}

const STEPS: readonly Step[] = [
  {
    numeral: "1",
    heading: "Build your card",
    copy: "Pick an occasion, add your names and dates, choose how it looks. It takes a few minutes.",
    accent: "marigold",
    art: <BuildArt />,
  },
  {
    numeral: "2",
    heading: "Share one link",
    copy: "Send it on WhatsApp. Guests open it, read it, and reply. They never sign up.",
    accent: "rose",
    art: <ShareArt />,
  },
  {
    numeral: "3",
    heading: "Watch the count",
    copy: "Every reply lands on your dashboard, so you know your headcount long before the day.",
    accent: "marigold",
    art: <CountArt />,
  },
];

/** The reveal every landing section uses, driven by one boolean. */
function revealClass(isInView: boolean): string {
  return [
    "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none motion-reduce:delay-0",
    isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
  ].join(" ");
}

function StepItem({ step, index }: { step: Step; index: number }): ReactElement {
  /*
    Each step watches itself rather than the whole row. Side by side at lg the
    three arrive together and the stagger lays them out one after another;
    stacked on a phone the lower two are a screen further down, and a single
    observer on the row would have played their entrance before anyone could
    see it — the fault the scroll story's note describes.
  */
  const { ref, isInView } = useInView<HTMLLIElement>();

  return (
    <li
      ref={ref}
      className={`flex flex-col items-center text-center ${revealClass(isInView)}`}
      style={{ transitionDelay: `${(index + 1) * STAGGER_MS}ms` }}
    >
      <div className="flex items-center gap-5">
        {/*
          Hidden from assistive tech: the list is ordered, so a screen reader
          already says "1 of 3", and a second "one" beside it is noise.
        */}
        <span
          aria-hidden="true"
          className="font-[family-name:var(--font-display)] text-[4.5rem] leading-none font-semibold tracking-[-0.04em] text-[var(--lifafa-muted)]/35"
        >
          {step.numeral}
        </span>
        <span className={ACCENT_TEXT[step.accent]}>{step.art}</span>
      </div>

      <h3 className="mt-6 font-[family-name:var(--font-display)] text-2xl leading-[1.2] font-semibold tracking-[-0.01em] text-[var(--lifafa-cream)] sm:text-[1.75rem]">
        {step.heading}
      </h3>
      <p className="mt-3 max-w-[32ch] text-base leading-relaxed text-balance text-[var(--lifafa-muted)] sm:text-lg">
        {step.copy}
      </p>
    </li>
  );
}

export default function HowItWorks(): ReactElement {
  const { ref, isInView } = useInView<HTMLHeadingElement>();

  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="px-6 py-20 sm:py-24"
    >
      <h2
        ref={ref}
        id="how-it-works-heading"
        className={`mx-auto max-w-[16ch] text-center font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.15] font-semibold tracking-[-0.02em] text-balance text-[var(--lifafa-cream)] sm:max-w-[20ch] sm:text-5xl ${revealClass(isInView)}`}
      >
        How it works
      </h2>

      {/*
        `role="list"` because Safari drops a list's semantics once its markers
        are styled away, and the ordering is the point of this one.
      */}
      <ol
        role="list"
        className="mx-auto mt-14 grid max-w-6xl list-none gap-14 sm:mt-16 lg:grid-cols-3 lg:gap-10"
      >
        {STEPS.map((step, index) => (
          <StepItem key={step.numeral} step={step} index={index} />
        ))}
      </ol>
    </section>
  );
}
