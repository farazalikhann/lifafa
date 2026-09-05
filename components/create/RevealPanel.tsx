"use client";

import type { ReactElement } from "react";
import type { ScratchTarget } from "@/types/card";

/*
  Labelled by what the host is choosing to hide rather than by the mechanism,
  because that is the decision they are actually making. Only one section can be
  hidden, so these are radio-like pills rather than a pair of toggles.
*/
const SCRATCH_TARGETS: readonly { id: ScratchTarget; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "date", label: "Hide the date" },
  { id: "venue", label: "Hide the venue" },
  { id: "countdown", label: "Hide the countdown" },
];

function pillClass(isSelected: boolean): string {
  return [
    "min-h-11 rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
    isSelected
      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
  ].join(" ");
}

/**
 * The scratch panel, and which section it covers.
 *
 * Was the fourth group inside StylePanel. It is a panel of its own now because
 * the editor's tabs put it under Decoration and left the typography, the
 * palettes and the borders under Design: this is something a guest does to the
 * card, not a way the card looks. The pills and the copy are unchanged; only the
 * wrapper around them is new, and it is the same wrapper the other standalone
 * panels in that tab already wear.
 */
export default function RevealPanel({
  scratchTarget,
  onScratchTargetChange,
}: {
  scratchTarget: ScratchTarget;
  onScratchTargetChange: (target: ScratchTarget) => void;
}): ReactElement {
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <h2 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
        Reveal effect
      </h2>

      <div className="flex flex-wrap gap-2">
        {SCRATCH_TARGETS.map((option) => {
          const isSelected = option.id === scratchTarget;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onScratchTargetChange(option.id)}
              className={pillClass(isSelected)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--lifafa-muted)]">
        Guests scratch the panel to uncover it.
      </p>
    </section>
  );
}
