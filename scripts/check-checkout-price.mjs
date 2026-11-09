/**
 * Checks that a checkout charges the server's own price, that a test price is
 * for allowlisted accounts only, and that a payment must match its order.
 *
 *   node scripts/check-checkout-price.mjs      (also run by npm run check:pixel)
 *
 * First the rules in lib/checkoutPrice.ts and lib/coupons/quote.ts, run as
 * they are (Node runs the TypeScript). Then the server code that uses them,
 * read as text: it imports Supabase and cannot run here, so this checks that
 * every place a price is decided still asks the rules.
 *
 * The browser half, that the pixel sends no InitiateCheckout or Purchase for a
 * test price, is in scripts/check-meta-pixel.mjs.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  captureRefusal,
  isTestPrice,
  mayPayTestPrice,
  parseTestPriceEmails,
  TEST_PRICE_BELOW_PAISE,
} from "../lib/checkoutPrice.ts";
import { quoteWithCoupon, RAZORPAY_MINIMUM_PAISE } from "../lib/coupons/quote.ts";
import { couponRefusal } from "../lib/coupons/usable.ts";
import { offerOpen, WEDDING10_OFFER } from "../lib/offers.ts";
import {
  LOWEST_PRICE_PAISE,
  PREMIUM_PRICE_PAISE,
  SHEESH_MAHAL_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
} from "../lib/pricing.ts";

/* ── The prices ─────────────────────────────────────────────────────────── */

for (const price of [TRADITIONS_PRICE_PAISE, PREMIUM_PRICE_PAISE, SHEESH_MAHAL_PRICE_PAISE]) {
  assert.equal(isTestPrice(price), false, `the list price ${price} is a test price`);
}
assert.ok(LOWEST_PRICE_PAISE >= TEST_PRICE_BELOW_PAISE, "an invitation costs less than a test price");
assert.ok(TEST_PRICE_BELOW_PAISE > RAZORPAY_MINIMUM_PAISE, "Rs 1 is not a test price");
assert.equal(isTestPrice(0), false, "a free code is a test price");

/* Coupons as they are stored (paise for flat, percent for percent). */
const coupon = (code, discount_type, discount_value) => ({ code, discount_type, discount_value });

const quotes = [
  /* Rs 998 off: Rs 1 on a Rs 999 card. The code behind the Rs 1 payment on 7 Nov 2026. */
  [coupon("FARAZ99", "flat", 99800), PREMIUM_PRICE_PAISE, 100, true],
  [coupon("FARAZ50", "flat", 94900), PREMIUM_PRICE_PAISE, 5000, true],
  /* A flat code a few paise short of the price is clamped up to Rs 1: a test price. */
  [coupon("NEARLY", "flat", 99850), PREMIUM_PRICE_PAISE, 100, true],
  [coupon("DIWALI10", "percent", 10), PREMIUM_PRICE_PAISE, 89910, false],
  [coupon("DIWALI10", "percent", 10), TRADITIONS_PRICE_PAISE, 62910, false],
  /* Rs 900 off a Rs 999 card is Rs 99: the lowest price an offer may make for anyone. */
  [coupon("OFFER99", "flat", 90000), PREMIUM_PRICE_PAISE, 9900, false],
  /* The whole price: free, activated without Razorpay, never a test price. */
  [coupon("FREE100", "percent", 100), PREMIUM_PRICE_PAISE, 0, false],
];

for (const [row, base, finalPaise, test] of quotes) {
  const quote = quoteWithCoupon(row, base);
  assert.equal(quote.finalPaise, finalPaise, `${row.code} on ${base}`);
  assert.equal(isTestPrice(quote.finalPaise), test, `${row.code} on ${base}: test price ${!test}`);
}

console.log(`Prices: list prices are never a test price; a code leaving under ${TEST_PRICE_BELOW_PAISE} paise is one.`);

/* ── WEDDING10: 10% off, until the end of 30 November 2026, India time ──── */

/* As the admin form stores it: percent, 10; the end of that day, IST (app/admin/coupons/actions.ts). */
const wedding10 = {
  ...coupon("WEDDING10", "percent", 10),
  is_active: true,
  expires_at: new Date("2026-11-30T23:59:59+05:30").toISOString(),
  max_uses: null,
  used_count: 4000,
};
const ist = (stamp) => new Date(`${stamp}+05:30`);

for (const [base, finalPaise] of [
  [TRADITIONS_PRICE_PAISE, 62910],
  [PREMIUM_PRICE_PAISE, 89910],
  [SHEESH_MAHAL_PRICE_PAISE, SHEESH_MAHAL_PRICE_PAISE - Math.floor(SHEESH_MAHAL_PRICE_PAISE / 10)],
]) {
  const quote = quoteWithCoupon(wedding10, base);
  assert.equal(quote.finalPaise, finalPaise, `WEDDING10 on ${base}`);
  assert.equal(quote.discountPaise, base - finalPaise);
  assert.equal(isTestPrice(quote.finalPaise), false, `WEDDING10 on ${base} is a test price`);
}

/* The offer ends when the coupon does, to the second. */
assert.equal(WEDDING10_OFFER.code, wedding10.code);
assert.equal(Date.parse(WEDDING10_OFFER.endsAt), Date.parse(wedding10.expires_at), "the offer and its coupon end at different moments");

for (const [stamp, open] of [
  ["2026-11-09T10:00:00", true],
  ["2026-11-30T23:59:00", true],
  ["2026-11-30T23:59:59", false],
  ["2026-12-01T00:00:00", false],
  ["2027-01-15T12:00:00", false],
]) {
  assert.equal(offerOpen(WEDDING10_OFFER, ist(stamp)), open, `the offer at ${stamp} IST`);
  /* And the coupon itself, as the preview and the order ask it. */
  assert.equal(couponRefusal(wedding10, ist(stamp)), open ? null : "expired", `WEDDING10 at ${stamp} IST`);
}

/* No usage limit: any number of uses; the other refusals still apply. */
assert.equal(couponRefusal({ ...wedding10, used_count: 1_000_000 }, ist("2026-11-20T12:00:00")), null);
assert.equal(couponRefusal({ ...wedding10, is_active: false }, ist("2026-11-20T12:00:00")), "inactive");
assert.equal(couponRefusal({ ...wedding10, max_uses: 3, used_count: 3 }, ist("2026-11-20T12:00:00")), "exhausted");
assert.equal(couponRefusal({ ...wedding10, expires_at: null }, ist("2030-01-01T00:00:00")), null, "a code with no end date ends");

console.log("WEDDING10: Rs 629.10 on Rs 699 and Rs 899.10 on Rs 999, no limit; the offer and the code both end at 23:59:59 IST on 30 Nov 2026.");

/* ── Who may pay a test price ───────────────────────────────────────────── */

const allowed = parseTestPriceEmails(" Owner@Example.com, tester@example.com ;");
assert.deepEqual([...allowed].sort(), ["owner@example.com", "tester@example.com"]);
assert.equal(parseTestPriceEmails(undefined).size, 0);
assert.equal(parseTestPriceEmails("").size, 0);

const confirmed = "2026-11-07T06:00:00Z";
assert.equal(mayPayTestPrice({ email: "OWNER@example.com", email_confirmed_at: confirmed }, allowed), true);
assert.equal(mayPayTestPrice({ email: "owner@example.com" }, allowed), false, "an unconfirmed email may pay a test price");
assert.equal(mayPayTestPrice({ email: "owner@example.com", email_confirmed_at: null }, allowed), false);
assert.equal(mayPayTestPrice({ email: "visitor@example.com", email_confirmed_at: confirmed }, allowed), false, "a visitor may pay a test price");
assert.equal(mayPayTestPrice({ email: "owner@example.com", email_confirmed_at: confirmed }, new Set()), false, "an empty list lets someone pay a test price");
assert.equal(mayPayTestPrice(null, allowed), false);
assert.equal(mayPayTestPrice({ email: "", email_confirmed_at: confirmed }, allowed), false);

console.log("Test prices: only a confirmed email on TEST_PRICE_EMAILS, and nobody when it is empty.");

/* ── A captured payment must match its order ────────────────────────────── */

const paid = {
  capturedPaise: PREMIUM_PRICE_PAISE,
  orderPaise: PREMIUM_PRICE_PAISE,
  discountPaise: 0,
  pricePaise: PREMIUM_PRICE_PAISE,
  hostMayPayTestPrice: false,
};

assert.equal(captureRefusal(paid), null, "a full payment is refused");
assert.equal(
  captureRefusal({ ...paid, capturedPaise: 89910, orderPaise: 89910, discountPaise: 9990 }),
  null,
  "a coupon's payment is refused",
);
assert.match(captureRefusal({ ...paid, capturedPaise: 100 }), /captured 100 paise/, "less than the order publishes");
assert.match(captureRefusal({ ...paid, capturedPaise: 100000 }), /captured 100000 paise/, "more than the order publishes");
assert.match(
  captureRefusal({ ...paid, capturedPaise: TRADITIONS_PRICE_PAISE, orderPaise: TRADITIONS_PRICE_PAISE }),
  /template now costs/,
  "a Rs 699 order publishes a Rs 999 card",
);

const testOrder = { ...paid, capturedPaise: 100, orderPaise: 100, discountPaise: 99800 };
assert.match(captureRefusal(testOrder), /test price/, "a visitor's Rs 1 payment publishes");
assert.equal(captureRefusal({ ...testOrder, hostMayPayTestPrice: true }), null, "an allowlisted Rs 1 payment is refused");
assert.match(
  captureRefusal({ ...testOrder, capturedPaise: 99900, hostMayPayTestPrice: true }),
  /captured 99900 paise/,
  "an allowlisted account skips the amount check",
);
assert.match(captureRefusal({ ...testOrder, pricePaise: null }), /test price/, "a test price for a missing event publishes");

/* An order made with WEDDING10 must have been made before it ended; paying a little after is honoured. */
const weddingOrder = {
  ...paid,
  capturedPaise: 89910,
  orderPaise: 89910,
  discountPaise: 9990,
  coupon: { code: "WEDDING10", endsAt: wedding10.expires_at },
};
assert.equal(captureRefusal({ ...weddingOrder, orderMadeAt: ist("2026-11-20T18:00:00").toISOString() }), null, "a WEDDING10 order in time is refused");
assert.equal(captureRefusal({ ...weddingOrder, orderMadeAt: ist("2026-11-30T23:58:00").toISOString() }), null, "an order made at 23:58 on the last day is refused");
assert.match(
  captureRefusal({ ...weddingOrder, orderMadeAt: ist("2026-12-01T00:05:00").toISOString() }),
  /made with WEDDING10 .* after it ended/,
  "an order made after WEDDING10 ended publishes",
);
assert.equal(captureRefusal({ ...weddingOrder, coupon: { code: "FOREVER", endsAt: null }, orderMadeAt: ist("2030-01-01T00:00:00").toISOString() }), null, "a code with no end is refused");
assert.equal(captureRefusal({ ...paid, coupon: null, orderMadeAt: ist("2030-01-01T00:00:00").toISOString() }), null, "an order with no coupon is refused");

console.log("Capture: the amount must equal the order, the order must cover the template, its coupon must not have ended when it was made, a test price must be allowed.");

/* ── The server code asks these rules ───────────────────────────────────── */

/* Block and line comments out, so a sentence about a call does not count as one. */
const source = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const payments = source("lib/db/payments.ts");
const between = (text, from, to) => {
  const start = text.indexOf(from);
  assert.ok(start >= 0, `${from} is missing`);
  const end = text.indexOf(to, start + from.length);
  return text.slice(start, end < 0 ? undefined : end);
};

/* The order takes an event id and a code, and no amount. */
const orderParams = between(payments, "export async function createPaymentOrder(", "): Promise<")
  .slice("export async function createPaymentOrder(".length)
  .split(",")
  .map((param) => param.trim().split(/[:=\s]/)[0])
  .filter(Boolean);
assert.deepEqual(orderParams, ["eventId", "rawCouponCode"], "createPaymentOrder takes something other than an event and a code");

const previewParams = between(payments, "export async function previewCoupon(", "): Promise<")
  .slice("export async function previewCoupon(".length)
  .split(",")
  .map((param) => param.trim().split(/[:=\s]/)[0])
  .filter(Boolean);
assert.deepEqual(previewParams, ["eventId", "rawCode"], "previewCoupon takes something other than an event and a code");

/* The amount Razorpay is told is the template's price, less the stored coupon. */
const order = between(payments, "export async function createPaymentOrder(", "export async function activateWithFreeCoupon(");
assert.match(order, /const amount = quote\?\.finalPaise \?\? owned\.pricePaise;/, "the order amount is not the server's price");
assert.match(order, /orders\.create\(\{\s*amount,/, "Razorpay is told some other amount");
assert.match(order, /if \(isTestPrice\(amount\) && !owned\.mayPayTestPrice\)/, "createPaymentOrder does not refuse a test price");
assert.ok(
  order.indexOf("isTestPrice(amount)") < order.indexOf("orders.create("),
  "createPaymentOrder asks Razorpay before refusing a test price",
);

const preview = between(payments, "export async function previewCoupon(", "async function requireUnpaidOwnedEvent(");
assert.match(preview, /if \(isTestPrice\(quote\.finalPaise\) && !owned\.mayPayTestPrice\)/, "previewCoupon does not refuse a test price");

assert.match(payments, /pricePaise: templatePricePaise\(event\.card_config\?\.templateId\)/, "the price is not the saved template's");
assert.match(payments, /mayPayTestPrice: accountMayPayTestPrice\(user\)/, "the allowlist is not read off the session's user");

/* Razorpay is asked for an order in one place only. */
const codeFiles = (dir) =>
  readdirSync(new URL(`../${dir}`, import.meta.url)).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(new URL(`../${path}`, import.meta.url)).isDirectory()) {
      return codeFiles(path);
    }
    return /\.(ts|tsx)$/.test(name) ? [path.replaceAll("\\", "/")] : [];
  });
const orderMakers = ["app", "lib", "components"]
  .flatMap(codeFiles)
  .filter((path) => source(path).includes("orders.create("));
assert.deepEqual(orderMakers, ["lib/db/payments.ts"], "a Razorpay order is made outside createPaymentOrder");

/* The webhook refuses on the shared rules, and the dashboard never reports a test price. */
const applyPayment = source("lib/db/applyPayment.ts");
assert.match(applyPayment, /const reason = captureRefusal\(\{/, "the webhook does not check the amount with captureRefusal");
assert.match(applyPayment, /capturedPaise,\s*orderPaise: order\.amount,/, "the webhook does not compare the capture with the order");
assert.match(applyPayment, /if \(reason !== null\) \{\s*const marked = await markUnderReview/, "a refused capture is not held for review");
assert.ok(
  applyPayment.indexOf("captureRefusal(") < applyPayment.indexOf('status: "paid"'),
  "the webhook marks a payment paid before checking it",
);
assert.match(applyPayment, /coupon,\s*orderMadeAt: order\.created_at,/, "the webhook does not check the coupon's end date");
assert.match(applyPayment, /\.from\("coupons"\)\s*\.select\("expires_at"\)/, "the webhook does not read the coupon's end date");

/* The preview and the order ask the coupon's end date through the one rule. */
const lookup = source("lib/coupons/lookup.ts");
assert.match(lookup, /couponRefusal\(coupon, new Date\(\)\)/, "findUsableCoupon does not ask couponRefusal at this moment");
assert.equal((payments.match(/findUsableCoupon\(/g) ?? []).length >= 2, true, "the preview or the order does not look the code up");
for (const [name, from, to] of [
  ["previewCoupon", "export async function previewCoupon(", "async function requireUnpaidOwnedEvent("],
  ["createPaymentOrder", "export async function createPaymentOrder(", "export async function activateWithFreeCoupon("],
]) {
  assert.match(between(payments, from, to), /findUsableCoupon\(/, `${name} does not check the code is still on`);
}

assert.match(source("lib/db/confirmedPayment.ts"), /isTestPrice\(data\.amount\)/, "the dashboard may report a test price to Meta");

/* The browser's mirror of the line is the same line. */
const mirrored = /const TEST_PRICE_BELOW_PAISE = (\d+);/.exec(source("lib/metaPixel.ts"));
assert.equal(Number(mirrored?.[1]), TEST_PRICE_BELOW_PAISE, "lib/metaPixel.ts has another test price line");

console.log("Server: the order and preview take no amount and refuse a test price; one place makes orders; the webhook and the dashboard ask the rules.");
