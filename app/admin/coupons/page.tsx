import type { ReactElement } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import CouponForm from "@/components/admin/CouponForm";
import CouponsTable from "@/components/admin/CouponsTable";
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
  const session = await requireAdminSession();
  const result = await listCoupons();

  return (
    <>
      <AdminHeader username={session.username} />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <h1 className="text-xl font-semibold tracking-tight">Coupons</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Discount and affiliate codes. A use is counted only when a payment is
          captured.
        </p>

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
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {result.error}
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
