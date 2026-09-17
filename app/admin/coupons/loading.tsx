import type { ReactElement } from "react";
import {
  LoadingRegion,
  SkeletonLine,
  SkeletonTable,
} from "@/components/admin/Feedback";

/** Shown while the coupon list loads. Mirrors the form and the table under it. */
export default function AdminCouponsLoading(): ReactElement {
  return (
    <LoadingRegion label="Loading coupons">
      <SkeletonLine className="h-6 w-28" />
      <SkeletonLine className="mt-2 h-4 w-96" />

      <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
        <SkeletonLine className="h-4 w-20" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <SkeletonLine className="h-3 w-16" />
              <SkeletonLine className="mt-1.5 h-9 w-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonTable rows={5} />
      </div>
    </LoadingRegion>
  );
}
