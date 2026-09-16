/**
 * The shape of Razorpay's checkout.js, as this application uses it.
 *
 * WRITTEN BY HAND because there is nothing to import. The brief is explicit
 * that no browser SDK package is to be added, and it is right: checkout.js is
 * loaded from Razorpay's own domain at runtime — that is the only supported way
 * to open a checkout, and an npm wrapper around it would still be loading the
 * same remote script, while adding a package that can fall out of step with it.
 *
 * So the script is a global, and a global with no types is `any` in disguise.
 * These declarations are the boundary: everything the checkout hands back
 * crosses into typed code here, and nowhere else in the codebase writes
 * `window as any`.
 *
 * Deliberately partial, in the same spirit as the webhook envelope in
 * lib/razorpay/webhook.ts. Razorpay's checkout takes a large options object;
 * Lifafa uses a fraction of it, and typing the rest would be a promise about
 * someone else's script that this codebase cannot keep.
 */

/** What the host is shown, and what comes back when they pay. */
export interface RazorpayCheckoutOptions {
  /** The publishable key id. Never the secret — see lib/razorpay/keys.ts. */
  key: string;
  /** Paise. Must match the order; the order is what actually decides. */
  amount: number;
  currency: string;
  name: string;
  description?: string;
  /** The order created server-side by createPaymentOrder. */
  order_id: string;
  /**
   * Called when the checkout believes the payment succeeded.
   *
   * ITS ARGUMENT IS DELIBERATELY UNUSED by this application. It carries a
   * payment id and a signature, and verifying that signature in the browser
   * would prove only that the browser was told something. Payment truth comes
   * from the webhook; see app/api/razorpay/webhook/route.ts.
   */
  handler?: () => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    /** Called when the host closes the checkout without paying. */
    ondismiss?: () => void;
    escape?: boolean;
  };
}

/** The failure Razorpay reports through `on("payment.failed", …)`. */
export interface RazorpayFailure {
  error?: {
    /** A short machine code, e.g. "BAD_REQUEST_ERROR". */
    code?: string;
    /** A sentence Razorpay wrote, sometimes fit to show a host. */
    description?: string;
    /** Which side of the transaction failed, e.g. "payment". */
    source?: string;
    /** Why, in Razorpay's vocabulary, e.g. "payment_failed". */
    reason?: string;
  };
}

/** The instance `new window.Razorpay(options)` returns. */
export interface RazorpayCheckout {
  open: () => void;
  on: (event: "payment.failed", handler: (failure: RazorpayFailure) => void) => void;
}

export type RazorpayConstructor = new (
  options: RazorpayCheckoutOptions,
) => RazorpayCheckout;

declare global {
  interface Window {
    /** Present only once checkout.js has loaded. Undefined before that. */
    Razorpay?: RazorpayConstructor;
  }
}
