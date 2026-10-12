import Link from "next/link";
import type { ReactElement } from "react";
import { PageHeading } from "@/components/admin/AdminShell";
import { EmptyState, ErrorNotice } from "@/components/admin/Feedback";
import PublishReviewedButton from "@/components/admin/PublishReviewedButton";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatIst } from "@/lib/admin/format";
import { listPaymentsUnderReview } from "@/lib/admin/paymentReview";
import { formatPrice } from "@/lib/pricing";

/**
 * Payments to review: a host paid, and the webhook would not publish.
 *
 * Either what was captured is not what the order asked for, or the order was
 * priced for a cheaper template than the invitation is on now (see
 * applyCapturedPayment in lib/db/applyPayment.ts). The host is shown that the
 * payment is being verified and cannot pay again; each row here is waiting for
 * one of two things: Publish event, below, or a refund made in Razorpay.
 *
 * The figures the email carried are here again, except the amount captured,
 * which only Razorpay holds: the row keeps what the order asked for.
 */
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage(): Promise<ReactElement> {
  await requireAdminSession();

  const result = await listPaymentsUnderReview();

  return (
    <>
      <PageHeading
        title="Payments to review"
        description="Payments that were captured and not applied. The host sees that the payment is being verified. Check each one in Razorpay, then publish the event or refund it there."
      />

      <div className="mt-6">
        {!result.ok ? (
          <ErrorNotice message={result.error} />
        ) : result.data.length === 0 ? (
          <EmptyState
            title="Nothing to review."
            hint="A payment appears here when its amount does not match its invitation."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {result.data.map((payment) => {
              const listPaise = payment.orderPaise + payment.discountPaise;

              return (
                <li
                  key={payment.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4"
                >
                  <div className="min-w-0">
                    {payment.eventTitle === null ? (
                      <p className="font-medium text-zinc-900">
                        Event deleted
                      </p>
                    ) : (
                      <Link
                        href={`/admin/events/${payment.eventId}`}
                        className="font-medium break-words text-blue-700 underline underline-offset-2"
                      >
                        {payment.eventTitle}
                      </Link>
                    )}
                    <p className="mt-1 text-xs break-words text-zinc-500">
                      {payment.inviteCode === null ? null : (
                        <>
                          <code>{payment.inviteCode}</code> ·{" "}
                        </>
                      )}
                      {payment.hostEmail ?? "no email"} · ordered{" "}
                      {formatIst(payment.createdAt)}
                    </p>
                  </div>

                  <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <Fact label="Event id" value={payment.eventId} mono />
                    <Fact label="Payment id" value={payment.paymentId} mono />
                    <Fact label="Order id" value={payment.orderId ?? "none"} mono />
                    <Fact
                      label="Order asked for"
                      value={
                        payment.couponCode === null
                          ? formatPrice(payment.orderPaise)
                          : `${formatPrice(payment.orderPaise)} (list ${formatPrice(listPaise)}, code ${payment.couponCode})`
                      }
                    />
                    <Fact
                      label="Template price now"
                      value={`${formatPrice(payment.pricePaise)} (${payment.templateName})`}
                    />
                    <Fact
                      label="Why it is here"
                      value={
                        listPaise < payment.pricePaise
                          ? "Ordered for a cheaper template than the invitation is on now."
                          : "The amount captured is not the amount ordered. See the payment in Razorpay."
                      }
                    />
                  </dl>

                  <div className="mt-4">
                    {payment.eventTitle === null ? (
                      <p className="text-sm text-zinc-500">
                        There is no invitation to publish. Refund this payment
                        in Razorpay.
                      </p>
                    ) : (
                      <PublishReviewedButton
                        paymentRowId={payment.id}
                        alreadyLive={payment.eventIsPaid}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

function Fact({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): ReactElement {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd
        className={`break-all text-zinc-900 ${mono ? "font-mono text-xs" : "break-words"}`}
      >
        {value}
      </dd>
    </div>
  );
}
