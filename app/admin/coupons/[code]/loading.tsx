import type { ReactElement } from "react";
import {
  LoadingRegion,
  SkeletonLine,
  SkeletonStats,
  SkeletonTable,
} from "@/components/admin/Feedback";

/** Shown while one code's payments are read and totalled. */
export default function AdminCouponReportLoading(): ReactElement {
  return (
    <LoadingRegion label="Loading this coupon">
      <SkeletonLine className="h-4 w-20" />
      <SkeletonLine className="mt-4 h-6 w-40" />
      <SkeletonLine className="mt-2 h-4 w-56" />

      <div className="mt-8">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonStats />
      </div>

      <div className="mt-8">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonTable rows={5} />
      </div>
    </LoadingRegion>
  );
}
