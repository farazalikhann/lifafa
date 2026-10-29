import type { ReactElement } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/admin/Feedback";

/** Shown while the help messages are read. */
export default function AdminHelpLoading(): ReactElement {
  return (
    <LoadingRegion label="Loading help messages">
      <SkeletonLine className="h-6 w-48" />
      <SkeletonLine className="mt-2 h-4 w-80 max-w-full" />
      <SkeletonLine className="mt-5 h-10 w-72 max-w-full" />
      <SkeletonLine className="mt-3 h-10 w-full" />
      <SkeletonLine className="mt-4 h-20 w-full" />
      <SkeletonLine className="mt-2 h-20 w-full" />
      <SkeletonLine className="mt-2 h-20 w-full" />
    </LoadingRegion>
  );
}
