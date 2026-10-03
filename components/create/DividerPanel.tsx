"use client";

import type { ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import type { DividerStyle } from "@/types/card";

const DIVIDERS: readonly { id: DividerStyle; label: string }[] = [
  { id: "rose", label: "Rose" },
  { id: "marigold", label: "Marigold" },
  { id: "mogra", label: "Mogra" },
  { id: "none", label: "None" },
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
 * The garland drawn between two sections of the card.
 *
 * `divider` is what the card draws now: the host's own choice once they have
 * made one, and until then the flower their card's tradition is given. Picking
 * anything here, the flower already shown included, makes it their choice,
 * and it then stays whatever the tradition is changed to.
 */
export default function DividerPanel({
  divider,
  onDividerChange,
  accordion,
}: {
  divider: DividerStyle;
  onDividerChange: (divider: DividerStyle) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  return (
    <CollapsibleSection
      title="Section dividers"
      summary={DIVIDERS.find((option) => option.id === divider)?.label}
      {...sectionState(accordion, "divider")}
    >
      <div className="flex flex-wrap gap-2">
        {DIVIDERS.map((option) => {
          const isSelected = option.id === divider;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onDividerChange(option.id)}
              className={pillClass(isSelected)}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--lifafa-muted)]">
        A garland between the sections of the card. None leaves a plain rule.
      </p>
    </CollapsibleSection>
  );
}
