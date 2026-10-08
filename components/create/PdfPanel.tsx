"use client";

import { useId, type ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";

/**
 * Whether guests may keep the invitation as a PDF.
 *
 * The switch the last section of the guest's card reads
 * (components/invite/KeepsakeSection.tsx), and the printable copy behind it
 * (app/i/[inviteCode]/print): off, the card ends at the hosts' note and the
 * copy is a 404. Stored on the card's own JSON, and only when it is off; see
 * lib/pdfDownload.ts.
 *
 * On for every card unless its host says otherwise, new or old. The same
 * switch CheckinPanel is, named after its section so a screen reader says
 * "Let guests save as PDF, switch, on".
 */
export default function PdfPanel({
  enabled,
  onEnabledChange,
  accordion,
}: {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  /** The Extras tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const hintId = useId();

  return (
    <CollapsibleSection
      title="Let guests save as PDF"
      summary={enabled ? "On" : "Off"}
      {...sectionState(accordion, "pdf")}
    >
      <div className="flex items-start justify-between gap-4">
        <p id={hintId} className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
          Guests can download a printable copy of your invitation.
        </p>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Let guests save as PDF"
          aria-describedby={hintId}
          onClick={() => onEnabledChange(!enabled)}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          {/* The state in words as well as in position; aria-checked already says it aloud. */}
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
