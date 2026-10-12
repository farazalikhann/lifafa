"use client";

import type { ReactElement, ReactNode } from "react";
import {
  WIZARD_STEPS,
  wizardStepIndex,
  type WizardStepId,
} from "@/lib/wizardSteps";

/**
 * Where the host is in the four steps: the step's name, "Step 2 of 4", and a
 * bar with a segment for each, on one line with the wordmark so the whole
 * header stays about 64px tall on a phone.
 *
 * The segments are the way to jump between steps as well as the picture of
 * them, when `onSelect` is given: every step is open at any time, since none
 * of them needs another to be finished first. Without it (the saved card,
 * waiting to be paid for) the bar is a picture and nothing else.
 *
 * Built for 360px first: one line of text and four segments that share the
 * width, each a 44px tap target whatever the bar's own height.
 */
export default function WizardProgress({
  brand,
  current,
  done = false,
  onSelect,
}: {
  /** The wordmark, at the start of the line. */
  brand: ReactNode;
  current: WizardStepId;
  /** Every step is behind the host: the card is saved. */
  done?: boolean;
  onSelect?: (step: WizardStepId) => void;
}): ReactElement {
  const index = wizardStepIndex(current);
  const step = WIZARD_STEPS[index];

  return (
    <nav aria-label="Steps" className="flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        {brand}
        <p className="min-w-0 truncate text-[0.8125rem] text-[var(--lifafa-muted)]">
          <span className="font-medium text-[var(--lifafa-cream)]">
            {step.label}
          </span>{" "}
          · Step {index + 1} of {WIZARD_STEPS.length}
        </p>
      </div>

      <ol className="flex gap-1.5">
        {WIZARD_STEPS.map((entry, at) => {
          const reached = done || at <= index;
          const bar = (
            <span
              aria-hidden="true"
              className={`block h-1.5 w-full rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                reached
                  ? "bg-[var(--lifafa-marigold)]"
                  : "bg-[var(--lifafa-hairline)]"
              }`}
            />
          );

          return (
            <li key={entry.id} className="min-w-0 flex-1">
              {onSelect === undefined ? (
                <span className="flex h-7 items-center">
                  {bar}
                  <span className="sr-only">
                    {entry.label}
                    {at === index ? " (current step)" : ""}
                  </span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(entry.id)}
                  aria-current={at === index ? "step" : undefined}
                  className="-my-2 flex h-11 w-full items-center rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  {bar}
                  <span className="sr-only">
                    Step {at + 1}: {entry.label}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
