import Link from "next/link";
import type { ReactElement } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import { Stat, StatSection } from "@/components/admin/StatGrid";
import { requireAdminSession } from "@/lib/admin/auth";
import { getCouponReport, type CouponPayment } from "@/lib/admin/coupons";
import { describeDiscount } from "@/lib/coupons/quote";
import { formatInr } from "@/lib/pricing";

/**
 * What one code has done, and what it owes. Read only.
 *
 * EVERY FIGURE COMES FROM THE PAYMENTS, not from coupons.used_count. The two
 * can disagree when a limited code is captured twice in the same instant, and
 * when they do the payments are the side that corresponds to money — see the
 * note on getCouponReport.
 */
export const dynamic = "force-dynamic";

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

function formatTimestamp(iso: string | null): string {
  if (iso === null) {
    return "—";
  }

  const parsed = new Date(iso);

  return Number.isNaN(parsed.getTime()) ? "—" : DATE_FORMAT.format(parsed);
}

/** Paise to the rupee string the rest of the dashboard uses. */
function paise(value: number): string {
  return formatInr(Math.round(value / 100));
}

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-100 text-green-800",
  created: "bg-zinc-100 text-zinc-600",
  failed: "bg-red-100 text-red-800",
};

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
        {paise(payment.amountPaise)}
      </td>
      <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600">
        {paise(payment.discountPaise)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
        {formatTimestamp(payment.createdAt)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
        {formatTimestamp(payment.paidAt)}
      </td>
      <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
        {payment.razorpayPaymentId ?? "—"}
      </td>
    </tr>
  );
}

export default async function AdminCouponPage({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<ReactElement> {
  const session = await requireAdminSession();
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
        <AdminHeader username={session.username} />
        <main className="mx-auto max-w-6xl px-5 py-10">
          <p
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {result.error}
          </p>
        </main>
      </>
    );
  }

  if (result.data === null) {
    return (
      <>
        <AdminHeader username={session.username} />
        <main className="mx-auto max-w-6xl px-5 py-10">
          <p className="text-sm text-zinc-600">No code by that name.</p>
          <Link
            href="/admin/coupons"
            className="mt-4 inline-block rounded text-sm text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Back to coupons
          </Link>
        </main>
      </>
    );
  }

  const { coupon, payments, ...totals } = result.data;
  const isAffiliate = coupon.type === "affiliate";

  return (
    <>
      <AdminHeader username={session.username} />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Link
          href="/admin/coupons"
          className="rounded text-sm text-blue-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          ← Coupons
        </Link>

        <h1 className="mt-3 font-mono text-xl font-semibold tracking-tight">
          {coupon.code}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {isAffiliate ? "Affiliate" : "Discount"} ·{" "}
          {describeDiscount(coupon.discountType, coupon.discountValue)}
          {coupon.ownerName === null ? null : ` · ${coupon.ownerName}`}
          {coupon.isActive ? "" : " · inactive"}
        </p>

        <StatSection title={isAffiliate ? "Affiliate earnings" : "Usage"}>
          <Stat
            label="Captured sales"
            value={totals.capturedSales}
            note="Payments that actually settled"
          />
          <Stat
            label="Revenue after discount"
            value={paise(totals.revenuePaise)}
            note="What was received"
          />
          <Stat
            label="Discount given"
            value={paise(totals.discountPaise)}
            note="What this code cost"
          />

          {isAffiliate ? (
            <Stat
              label="Commission owed"
              value={
                totals.commissionOwedPaise === null
                  ? "—"
                  : paise(totals.commissionOwedPaise)
              }
              note={
                coupon.commissionPerSale === null
                  ? "No commission set on this code"
                  : `${totals.capturedSales} × ${paise(coupon.commissionPerSale)}`
              }
            />
          ) : null}

          <Stat
            label="Counted uses"
            value={`${coupon.usedCount} / ${coupon.maxUses ?? "∞"}`}
            /*
              Said on the tile, because the two numbers above and this one can
              legitimately differ and an admin comparing them deserves to know
              why before they go looking for a bug.
            */
            note="From the coupon row, not the payments"
          />
        </StatSection>

        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
            Payments ({payments.length})
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Every order placed with this code. Unsettled and failed attempts are
            listed and excluded from the totals above.
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
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-zinc-500"
                    >
                      This code has not been used yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <PaymentRow key={payment.id} payment={payment} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </>
  );
}
