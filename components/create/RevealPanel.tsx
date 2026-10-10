"use client";

import { useId, type ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import type { ScratchFrame, ScratchTarget } from "@/types/card";

/** What this section can put the panel over: everything but the date, which has its own. */
export type ScratchSection = Exclude<ScratchTarget, "date">;

/*
  Named for the section the panel goes over. Only one can have it, so these
  are radio-like pills rather than a pair of toggles. The date is not among
  them: a scratch panel over the date is chosen under "Date reveal".
*/
const SCRATCH_SECTIONS: readonly { id: ScratchSection; label: string }[] = [
  { id: "none", label: "Off" },
  { id: "venue", label: "Venue" },
  { id: "countdown", label: "Countdown" },
];

/* The frame of roses the panel is drawn in. */
const SCRATCH_FRAMES: readonly { id: ScratchFrame; label: string }[] = [
  { id: "oval", label: "Oval" },
  { id: "rect", label: "Rectangle" },
];

function pillClass(isSelected: boolean): string {
  return [
    "min-h-11 rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors duration-150",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[var(--lifafa-muted)]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
    isSelected
      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
  ].join(" ");
}

/**
 * The panel's frame, Oval or Rectangle. The card has one panel and so one
 * frame, `scratchFrame`, whichever section the panel is over: this is shown
 * here for the venue and the countdown, and under "Date reveal" for the date.
 */
export function ScratchFramePicker({
  scratchFrame,
  onScratchFrameChange,
  hint,
}: {
  scratchFrame: ScratchFrame;
  onScratchFrameChange: (frame: ScratchFrame) => void;
  hint: string;
}): ReactElement {
  return (
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
      <p className="text-xs text-[var(--lifafa-muted)]">{hint}</p>
    </div>
  );
}

/**
 * The scratch panel over the venue or the countdown.
 *
 * Was the fourth group inside StylePanel. It is a panel of its own now because
 * the editor's tabs put it under Decoration and left the typography, the
 * palettes and the borders under Design: this is something a guest does to the
 * card, not a way the card looks.
 *
 * Offered under Design, after the date's own reveal: it moved there from
 * Extras because its frame of flowers is chosen with the card's other
 * ornament. What it saves, and how the card draws it, did not move with it.
 *
 * NOT THE DATE'S. It used to be called "Reveal effect" and offer "Hide the
 * date" beside the other two, which was a second place to choose something
 * "Date reveal" already chose, and picking it here switched a royal scroll to
 * a scratch panel up there without a word. The date has one owner now, and
 * this section has the other two sections and nothing else.
 *
 * A CARD HAS ONE SCRATCH PANEL. That has not changed. So while the date has
 * it, there is nothing here to choose: the options are shown, switched off,
 * with a line saying why and a way to take the panel off the date. Shown and
 * not hidden, so a host looking for the venue's scratch panel finds where it
 * is and what is in its way.
 */
export default function RevealPanel({
  scratchTarget,
  onScratchSectionChange,
  onShowDateSimply,
  scratchFrame,
  onScratchFrameChange,
  accordion,
}: {
  /** Where the card's one panel is, the date included: that is what switches this section off. */
  scratchTarget: ScratchTarget;
  onScratchSectionChange: (section: ScratchSection) => void;
  /** Takes the panel off the date and shows the date plainly, which frees the panel for here. */
  onShowDateSimply: () => void;
  scratchFrame: ScratchFrame;
  onScratchFrameChange: (frame: ScratchFrame) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const usedByDate = scratchTarget === "date";
  const usedByDateId = useId();

  return (
    <CollapsibleSection
      title="Scratch to reveal"
      summary={
        usedByDate
          ? "Used by the date"
          : SCRATCH_SECTIONS.find((option) => option.id === scratchTarget)?.label
      }
      {...sectionState(accordion, "reveal")}
    >
      <div
        role="group"
        aria-label="Section behind the scratch panel"
        aria-describedby={usedByDate ? usedByDateId : undefined}
        className="flex flex-wrap gap-2"
      >
        {SCRATCH_SECTIONS.map((option) => {
          /* None of them while the date has the panel: it is not off, and it is not here. */
          const isSelected = !usedByDate && option.id === scratchTarget;

          return (
            <button
              key={option.id}
              type="button"
              disabled={usedByDate}
              aria-pressed={isSelected}
              onClick={() => onScratchSectionChange(option.id)}
              className={pillClass(isSelected)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {usedByDate ? (
        <div className="flex flex-col items-start gap-1">
          <p id={usedByDateId} className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
            Your date already uses scratch to reveal. A card has one scratch
            panel, so guests only scratch once.
          </p>
          <button
            type="button"
            onClick={onShowDateSimply}
            className="min-h-11 rounded text-xs font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-150 hover:decoration-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Show the date simply instead
          </button>
        </div>
      ) : (
        <p className="text-xs text-[var(--lifafa-muted)]">
          Guests scratch the panel to uncover it.
        </p>
      )}

      {/* Only once a section here has the panel for it to be the frame of. */}
      {scratchTarget === "venue" || scratchTarget === "countdown" ? (
        <ScratchFramePicker
          scratchFrame={scratchFrame}
          onScratchFrameChange={onScratchFrameChange}
          hint="The rectangle has more room, and suits a long venue or the countdown."
        />
      ) : null}
    </CollapsibleSection>
  );
}
