import type { ReactElement } from "react";
import {
  LoadingRegion,
  SkeletonLine,
  SkeletonTable,
} from "@/components/admin/Feedback";

/**
 * Shown while a page of events is counted and fetched.
 *
 * Two round trips — an exact count and a slice — so this is reachable on every
 * filter change and every page step, not only on a cold start. The filter bar
 * is drawn as a skeleton too: it is part of the page, so leaving it out would
 * make the controls jump into place a moment after the table.
 */
export default function AdminEventsLoading(): ReactElement {
  return (
    <LoadingRegion label="Loading events">
      <SkeletonLine className="h-6 w-28" />
      <SkeletonLine className="mt-2 h-4 w-80" />

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3">
        <SkeletonLine className="h-9 min-w-[12rem] flex-1" />
        <SkeletonLine className="h-9 w-28" />
        <SkeletonLine className="h-9 w-32" />
        <SkeletonLine className="h-9 w-32" />
        <SkeletonLine className="h-9 w-20" />
      </div>

      <SkeletonTable rows={10} />
    </LoadingRegion>
  );
}
