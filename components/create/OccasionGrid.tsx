"use client";

import type { ReactElement } from "react";
import { OCCASIONS } from "@/lib/occasions";
import { getMotifs } from "@/lib/motifs";
import type { OccasionId } from "@/types/occasion";

/**
 * What kind of celebration this is.
 *
 * Half of what used to be OccasionPicker. The other half — the tradition pills
 * and the ornament pack behind them — is TraditionPicker, and the two are apart
 * because the editor's tabs put them in different places: the occasion is a
 * fact about the event and belongs with the names and the date, while the
 * motifs are decoration a host adds afterwards or never. Mounting one component
 * in both tabs would have meant two occasion grids and two sets of pills.
 */
export default function OccasionGrid({
  occasionId,
  onOccasionChange,
}: {
  occasionId: OccasionId;
  onOccasionChange: (id: OccasionId) => void;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        Occasion
      </h2>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {OCCASIONS.map((occasion) => {
          const isSelected = occasion.id === occasionId;
          /* Show one of the occasion's own motifs as a tiny preview. */
          const [PreviewMotif] = getMotifs(occasion.id, "none");

          return (
            <button
              key={occasion.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onOccasionChange(occasion.id)}
              className={[
                "flex min-h-11 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3.5 transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                  : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60",
              ].join(" ")}
            >
              <span
                className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
              >
                {occasion.label}
              </span>
              <span
                aria-hidden="true"
                className={
                  isSelected
                    ? "text-[var(--lifafa-marigold)]"
                    : "text-[var(--lifafa-muted)]"
                }
              >
                <PreviewMotif size={20} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
