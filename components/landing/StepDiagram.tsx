"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";

/** How long the dot rests on each step before it moves on. */
const STEP_MS = 2000;
/*
  The step the dot is on at each beat: one to four, a rest on the last, then
  back to the first.
*/
const CYCLE = [0, 1, 2, 3, 3] as const;
/** How long after the page has loaded the dot first moves. */
const START_AFTER_MS = 1500;

/** Line drawings in the marigold of the page, from one 64-unit grid. */
function Icon({ children }: { children: ReactElement }): ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 text-[var(--lifafa-marigold)]"
    >
      {children}
    </svg>
  );
}

interface Step {
  label: string;
  /** The one line shown when the step is selected. */
  detail: string;
  icon: ReactElement;
}

const STEPS: readonly Step[] = [
  {
    label: "Choose a design",
    detail:
      "Pick from the Premium and Traditions designs, and open any of them as a live demo first.",
    icon: (
      <Icon>
        <g>
          <path d="M6 18 Q6 15 9 15 L19 15 Q22 15 22 18 L22 46 Q22 49 19 49 L9 49 Q6 49 6 46 Z" opacity={0.6} />
          <path d="M24 12 Q24 9 27 9 L37 9 Q40 9 40 12 L40 52 Q40 55 37 55 L27 55 Q24 55 24 52 Z" />
          <path d="M42 18 Q42 15 45 15 L55 15 Q58 15 58 18 L58 46 Q58 49 55 49 L45 49 Q42 49 42 46 Z" opacity={0.6} />
        </g>
      </Icon>
    ),
  },
  {
    label: "Add your details",
    detail:
      "Names, date, venue and every function, in English or Hindi. The card fills in as you type.",
    icon: (
      <Icon>
        <g>
          <path d="M14 10 Q13 7 16 7 L39 8 Q42 8 42 11 L41 53 Q41 56 38 56 L16 55 Q13 55 13 52 Z" />
          <path d="M19.5 20 L35 20.5" />
          <path d="M19.5 30 L31 30.4" />
          <path d="M45 46 L56 30 Q58 27.5 60.5 29.5 Q62.5 31.5 60.5 34 L49.5 50 L44 52 Z" />
        </g>
      </Icon>
    ),
  },
  {
    label: "Make it yours",
    detail:
      "Choose the colours and the type, add music, and switch on QR check-in if you want it.",
    icon: (
      <Icon>
        <g>
          <path d="M32 7 C17 7 7 18 7 31 C7 45 18 57 30 57 C35 57 36 53 34 50 C32 47 34 43 38 43 L45 43 C52 43 57 38 57 31 C57 17 46 7 32 7 Z" />
          <path d="M20 26 h0.01 M30 18 h0.01 M42 22 h0.01 M19 38 h0.01" strokeWidth={7} />
        </g>
      </Icon>
    ),
  },
  {
    label: "Share one link on WhatsApp",
    detail:
      "Send it to every guest. Their replies come straight to your dashboard, with nothing to install.",
    icon: (
      <Icon>
        <g>
          <path d="M9 15 Q9 9 15 9 L49 10 Q55 10 55 16 L54 37 Q54 43 48 43 L28 42 L17 52 L19 42 Q9 41 9 35 Z" />
          <path d="M27 30 L23.5 30 Q19 30 19 25.5 Q19 21 23.5 21 L30 21 Q34 21 34.4 25" />
          <path d="M37 21 L40.5 21 Q45 21 45 25.5 Q45 30 40.5 30 L34 30 Q30 30 29.6 26" />
        </g>
      </Icon>
    ),
  },
];

/**
 * How a card is made, in four steps joined by a thin line: down the screen
 * on a phone, across it from `lg`.
 *
 * THE STEPS LIGHT UP IN TURN as a small dot travels along the line to each,
 * rests on the last, and starts again. Selecting a step stops that, lights
 * the step and shows one more line about it under the diagram.
 *
 * LIGHT ON A SLOW PHONE. Everything that moves is a transform or an opacity:
 * the dot is moved with `translate` and each step lights by fading a layer
 * in, so a beat costs one small render and no layout. Nothing moves until the
 * page has loaded, nothing moves while the diagram is off screen or the tab
 * is hidden, and under reduced motion nothing moves at all: every step is
 * drawn lit and the dot is not drawn.
 *
 * The server's HTML is the first beat, step one lit, so the diagram is whole
 * before any script runs.
 */
export default function StepDiagram(): ReactElement {
  const listRef = useRef<HTMLDivElement>(null);
  const [beat, setBeat] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const captionId = useId();

  useEffect(() => {
    const list = listRef.current;

    if (
      chosen !== null ||
      list === null ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let onScreen = true;
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
    });
    observer.observe(list);

    let interval: number | undefined;
    let delay: number | undefined;
    const start = (): void => {
      delay = window.setTimeout(() => {
        interval = window.setInterval(() => {
          if (onScreen && !document.hidden) {
            setBeat((current) => current + 1);
          }
        }, STEP_MS);
      }, START_AFTER_MS);
    };

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("load", start);
      window.clearTimeout(delay);
      window.clearInterval(interval);
    };
  }, [chosen]);

  const index = chosen ?? CYCLE[beat % CYCLE.length];

  return (
    <div className="w-full">
      <div ref={listRef} className="relative mx-auto w-full max-w-xs lg:max-w-4xl">
        {/* The line, from the first step's mark to the last one's. */}
        <span
          aria-hidden="true"
          className="absolute top-7 bottom-7 left-3 w-px -translate-x-1/2 bg-[var(--lifafa-marigold)]/25 lg:top-3 lg:right-[12.5%] lg:bottom-auto lg:left-[12.5%] lg:h-px lg:w-auto lg:translate-x-0 lg:-translate-y-1/2"
        />

        {/*
          The dot. Its box is one step's mark, and it is moved a whole box at a
          time, so it lands on each mark at any width. Straight back to the
          first step, rather than travelling up the line.
        */}
        <span
          aria-hidden="true"
          style={{ "--i": index } as CSSProperties}
          className={`pointer-events-none absolute top-0 left-0 z-10 flex h-14 w-6 translate-y-[calc(var(--i)*100%)] items-center justify-center motion-reduce:hidden lg:h-6 lg:w-1/4 lg:translate-x-[calc(var(--i)*100%)] lg:translate-y-0 ${
            index === 0
              ? "transition-none"
              : "transition-transform duration-[900ms] ease-in-out"
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-[var(--lifafa-marigold)] shadow-[0_0_10px_2px_rgba(232,163,61,0.65)]" />
        </span>

        <ol
          role="list"
          aria-label="How it works, in four steps"
          className="list-none lg:grid lg:grid-cols-4"
        >
          {STEPS.map((step, i) => {
            const lit = i <= index;
            const current = i === index;

            return (
              <li key={step.label} className="relative">
                <button
                  type="button"
                  aria-pressed={chosen === i}
                  aria-controls={captionId}
                  onClick={() => setChosen(i)}
                  className="group flex h-14 w-full items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] lg:h-auto lg:flex-col lg:gap-3 lg:pb-2 lg:text-center"
                >
                  {/* The step's mark on the line. */}
                  <span className="flex h-14 w-6 shrink-0 items-center justify-center lg:h-6 lg:w-full">
                    <span className="relative h-3.5 w-3.5 rounded-full border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-ink)]">
                      <span
                        className={`absolute -inset-px rounded-full border-2 border-[var(--lifafa-marigold)] bg-[var(--lifafa-marigold)]/25 transition-opacity duration-500 motion-reduce:transition-none ${
                          lit ? "opacity-100 delay-500" : "opacity-0"
                        } motion-reduce:opacity-100`}
                      />
                    </span>
                  </span>

                  <span
                    className={`flex min-w-0 items-center gap-3 transition-opacity duration-500 motion-reduce:transition-none lg:flex-col ${
                      lit ? "opacity-100 delay-500" : "opacity-55"
                    } motion-reduce:opacity-100`}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]">
                      {step.icon}
                      <span
                        aria-hidden="true"
                        className={`absolute -inset-px rounded-xl border border-[var(--lifafa-marigold)] transition-opacity duration-500 motion-reduce:transition-none ${
                          current ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </span>
                    <span className="text-[0.9375rem] leading-snug font-medium text-[var(--lifafa-cream)] lg:max-w-[14ch]">
                      <span className="mr-1.5 font-semibold text-[var(--lifafa-marigold)] tabular-nums">
                        {i + 1}
                      </span>
                      {step.label}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <p
        id={captionId}
        aria-live="polite"
        className="mx-auto mt-3 min-h-[2.75rem] max-w-xs text-sm leading-relaxed text-balance text-[var(--lifafa-muted)] lg:mt-5 lg:max-w-md lg:text-center"
      >
        {chosen === null ? "Select a step to see more." : STEPS[chosen].detail}
      </p>
    </div>
  );
}
