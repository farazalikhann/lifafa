import type { ReactElement } from "react";
import { EYEBROW, SECTION_HEADING, SECTION_LEAD } from "@/components/landing/styles";

interface Step {
  heading: string;
  copy: string;
  art: ReactElement;
}

/**
 * Shared frame for the line drawings: `currentColor` strokes with round ends,
 * so the marigold of the step colours the whole drawing.
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
      className="h-12 w-12 shrink-0 text-[var(--lifafa-marigold)]"
    >
      {children}
    </svg>
  );
}

/* 1. Three designs side by side, the middle one chosen. */
function ChooseArt(): ReactElement {
  return (
    <StepArt>
      <g>
        <path d="M6 18 Q6 15 9 15 L19 15 Q22 15 22 18 L22 46 Q22 49 19 49 L9 49 Q6 49 6 46 Z" opacity={0.6} />
        <path d="M24 12 Q24 9 27 9 L37 9 Q40 9 40 12 L40 52 Q40 55 37 55 L27 55 Q24 55 24 52 Z" />
        <path d="M42 18 Q42 15 45 15 L55 15 Q58 15 58 18 L58 46 Q58 49 55 49 L45 49 Q42 49 42 46 Z" opacity={0.6} />
        <path d="M28.5 32.5 L31 35 L35.5 29.5" />
      </g>
    </StepArt>
  );
}

/* 2. A card with a pencil at its edge. */
function DetailsArt(): ReactElement {
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

/* 3. A chat bubble carrying a link. */
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

const STEPS: readonly Step[] = [
  {
    heading: "Choose a design",
    copy: "Browse the designs and open any of them as a live demo before you decide.",
    art: <ChooseArt />,
  },
  {
    heading: "Add your details",
    copy: "Names, date, venue and your functions. You see the invitation take shape as you type.",
    art: <DetailsArt />,
  },
  {
    heading: "Share one link on WhatsApp",
    copy: "Send it to every guest. They open it, read it and reply, with nothing to install.",
    art: <ShareArt />,
  },
];

/** Three steps, and how long they take. No script: the list is in the HTML. */
export default function HowItWorks(): ReactElement {
  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="border-y border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]/50 px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={EYEBROW}>How it works</p>
          <h2 id="how-it-works-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Ready in about 10 minutes
          </h2>
          <p className={`mx-auto mt-4 max-w-[38ch] ${SECTION_LEAD}`}>
            Three steps from choosing a design to replies arriving.
          </p>
        </div>

        {/* `role="list"`: Safari drops a list's semantics once its markers are styled away. */}
        <ol
          role="list"
          className="mx-auto mt-12 grid max-w-md list-none gap-5 lg:max-w-none lg:grid-cols-3 lg:gap-6"
        >
          {STEPS.map((step, index) => (
            <li
              key={step.heading}
              className="flex gap-4 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)] p-5 lg:flex-col lg:p-7"
            >
              {step.art}
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-snug font-semibold text-[var(--lifafa-cream)] sm:text-2xl">
                  {step.heading}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--lifafa-muted)] sm:text-base">
                  {step.copy}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
