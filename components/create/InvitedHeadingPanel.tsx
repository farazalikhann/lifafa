"use client";

import { useId, type ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";

const TITLE = '"You are invited" heading';

/**
 * Whether the card's first screen opens with the small "You are invited"
 * heading.
 *
 * On for every card until a host turns it off, the ones saved before the
 * switch included: only `false` is ever stored (`invitedHeadingOn` in
 * lib/cardSections.ts). The words are the card's own, in its language, and
 * there is nothing to edit: the only choice is to have them or not.
 */
export default function InvitedHeadingPanel({
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
      title={TITLE}
      summary={enabled ? "On" : "Off"}
      {...sectionState(accordion, "invited-heading")}
    >
      <div className="flex items-start justify-between gap-4">
        <p id={hintId} className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
          {enabled
            ? "A small heading in your card's accent colour, above the first thing on the card. In Hindi on a Hindi card."
            : "The card opens straight on its calligraphy, greeting or names."}
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={TITLE}
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
