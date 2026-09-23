"use client";

import type { ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { COVER_ANIMATIONS } from "@/lib/coverAnimations";
import type { CoverAnimationId } from "@/types/coverAnimation";

/**
 * How the invitation is wrapped before a guest opens it.
 *
 * A list rather than the pill row the other pickers use, because each option
 * needs a line explaining what it does: "Curtain reveal" on its own does not
 * tell a host what their guests will see, and this is the one decision they
 * cannot check against the preview beside them. A live replay of the chosen
 * animation is a later addition; for now the description is the whole answer.
 *
 * "No animation" is in the list as an equal option and not behind a switch.
 * Plenty of hosts want the card and nothing in front of it, and making that
 * choice the awkward one is how a product ends up nagging people.
 */
export default function CoverAnimationPicker({
  coverAnimation,
  onChange,
  accordion,
}: {
  coverAnimation: CoverAnimationId;
  onChange: (id: CoverAnimationId) => void;
  /** The Extras tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  return (
    <CollapsibleSection
      title="How it opens"
      summary={
        COVER_ANIMATIONS.find((option) => option.id === coverAnimation)?.label
      }
      {...sectionState(accordion, "cover")}
    >
      <p className="text-xs text-[var(--lifafa-muted)]">
        Guests see this first and tap to open your card.
      </p>

      <div className="flex flex-col gap-2">
        {COVER_ANIMATIONS.map((option) => {
          const isSelected = option.id === coverAnimation;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.id)}
              className={[
                "flex min-h-11 flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                  : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-muted)]",
              ].join(" ")}
            >
              <span
                className={`text-[0.8125rem] font-medium ${
                  isSelected
                    ? "text-[var(--lifafa-cream)]"
                    : "text-[var(--lifafa-muted)]"
                }`}
              >
                {option.label}
              </span>
              <span className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </CollapsibleSection>
  );
}
