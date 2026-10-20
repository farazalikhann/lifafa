import { createClient } from "@/lib/supabase/server";

/**
 * The Razorpay payment that has just published an invitation, for the ads'
 * Purchase event on its dashboard (components/dashboard/MetaPurchase.tsx).
 *
 * NOT A "use server" FILE: every export of one is an endpoint a browser can
 * call. This is for the dashboard page, which has already read the event.
 *
 * READ UNDER THE HOST'S OWN SESSION. payments_select_own (0009) shows a host
 * the rows of their own invitations and no others, so nothing here checks
 * ownership: another host's id matches nothing.
 *
 * ONLY MONEY THAT WAS TAKEN. A paid row (the webhook, or the owner publishing
 * a reviewed one, settled it) with method 'razorpay': a free code or a
 * complimentary activation is a row of its own method and is never counted,
 * and a payment still under review is a row that is not paid yet. `amount` is
 * what the order charged, after any coupon.
 *
 * ONLY FOR TWO DAYS after it settled. The browser remembers which payments it
 * has reported, but a host who opens the dashboard on another phone has a
 * browser that does not; two days is the window in which Meta dedupes on the
 * eventID, so a second report from there is dropped, and after it nothing is
 * read or sent at all. There is no column for "reported": no host may write
 * to payments, and the window makes one unnecessary.
 */

const PURCHASE_REPORT_WINDOW_MS = 48 * 60 * 60 * 1000;

export interface ConfirmedPayment {
  paymentId: string;
  amountPaise: number;
}

export async function recentRazorpayPayment(
  eventId: string,
): Promise<ConfirmedPayment | null> {
  const supabase = await createClient();
  const since = new Date(Date.now() - PURCHASE_REPORT_WINDOW_MS).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .select("razorpay_payment_id, amount")
    .eq("event_id", eventId)
    .eq("status", "paid")
    .eq("method", "razorpay")
    .not("razorpay_payment_id", "is", null)
    .gt("paid_at", since)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error !== null) {
    /* Nothing is reported, and the page is not the worse for it. */
    console.error("[db] recentRazorpayPayment:", error);
    return null;
  }

  if (data === null || data.razorpay_payment_id === null || data.amount <= 0) {
    return null;
  }

  return { paymentId: data.razorpay_payment_id, amountPaise: data.amount };
}
