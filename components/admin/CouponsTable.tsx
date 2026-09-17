import Link from "next/link";
import type { ReactElement } from "react";
import { setCouponActive } from "@/app/admin/coupons/actions";
import { EmptyRow } from "@/components/admin/Feedback";
import { formatIstDate } from "@/lib/admin/format";
import { describeDiscount } from "@/lib/coupons/quote";
import type { AdminCoupon } from "@/lib/admin/coupons";

/**
 * Every code, with its state and one control.
 *
 * A SERVER COMPONENT. Nothing here needs client state: the toggle is a form
 * posting to a server action, which is a real submit rather than a fetch — so
 * it works with JavaScript off, and the page re-renders from the database
 * afterwards rather than from something this component guessed.
 *
 * A form and not a link, for the reason the shell's sign-out is a form: a
 * link is a GET, and a GET that deactivates a coupon is one a prefetch or a
 * link scanner can fire without anyone clicking it.
 */

/**
 * An expiry, or the word for not having one.
 *
 * "Never" rather than the shared formatter's em dash: a null expires_at means
 * the code runs forever, which is a fact, where an em dash reads as a value
 * somebody forgot to fill in.
 */
function formatExpiry(iso: string | null): string {
  return iso === null ? "Never" : formatIstDate(iso);
}

/** Whether an expiry has already passed, so the row can say so. */
function hasExpired(iso: string | null): boolean {
  return iso !== null && new Date(iso).getTime() <= Date.now();
}

export default function CouponsTable({
  coupons,
}: {
  coupons: readonly AdminCoupon[];
}): ReactElement {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-left">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Code
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Type
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Discount
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              Uses
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              Expires
            </th>
            <th scope="col" className="px-4 py-2.5 font-medium">
              State
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {coupons.length === 0 ? (
            <EmptyRow
              colSpan={7}
              title="No codes yet."
              hint="Create one with the form above."
            />
          ) : (
            coupons.map((coupon) => {
              const expired = hasExpired(coupon.expiresAt);
              const exhausted =
                coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

              return (
                <tr
                  key={coupon.id}
                  className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-2.5">
                    {/*
                      Every code links to its report, not only affiliates. A
                      discount code's payments are worth seeing too — "did
                      anyone actually use it" is the first question asked of one.
                    */}
                    <Link
                      href={`/admin/coupons/${coupon.code}`}
                      className="rounded font-mono font-medium text-blue-700 underline decoration-transparent underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                      {coupon.code}
                    </Link>
                  </td>

                  <td className="px-4 py-2.5 text-zinc-600">
                    {coupon.type === "affiliate" ? (
                      <>
                        Affiliate
                        {coupon.ownerName === null ? null : (
                          <span className="text-zinc-500">
                            {" "}
                            · {coupon.ownerName}
                          </span>
                        )}
                      </>
                    ) : (
                      "Discount"
                    )}
                  </td>

                  <td className="px-4 py-2.5 text-zinc-600">
                    {describeDiscount(coupon.discountType, coupon.discountValue)}
                  </td>

                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {coupon.usedCount}
                    <span className="text-zinc-500">
                      {" / "}
                      {coupon.maxUses ?? "∞"}
                    </span>
                  </td>

                  <td className="px-4 py-2.5 whitespace-nowrap text-zinc-600">
                    {formatExpiry(coupon.expiresAt)}
                  </td>

                  <td className="px-4 py-2.5">
                    <StateBadge
                      isActive={coupon.isActive}
                      expired={expired}
                      exhausted={exhausted}
                    />
                  </td>

                  <td className="px-4 py-2.5 text-right">
                    {/*
                      The code and the target state both travel in the form, so
                      the action reads what to do rather than inferring it from
                      a row it cannot see.
                    */}
                    <form action={setCouponActive}>
                      <input type="hidden" name="code" value={coupon.code} />
                      <input
                        type="hidden"
                        name="active"
                        value={coupon.isActive ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="min-h-8 rounded-md border border-zinc-300 px-3 text-xs font-medium whitespace-nowrap transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                      >
                        {coupon.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Why a code is or is not usable right now.
 *
 * Three separate facts rather than one boolean, because they need different
 * actions: an inactive code was switched off on purpose, an expired one needs a
 * new code, and an exhausted one needs a higher limit — which, since the limit
 * is not editable, also means a new code.
 */
function StateBadge({
  isActive,
  expired,
  exhausted,
}: {
  isActive: boolean;
  expired: boolean;
  exhausted: boolean;
}): ReactElement {
  if (!isActive) {
    return (
      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
        Inactive
      </span>
    );
  }

  if (expired) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Expired
      </span>
    );
  }

  if (exhausted) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        Fully used
      </span>
    );
  }

  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      Active
    </span>
  );
}
