import type { ReactElement } from "react";
import { PageHeading } from "@/components/admin/AdminShell";
import CouponForm from "@/components/admin/CouponForm";
import CouponsTable from "@/components/admin/CouponsTable";
import { ErrorNotice } from "@/components/admin/Feedback";
import { requireAdminSession } from "@/lib/admin/auth";
import { listCoupons } from "@/lib/admin/coupons";

/**
 * Coupon and affiliate codes. Create, list, switch off.
 *
 * No delete, deliberately — see the note on setCouponActive. A deactivated code
 * keeps its row and the payments that name it stay explainable.
 */
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage(): Promise<ReactElement> {
  /*
    Before any query runs, and independently of middleware.ts — see the note in
    lib/admin/auth.ts on why the gate is checked twice.
  */
  await requireAdminSession();
  const result = await listCoupons();

  return (
    <>
      <PageHeading
        title="Coupons"
        description="Discount and affiliate codes. A use is counted only when a payment is captured."
      />

      <div className="mt-6">
        <CouponForm />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
          All codes
        </h2>

        <div className="mt-3">
          {result.ok ? (
            <CouponsTable coupons={result.data} />
          ) : (
            <ErrorNotice message={result.error} />
          )}
        </div>
      </section>
    </>
  );
}
