"use client";

import { useId, type ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";

/**
 * Whether the card ends in a reply form.
 *
 * On by default, and every card saved before this switch existed reads as on —
 * see `rsvpEnabled` in lib/cardSections.ts. The form is how a host gets a
 * headcount, so turning it off is the unusual choice: a card sent to share the
 * date, or to a crowd the host is counting some other way.
 *
 * In the Structure tab, directly under the section list, because it answers
 * the same question that list does — what the guest sees, down to the end of
 * the card — and the form is always the last thing on it.
 *
 * Built exactly like CheckinPanel: a button with role="switch", named after
 * its section and described by the line beside it. The line changes with the
 * state rather than describing both, so what a host reads is what their guests
 * will get.
 */
export default function ReplyFormPanel({
  enabled,
  onEnabledChange,
  accordion,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** The Structure tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const hintId = useId();

  return (
    <CollapsibleSection
      title="Reply form (RSVP)"
      summary={enabled ? "On" : "Off"}
      {...sectionState(accordion, "reply")}
    >
      <div className="flex items-start justify-between gap-4">
        <p id={hintId} className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
          {enabled
            ? "At the end of the card, guests tell you whether they are coming and how many people they are bringing."
            : "The card ends after its last section. Guests cannot reply, so no headcount will reach your dashboard."}
        </p>

        {/*
          Named outright now that the heading it used to point at is the
          section's header button, which is a control of its own.
        */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Reply form (RSVP)"
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
              enabled
                ? "bg-[var(--lifafa-marigold)]"
                : "bg-[var(--lifafa-hairline)]"
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
