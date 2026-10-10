"use client";

import type { ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { NAMES_FRAMES, namesFrameArt } from "@/lib/namesFrame";
import type { NamesFrame } from "@/types/card";

/**
 * The frame the card's opening sets its names in: one of four pictures.
 *
 * Only offered for a card whose opening carries the names (a Hindu card), and
 * the lotus ring on every such card until a host picks another. The tiles are
 * small cuts of the same pictures the card draws.
 */
export default function NamesFramePanel({
  namesFrame,
  onNamesFrameChange,
  accordion,
}: {
  namesFrame: NamesFrame;
  onNamesFrameChange: (frame: NamesFrame) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const current = NAMES_FRAMES.find((option) => option.id === namesFrame);

  return (
    <CollapsibleSection
      title="Names frame"
      summary={current?.label}
      {...sectionState(accordion, "names-frame")}
    >
      <div className="grid grid-cols-2 gap-2">
        {NAMES_FRAMES.map((option) => {
          const isSelected = option.id === namesFrame;
          const art = namesFrameArt(option.id);

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onNamesFrameChange(option.id)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              <span
                className={[
                  "flex h-24 w-full items-center justify-center overflow-hidden rounded-lg border bg-[var(--lifafa-ink-raised)] p-2 transition-shadow duration-150",
                  isSelected
                    ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                    : "border-[var(--lifafa-hairline)]",
                ].join(" ")}
              >
                <img
                  src={art.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-contain select-none"
                />
              </span>
              <span
                className={`text-center text-[0.6875rem] leading-tight ${
                  isSelected ? "text-[var(--lifafa-cream)]" : "text-[var(--lifafa-muted)]"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--lifafa-muted)]">
        Your names are set inside it on the first screen of your card, and
        made smaller if they are long, so they never touch the artwork.
      </p>
    </CollapsibleSection>
  );
}
