"use client";

import { useId, type ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";

/**
 * Whether the two cards of "Meet the Couple" carry a figure.
 *
 * On for every card until a host turns it off. The figures are the card's
 * tradition's own pair and there is nothing to choose between or upload: the
 * only choice is to have them, or to have each person's initial in a round
 * gold frame instead.
 */
export default function CoupleIllustrationPanel({
  enabled,
  onEnabledChange,
  accordion,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const hintId = useId();

  return (
    <CollapsibleSection
      title="Couple illustration"
      summary={enabled ? "On" : "Off"}
      {...sectionState(accordion, "couple-illustration")}
    >
      <div className="flex items-start justify-between gap-4">
        <p id={hintId} className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
          {enabled
            ? "Meet the Couple shows a groom and a bride in your tradition's dress, seen from behind. They follow the tradition you pick under Traditional motifs."
            : "Meet the Couple shows each person's initial in a round gold frame instead of a figure."}
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Couple illustration"
          aria-describedby={hintId}
          onClick={() => onEnabledChange(!enabled)}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          {/* The state in words as well, hidden because aria-checked already says it. */}
          <span
            aria-hidden="true"
            className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
          >
            {enabled ? "On" : "Off"}
          </span>
          <span
            aria-hidden="true"
            className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-150 ${
              enabled ? "bg-[var(--lifafa-marigold)]" : "bg-[var(--lifafa-hairline)]"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full bg-[var(--lifafa-ink)] transition-transform duration-150 ${
                enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </span>
        </button>
      </div>
    </CollapsibleSection>
  );
}
