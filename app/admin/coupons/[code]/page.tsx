import Link from "next/link";
import type { ReactElement } from "react";
import { PageHeading } from "@/components/admin/AdminShell";
import { EmptyRow, EmptyState, ErrorNotice } from "@/components/admin/Feedback";
import { Stat, StatSection } from "@/components/admin/StatGrid";
import { requireAdminSession } from "@/lib/admin/auth";
import { getCouponReport, type CouponPayment } from "@/lib/admin/coupons";
import { formatCount, formatIst, formatPaise } from "@/lib/admin/format";
import { describeDiscount } from "@/lib/coupons/quote";

/**
 * What one code has done, and what it owes. Read only.
 *
 * EVERY FIGURE COMES FROM THE PAYMENTS, not from coupons.used_count. The two
 * can disagree when a limited code is captured twice in the same instant, and
 * when they do the payments are the side that corresponds to money — see the
 * note on getCouponReport.
 */
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  created: "bg-zinc-100 text-zinc-600",
  failed: "bg-red-100 text-red-800",
};

/** Back to the list, in the place every detail page keeps it. */
function BackLink(): ReactElement {
  return (
    <Link
      href="/admin/coupons"
      className="rounded text-sm text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
    >
      ← Coupons
    </Link>
  );
}

function PaymentRow({ payment }: { payment: CouponPayment }): ReactElement {
  return (
    <tr className="border-b border-zinc-100 last:border-b-0">
      <td className="px-4 py-2.5">
        <Link
          href={`/admin/events/${payment.eventId}`}
          className="rounded font-medium text-blue-700 underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          {payment.eventTitle}
        </Link>
      </td>
      <td className="px-4 py-2.5">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            STATUS_STYLES[payment.status] ?? "bg-zinc-100 text-zinc-600"
          }`}
        >
          {payment.status}
        </span>
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums">
        {formatPaise(payment.amountPaise)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">
        {formatPaise(payment.discountPaise)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
        {formatIst(payment.createdAt)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
        {formatIst(payment.paidAt)}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
        {payment.razorpayPaymentId ?? "–"}
      </td>
    </tr>
  );
}

export default async function AdminCouponPage({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<ReactElement> {
  await requireAdminSession();
  const { code } = await params;

  /*
    Decoded before it reaches the database. A code is [A-Z0-9-] so nothing here
    needs escaping, but a path segment arrives percent-encoded and a code typed
    into the URL bar with a space would otherwise never match.
  */
  const result = await getCouponReport(decodeURIComponent(code));

  if (!result.ok) {
    return (
      <>
        <BackLink />
        <div className="mt-4">
          <ErrorNotice message={result.error} />
        </div>
      </>
    );
  }

  if (result.data === null) {
    return (
      <>
        <BackLink />
        <div className="mt-4">
          <EmptyState
            title="No code by that name."
            hint="It may have been mistyped, or never created."
          />
        </div>
      </>
    );
  }

  const { coupon, payments, ...totals } = result.data;
  const isAffiliate = coupon.type === "affiliate";

  return (
    <>
      <BackLink />

      <div className="mt-3">
        <PageHeading
          title={coupon.code}
          description={`${isAffiliate ? "Affiliate" : "Discount"} · ${describeDiscount(
            coupon.discountType,
            coupon.discountValue,
          )}${coupon.ownerName === null ? "" : ` · ${coupon.ownerName}`}${
            coupon.isActive ? "" : " · inactive"
          }`}
        />
      </div>

      <StatSection title={isAffiliate ? "Affiliate earnings" : "Usage"}>
        {/*
          The money that arrived is the primary figure. "Captured sales" is a
          count and "commission owed" is derived from it; revenue is the one
          somebody is here to read.
        */}
        <Stat
          label="Revenue after discount"
          value={formatPaise(totals.revenuePaise)}
          note="What was actually received"
          emphasis="primary"
        />
        <Stat
          label="Captured sales"
          value={totals.capturedSales}
          note="Payments that settled"
        />
        <Stat
          label="Discount given"
          value={formatPaise(totals.discountPaise)}
          note="What this code cost"
        />

        {isAffiliate ? (
          <Stat
            label="Commission owed"
            value={
              totals.commissionOwedPaise === null
                ? "–"
                : formatPaise(totals.commissionOwedPaise)
            }
            note={
              coupon.commissionPerSale === null
                ? "No commission set on this code"
                : `${formatCount(totals.capturedSales)} × ${formatPaise(
                    coupon.commissionPerSale,
                  )}`
            }
          />
        ) : null}

        <Stat
          label="Counted uses"
          value={`${formatCount(coupon.usedCount)} / ${
            coupon.maxUses === null ? "∞" : formatCount(coupon.maxUses)
          }`}
          /*
            Said on the tile, because the two numbers above and this one can
            legitimately differ and an admin comparing them deserves to know
            why before they go looking for a bug.
          */
          note="From the coupon row, not the payments"
        />
      </StatSection>

      <section className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Payments
          </h2>
          <p className="text-xs text-zinc-500">
            {formatCount(payments.length)}{" "}
            {payments.length === 1 ? "order" : "orders"} placed ·{" "}
            {formatCount(totals.capturedSales)} captured
          </p>
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          Unsettled and failed attempts are listed and excluded from the totals
          above.
        </p>

        <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left">
              <tr>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Event
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Charged
                </th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">
                  Discount
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Ordered
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Paid
                </th>
                <th scope="col" className="px-4 py-2.5 font-medium">
                  Razorpay id
                </th>
              </tr>
            </thead>

            <tbody>
              {payments.length === 0 ? (
                <EmptyRow
                  colSpan={7}
                  title="This code has not been used yet."
                  hint="Orders placed with it will appear here."
                />
              ) : (
                payments.map((payment) => (
                  <PaymentRow key={payment.id} payment={payment} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
