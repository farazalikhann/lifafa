import type { ReactElement } from "react";
import { LoadingRegion, SkeletonLine } from "@/components/admin/Feedback";

/** Shown while the payments to review are read. */
export default function AdminPaymentsLoading(): ReactElement {
  return (
    <LoadingRegion label="Loading payments to review">
      <SkeletonLine className="h-6 w-48" />
      <SkeletonLine className="mt-2 h-4 w-96" />
      <SkeletonLine className="mt-6 h-40 w-full" />
    </LoadingRegion>
  );
}
