"use client";

import type { ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import type { ScratchFrame, ScratchTarget } from "@/types/card";

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

/* The frame of roses the panel is drawn in. */
const SCRATCH_FRAMES: readonly { id: ScratchFrame; label: string }[] = [
  { id: "oval", label: "Oval" },
  { id: "rect", label: "Rectangle" },
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
 * wrapper around them is new, and it is the same collapsible section the other
 * panels in its tab use.
 *
 * Offered under Design, after the section divider: it moved there from Extras
 * because its frame of flowers is chosen with the card's other ornament. What
 * it saves, and how the card draws it, did not move with it.
 */
export default function RevealPanel({
  scratchTarget,
  onScratchTargetChange,
  scratchFrame,
  onScratchFrameChange,
  accordion,
}: {
  scratchTarget: ScratchTarget;
  onScratchTargetChange: (target: ScratchTarget) => void;
  scratchFrame: ScratchFrame;
  onScratchFrameChange: (frame: ScratchFrame) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  return (
    <CollapsibleSection
      title="Reveal effect"
      summary={
        SCRATCH_TARGETS.find((option) => option.id === scratchTarget)?.label
      }
      {...sectionState(accordion, "reveal")}
    >
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

      {/* Only once there is a panel for it to be the frame of. */}
      {scratchTarget !== "none" ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-[var(--lifafa-cream)]">Frame</p>
          <div className="flex flex-wrap gap-2">
            {SCRATCH_FRAMES.map((option) => {
              const isSelected = option.id === scratchFrame;

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onScratchFrameChange(option.id)}
                  className={pillClass(isSelected)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--lifafa-muted)]">
            The rectangle has more room, and suits a long venue or the countdown.
          </p>
        </div>
      ) : null}
    </CollapsibleSection>
  );
}
