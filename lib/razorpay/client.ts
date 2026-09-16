import Razorpay from "razorpay";

/*
  ────────────────────────────────────────────────────────────────────────────
  GUARD — the same one lib/supabase/admin.ts opens with, for the same reason.

  RAZORPAY_KEY_SECRET signs API calls against the account. Anyone holding it can
  create orders, issue refunds and read every payment the account has ever
  taken. So the one rule this file exists to enforce is that it never runs
  anywhere a browser can see.

  `typeof window` is the check because it is the difference that survives
  bundling: if this module is ever pulled into a Client Component, the import
  graph drags it into the browser bundle and this line throws on load — loudly,
  at the top of the module, rather than quietly shipping a secret. A build that
  boots is a build where nothing client-side imports it.

  The browser needs no part of this. It needs the publishable key id, which is
  in lib/razorpay/keys.ts, and an order id, which a server action hands it.
  ────────────────────────────────────────────────────────────────────────────
*/
if (typeof window !== "undefined") {
  throw new Error(
    "lib/razorpay/client.ts was imported into client code. This module holds the Razorpay key secret and must only ever run on the server.",
  );
}

/**
 * The Razorpay API client.
 *
 * WHY THE KEY SECRET CANNOT REACH THE BROWSER BUNDLE, in three layers:
 *
 *  1. The variable is named RAZORPAY_KEY_SECRET, with no NEXT_PUBLIC_ prefix.
 *     Next inlines exactly and only `NEXT_PUBLIC_*` into client bundles; every
 *     other `process.env` lookup compiles to undefined there. The name is the
 *     protection, so never rename this to NEXT_PUBLIC_ anything.
 *  2. Both values are read inside the factory rather than at module scope, so
 *     neither is captured in a constant a bundler could fold into output.
 *  3. The guard above throws if this module is evaluated in a browser at all.
 *
 * A FACTORY, NOT A SINGLETON. A module-level instance would be constructed when
 * the module is first imported, which on a serverless runtime is whenever the
 * platform feels like it — including in a build step that has no environment
 * variables and would therefore throw during `next build`. Constructing per
 * call costs nothing measurable next to the HTTPS round trip that follows.
 *
 * NOTE ON THE DEPENDENCY. This package is used for exactly one call — creating
 * an order — and nothing else in Lifafa touches it. The webhook verifies its
 * own signatures with node:crypto in lib/razorpay/webhook.ts rather than going
 * through the SDK's helper, so the SDK is not on the path of anything
 * security-critical. That is deliberate: it keeps this file the only thing that
 * would have to change to drop the dependency for a plain fetch.
 */
export function createRazorpayClient(): Razorpay {
  const keyId = (process.env.RAZORPAY_KEY_ID ?? "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET ?? "").trim();

  /*
    Reported by name and never by value — a thrown message ends up in server
    logs, and a log line is exactly the wrong place for either of these.
  */
  if (keyId.length === 0) {
    throw new Error("RAZORPAY_KEY_ID is not set.");
  }

  if (keySecret.length === 0) {
    throw new Error("RAZORPAY_KEY_SECRET is not set.");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
