"use client";

import { useId, type ReactElement } from "react";
import FeatureHelp from "@/components/create/FeatureHelp";
import RsvpDemo from "@/components/create/demos/RsvpDemo";

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
 * Built exactly like CheckinPanel: a button with role="switch", named by its
 * visible heading and described by the line under it. The line changes with the
 * state rather than describing both, so what a host reads is what their guests
 * will get.
 */
export default function ReplyFormPanel({
  enabled,
  onEnabledChange,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}): ReactElement {
  const headingId = useId();
  const hintId = useId();

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        {/* Heading and "?" on the left, switch on the right — as in CheckinPanel. */}
        <div className="flex min-w-0 items-center gap-1">
          <h2
            id={headingId}
            className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase"
          >
            Reply form (RSVP)
          </h2>

          <FeatureHelp
            label="How replies become a headcount"
            description="Guests answer at the end of your card and say how many people they are bringing. Your dashboard adds every yes together into one expected headcount, so you know what to cater for."
          >
            <RsvpDemo />
          </FeatureHelp>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-labelledby={headingId}
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

      <p id={hintId} className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
        {enabled
          ? "At the end of the card, guests tell you whether they are coming and how many people they are bringing."
          : "The card ends after its last section. Guests cannot reply, so no headcount will reach your dashboard."}
      </p>
    </section>
  );
}
