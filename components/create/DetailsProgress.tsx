"use client";

import { useEffect, useRef, type ReactElement } from "react";
import { claritySet, clarityEvent } from "@/lib/clarity";
import { detailsFilled } from "@/lib/cardChecklist";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/** The points Clarity hears about, once each per page: half the details, and all of them. */
const MILESTONES = [50, 100] as const;

/**
 * "Details filled", a thin bar over a new card's details form that fills as
 * fields are filled (detailsFilled in lib/cardChecklist.ts). Encouragement
 * only: an empty field blocks nothing, and Next is always there.
 *
 * Tells Clarity `details_progress` when the host's typing first carries it
 * past 50 percent and past 100 percent, once each for the life of the page,
 * with the point reached as the `details_progress_pct` tag. A card that opens
 * already past a point (a restored draft) does not send it for that point.
 */
export default function DetailsProgress({
  draft,
  occasionId,
}: {
  draft: EventDraft;
  occasionId: OccasionId;
}): ReactElement {
  const { filled, total } = detailsFilled(draft, occasionId);
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);

  /* Where the bar stood when the page opened, and the points already sent. */
  const startedAt = useRef(percent);
  const sent = useRef(new Set<number>());

  useEffect(() => {
    for (const point of MILESTONES) {
      if (percent >= point && startedAt.current < point && !sent.current.has(point)) {
        sent.current.add(point);
        claritySet("details_progress_pct", String(point));
        clarityEvent("details_progress");
      }
    }
  }, [percent]);

  return (
    <div data-details-progress="" className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
        <span id="details-progress-label">Details filled</span>
        <span className="tabular-nums" aria-hidden="true">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="details-progress-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} percent`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--lifafa-hairline)]"
      >
        <span
          className="block h-full rounded-full bg-[var(--lifafa-marigold)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
