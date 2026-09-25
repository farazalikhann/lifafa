import type { ReactElement } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/admin/Feedback";

/** Shown while a search for an event runs. */
export default function AdminComplimentaryLoading(): ReactElement {
  return (
    <LoadingRegion label="Searching events">
      <SkeletonLine className="h-6 w-36" />
      <SkeletonLine className="mt-2 h-4 w-96" />

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3">
        <SkeletonLine className="h-9 min-w-[14rem] flex-1" />
        <SkeletonLine className="h-9 w-16" />
      </div>

      <SkeletonLine className="mt-4 h-24 w-full" />
    </LoadingRegion>
  );
}
