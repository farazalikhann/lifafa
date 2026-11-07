import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { mayPayTestPrice, parseTestPriceEmails } from "@/lib/checkoutPrice";

/**
 * Who may pay a test price (lib/checkoutPrice.ts), read from TEST_PRICE_EMAILS.
 *
 * SERVER ONLY, and a plain module rather than "use server": every export of
 * one of those is an endpoint, and "may this account pay ₹1" must not be one.
 * The list has no NEXT_PUBLIC_ prefix, so it never reaches a browser bundle,
 * and the guard below stops this file being imported into one.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "lib/testPriceAccess.ts was imported into client code. It decides who may pay a test price and must only ever run on the server.",
  );
}

function allowedEmails(): ReadonlySet<string> {
  return parseTestPriceEmails(process.env.TEST_PRICE_EMAILS);
}

/** Whether the signed-in user may pay a test price. */
export function accountMayPayTestPrice(user: User): boolean {
  return mayPayTestPrice(user, allowedEmails());
}

/**
 * Whether the host of an invitation may pay a test price, for the webhook,
 * which has a host id and no session. Null when the account could not be
 * read: the webhook answers 500 and Razorpay sends the capture again.
 */
export async function hostMayPayTestPrice(hostId: string): Promise<boolean | null> {
  const allowed = allowedEmails();

  /* Nobody is on the list, so there is nobody to look up. */
  if (allowed.size === 0) {
    return false;
  }

  const { data, error } = await createAdminClient().auth.admin.getUserById(hostId);

  if (error !== null) {
    if (error.status === 404) {
      return false;
    }

    console.error(`[payments] could not read host ${hostId} for a test price:`, error);
    return null;
  }

  return mayPayTestPrice(data.user, allowed);
}
