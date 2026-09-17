import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseCouponCode } from "@/lib/coupons/lookup";
import { dbFailure, dbSuccess, type DbResult } from "@/lib/db/result";
import type { CouponRow, CouponType } from "@/types/database";

/**
 * Every coupon read the admin dashboard performs.
 *
 * SAME BOUNDARY AS lib/admin/stats.ts, and for the same reason: the service
 * client bypasses RLS, so what keeps these functions honest is that nothing
 * here is exported to a client component, nothing takes a filter from the
 * browser, and every caller is a server component or action that has already
 * been past requireAdminSession().
 *
 * It matters more here than there. public.coupons has RLS enabled with no
 * policy at all (0010), so this module and the checkout's lookup are the only
 * two paths in the codebase that can see the table — which means the gate in
 * front of these calls is not one lock among several, it is the lock.
 */

/** A coupon as the admin list shows it. Plain values; crosses to a table. */
export interface AdminCoupon {
  id: string;
  code: string;
  type: CouponType;
  discountType: CouponRow["discount_type"];
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  ownerName: string | null;
  commissionPerSale: number | null;
  createdAt: string;
}

function toAdminCoupon(row: CouponRow): AdminCoupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    ownerName: row.owner_name,
    commissionPerSale: row.commission_per_sale,
    createdAt: row.created_at,
  };
}

/**
 * Every code, newest first.
 *
 * Unpaged, and that is a considered limit rather than an oversight: coupons are
 * written by hand by one person, so a deployment with more than PostgREST's
 * thousand-row default is a deployment where somebody has been scripting. The
 * guest and payment reads in lib/admin/stats.ts page properly because those
 * grow on their own.
 */
export async function listCoupons(): Promise<DbResult<AdminCoupon[]>> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error !== null) {
    return dbFailure("admin/listCoupons", error, "Could not load the coupons.");
  }

  return dbSuccess((data ?? []).map(toAdminCoupon));
}

/** One code by its code, or null. */
export async function getCoupon(
  rawCode: string,
): Promise<DbResult<AdminCoupon | null>> {
  const code = normaliseCouponCode(rawCode);

  if (code.length === 0) {
    return dbSuccess(null);
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("coupons")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (error !== null) {
    return dbFailure("admin/getCoupon", error, "Could not load this coupon.");
  }

  return dbSuccess(data === null ? null : toAdminCoupon(data));
}

/* ─────────────────────── The affiliate report ─────────────────────── */

/** One payment made with a code, as the report lists it. */
export interface CouponPayment {
  id: string;
  eventId: string;
  /** The event's title, or the best name available. */
  eventTitle: string;
  /** Paise actually charged, after the discount. */
  amountPaise: number;
  /** Paise taken off by the code. */
  discountPaise: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  razorpayPaymentId: string | null;
}

export interface CouponReport {
  coupon: AdminCoupon;
  /** Payments that were actually captured. The only ones money moved for. */
  capturedSales: number;
  /** Paise received across those, after discount. */
  revenuePaise: number;
  /** Paise taken off across those. */
  discountPaise: number;
  /**
   * Paise owed to the affiliate: captured sales times commission_per_sale.
   *
   * Null for a discount code, which owes nobody anything, and for an affiliate
   * code with no commission set — which is different from zero and should read
   * that way.
   */
  commissionOwedPaise: number | null;
  /** Every payment carrying the code, captured or not, newest first. */
  payments: readonly CouponPayment[];
}

/**
 * What one code has actually done.
 *
 * COUNTED FROM PAYMENTS, NOT FROM used_count. The two can disagree — see the
 * note on countCouponUse in lib/db/applyPayment.ts, where a race on the last
 * remaining use is honoured and not counted — and when they do, the payments
 * are the ones that correspond to money. An affiliate paid from a counter
 * rather than from captured sales would be paid the wrong amount in exactly the
 * case that is hardest to notice.
 *
 * `status = 'paid'` is the filter that matters. A row is written the moment an
 * order is created, so unsettled and abandoned checkouts are in this table too;
 * they are listed, because "eleven people tried and two paid" is worth seeing,
 * and they are excluded from every total.
 */
export async function getCouponReport(
  rawCode: string,
): Promise<DbResult<CouponReport | null>> {
  const couponResult = await getCoupon(rawCode);

  if (!couponResult.ok) {
    return couponResult;
  }

  if (couponResult.data === null) {
    return dbSuccess(null);
  }

  const coupon = couponResult.data;
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("payments")
    .select(
      "id, event_id, amount, discount_amount, status, created_at, paid_at, razorpay_payment_id",
    )
    .eq("coupon_code", coupon.code)
    .order("created_at", { ascending: false });

  if (error !== null) {
    return dbFailure(
      "admin/getCouponReport",
      error,
      "Could not load this coupon's payments.",
    );
  }

  const rows = data ?? [];

  /*
    TWO QUERIES RATHER THAN AN EMBED, which is the same choice getRecentEvents
    makes in lib/admin/stats.ts. PostgREST could join payments to events on the
    foreign key, but the titles live inside the event_draft jsonb and a jsonb
    accessor nested inside an embed is more of PostgREST's grammar than this
    page is worth betting on. Two plain reads behave identically on every
    version.
  */
  const titles = await eventTitles(
    admin,
    rows.map((row) => row.event_id),
  );

  const payments: CouponPayment[] = rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    /*
      payments.event_id cascades on delete, so a payment whose event is gone
      does not exist — but a page that throws on a shape it did not expect is
      worse than one that says so.
    */
    eventTitle: titles.get(row.event_id) ?? "(deleted event)",
    amountPaise: row.amount,
    discountPaise: row.discount_amount,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    razorpayPaymentId: row.razorpay_payment_id,
  }));

  const captured = payments.filter((payment) => payment.status === "paid");

  return dbSuccess({
    coupon,
    capturedSales: captured.length,
    revenuePaise: captured.reduce((sum, p) => sum + p.amountPaise, 0),
    discountPaise: captured.reduce((sum, p) => sum + p.discountPaise, 0),
    commissionOwedPaise:
      coupon.type === "affiliate" && coupon.commissionPerSale !== null
        ? captured.length * coupon.commissionPerSale
        : null,
    payments,
  });
}

/**
 * Titles for a set of event ids, as one query.
 *
 * Selects the jsonb FIELD rather than the column holding it: an event_draft is
 * a large object and this needs one string out of it. Empty map for an empty
 * list, without a round trip — `.in("id", [])` is a query asking for nothing.
 */
async function eventTitles(
  admin: ReturnType<typeof createAdminClient>,
  ids: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];

  if (unique.length === 0) {
    return new Map();
  }

  const { data, error } = await admin
    .from("events")
    .select("id, title:event_draft->>eventTitle")
    .in("id", unique);

  if (error !== null) {
    /*
      Not fatal. The report is about money, and every figure on it comes from
      the payments rows already in hand; a missing title costs a label.
    */
    console.error("[admin] could not read event titles:", error);
    return new Map();
  }

  const titles = new Map<string, string>();

  for (const row of data ?? []) {
    const title = (row.title ?? "").trim();
    titles.set(row.id, title.length > 0 ? title : "Untitled");
  }

  return titles;
}
