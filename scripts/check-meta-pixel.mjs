/**
 * Checks that the Meta Pixel stays off guests' pages.
 *
 *   node scripts/check-meta-pixel.mjs                         (the route rules only)
 *   node scripts/check-meta-pixel.mjs http://localhost:3000 [inviteCode]
 *
 * First the rules in lib/metaPixel.ts: which paths the pixel may run on, and
 * the address it reports for a page whose own address names an invitation.
 * Node runs the TypeScript file as it is, so this is the code the site ships.
 *
 * Then, given a running server (`npm run build` with NEXT_PUBLIC_META_PIXEL_ID
 * set, then `npm start`), the HTML of a guest invitation and of a sample
 * invitation, which must not mention connect.facebook.net or fbevents.js. With
 * no invite code given, an unknown one is used: the page is the same route and
 * the same layout, and whether the pixel runs is decided by route alone.
 */
import assert from "node:assert/strict";
import {
  pixelAllowedOn,
  POLICY_PATHS,
  reportedPage,
} from "../lib/metaPixel.ts";

const allowed = [
  "/",
  "/create",
  "/create/wizard",
  "/login",
  "/auth/callback",
  "/dashboard",
  "/dashboard/3f6c1d2e-0000-4000-8000-000000000000",
  "/dashboard/3f6c1d2e-0000-4000-8000-000000000000/edit",
  "/dashboard/3f6c1d2e-0000-4000-8000-000000000000/checkin",
  ...POLICY_PATHS,
];

const refused = [
  "/i/AB12CD",
  "/i/AB12CD/print",
  "/i/AB12CD/calendar.ics",
  "/i",
  "/demo/emerald-shahi",
  "/demo/nikah",
  "/demo",
  "/checkin/some-token",
  "/admin",
  "/admin/login",
  "/admin/events/123",
  "/api/translate",
  "/api/razorpay/webhook",
  "/created",
  "/dashboards",
  "/loginx",
];

for (const path of allowed) {
  assert.equal(pixelAllowedOn(path), true, `should run on ${path}`);
}

for (const path of refused) {
  assert.equal(pixelAllowedOn(path), false, `must not run on ${path}`);
}

const origin = "https://getlifafa.co.in";
const reported = (path) => reportedPage(new URL(path, origin));

/* Reported as they are: nothing in them names anyone. */
for (const path of [
  "/",
  "/?fbclid=IwAR0abc&utm_source=facebook&utm_campaign=launch",
  "/create?step=template",
  "/create?template=emerald-shahi&step=details",
  "/dashboard",
]) {
  assert.deepEqual(reported(path), { href: `${origin}${path}`, asIs: true }, path);
}

/* Written out without the id, the query and the fragment. */
for (const [path, href] of [
  ["/dashboard/3f6c1d2e-0000-4000-8000-000000000000", "/dashboard/invitation"],
  ["/dashboard/3f6c1d2e-0000-4000-8000-000000000000/edit?saved=1", "/dashboard/invitation/edit"],
  ["/dashboard/3f6c1d2e-0000-4000-8000-000000000000#payment-banner-heading", "/dashboard/invitation"],
  ["/create?step=preview&event=3f6c1d2e-0000-4000-8000-000000000000", "/create"],
  ["/login?redirectTo=%2Fdashboard%2F3f6c1d2e-0000-4000-8000-000000000000", "/login"],
  ["/login?error=expired", "/login"],
  ["/#access_token=secret&refresh_token=secret", "/"],
]) {
  assert.deepEqual(reported(path), { href: `${origin}${href}`, asIs: false }, path);
}

console.log(`Routes: ${allowed.length} allowed and ${refused.length} refused, as expected.`);
console.log("Addresses: ids, queries and fragments are written out where they must be.");

const base = process.argv[2];

if (base !== undefined) {
  const code = process.argv[3] ?? "ZZZZZZZZ";

  for (const path of [`/i/${code}`, "/demo/emerald-shahi", "/demo/nikah"]) {
    const response = await fetch(new URL(path, base));
    const html = await response.text();

    assert.ok(html.includes("</html>"), `${path} did not return a page (${response.status})`);
    assert.ok(!html.includes("connect.facebook.net"), `${path} mentions connect.facebook.net`);
    assert.ok(!html.includes("fbevents"), `${path} mentions fbevents`);
    console.log(`${path}: ${response.status}, no pixel in the HTML.`);
  }
}
