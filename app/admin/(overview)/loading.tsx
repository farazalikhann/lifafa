import type { ReactElement } from "react";
import {
  LoadingRegion,
  SkeletonLine,
  SkeletonStats,
  SkeletonTable,
} from "@/components/admin/Feedback";

/**
 * Shown while the overview's queries run.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS. The overview fires a dozen counts, a fortnight of
 * timestamps and two table reads. That is fast against a warm database and
 * several seconds against a cold one — and with nothing here, those seconds
 * were a blank page. A blank page and a broken page look identical, so the
 * honest thing is to show the shape of what is coming.
 *
 * The sidebar and header are NOT here, and that is the point of having moved
 * them into app/admin/layout.tsx: Next keeps the layout mounted and swaps only
 * this in, so the chrome stays put and only the content pulses.
 *
 * It mirrors the real page's structure rather than showing a spinner, because
 * a skeleton that matches means nothing jumps when the data lands.
 *
 * WHY THIS SITS IN AN (overview) ROUTE GROUP. A loading.tsx applies to its
 * segment AND to everything nested under it, so at app/admin/ this file was the
 * fallback for /admin/login, /admin/events and /admin/coupons too — the sign-in
 * page briefly rendered a skeleton of a dashboard the reader had not been let
 * into yet. The group keeps the URL at /admin and narrows the boundary to the
 * one page this skeleton actually describes.
 * ────────────────────────────────────────────────────────────────────────────
 */
export default function AdminOverviewLoading(): ReactElement {
  return (
    <LoadingRegion label="Loading the overview">
      <SkeletonLine className="h-6 w-40" />
      <SkeletonLine className="mt-2 h-4 w-72" />

      <div className="mt-8">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonStats />
      </div>

      {/* The bar chart's plot area, at its real height so nothing reflows. */}
      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <SkeletonLine className="h-3 w-28" />
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {Array.from({ length: 14 }, (_, index) => (
            <div key={index} className="h-full flex-1 rounded-sm bg-zinc-100" />
          ))}
        </div>
      </div>

      <div className="mt-8">
        <SkeletonLine className="h-3 w-20" />
        <SkeletonStats />
      </div>

      <div className="mt-8">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonTable rows={5} />
      </div>
    </LoadingRegion>
  );
}
