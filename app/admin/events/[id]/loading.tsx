import type { ReactElement } from "react";
import {
  LoadingRegion,
  SkeletonLine,
  SkeletonStats,
  SkeletonTable,
} from "@/components/admin/Feedback";

/**
 * Shown while one event and its whole guest list load.
 *
 * The slowest page in the admin: the guest read is paged, so an event with
 * thousands of replies is several round trips before anything can render.
 */
export default function AdminEventDetailLoading(): ReactElement {
  return (
    <LoadingRegion label="Loading this event">
      <SkeletonLine className="h-4 w-24" />
      <SkeletonLine className="mt-4 h-6 w-64" />
      <SkeletonLine className="mt-2 h-4 w-52" />

      <div className="mt-8">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonStats />
      </div>

      <div className="mt-8">
        <SkeletonLine className="h-3 w-14" />
        <div className="mt-3 space-y-px rounded-lg border border-zinc-200 bg-white p-4">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonLine key={index} className="h-4 w-full" />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SkeletonLine className="h-3 w-16" />
        <SkeletonTable rows={8} />
      </div>
    </LoadingRegion>
  );
}
