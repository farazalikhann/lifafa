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

/*
  Clarity's own list (lib/clarity.ts): the samples under /demo are recorded,
  where the pixel stays off (above), and a guest's pages never are.
*/
{
  const { clarityAllowedOn } = await import("../lib/clarity.ts");

  for (const path of ["/", "/create", "/login", "/demo/emerald-shahi", "/demo/sheesh-mahal", "/demo/nikah"]) {
    assert.equal(clarityAllowedOn(path), true, `Clarity should run on ${path}`);
  }

  for (const path of [
    "/i/AB12CD",
    "/i/AB12CD/print",
    "/checkin/some-token",
    "/dashboard",
    "/dashboard/3f6c1d2e-0000-4000-8000-000000000000",
    "/admin",
    "/demo",
    "/demo/emerald-shahi/extra",
    "/api/translate",
  ]) {
    assert.equal(clarityAllowedOn(path), false, `Clarity must not run on ${path}`);
  }

  for (const path of ["/demo/emerald-shahi", "/demo/nikah"]) {
    assert.equal(pixelAllowedOn(path), false, `the pixel must stay off ${path}`);
  }

  console.log("Clarity: on the samples under /demo, never on a guest's pages; the pixel still off /demo.");
}
console.log("Addresses: ids, queries and fragments are written out where they must be.");

/*
  PageView and ViewContent, in a stand-in browser with a pixel id: each sent at
  once as one keepalive request and never through fbevents.js, with the click
  id and browser id fbevents.js would send; PageView once per path,
  ViewContent once per template per tab, kept for a hold's release, and never
  sent from a page the pixel may not run on. A second copy of the module is a
  second page load in the same tab.
*/
{
  const realFetch = globalThis.fetch;
  const realPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const requests = [];
  const session = new Map();
  const storage = (map) => ({
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
  });
  const site = "https://www.getlifafa.co.in";
  const at = (path) => {
    const url = new URL(path, site);
    return { href: url.href, pathname: url.pathname, hostname: url.hostname };
  };

  /* A cookie jar that, like a browser, refuses a cookie for a public suffix. */
  const jar = new Map();
  const PUBLIC_SUFFIXES = new Set(["in", "co.in"]);

  globalThis.window = {
    location: at("/create?fbclid=TEST123&utm_source=meta"),
    screen: { width: 390, height: 844 },
    sessionStorage: storage(session),
    localStorage: storage(new Map()),
  };
  window.top = window;
  globalThis.document = {
    referrer: "",
    get cookie() {
      return [...jar].map(([name, { value }]) => `${name}=${value}`).join("; ");
    },
    set cookie(line) {
      const [pair, ...attributes] = line.split("; ");
      const name = pair.slice(0, pair.indexOf("="));
      const value = pair.slice(pair.indexOf("=") + 1);
      const domain = attributes.find((entry) => entry.startsWith("Domain="))?.slice(7) ?? null;
      const host = window.location.hostname;

      if (domain !== null && (PUBLIC_SUFFIXES.has(domain) || !`.${host}`.endsWith(`.${domain}`))) {
        return;
      }

      if (attributes.includes("Max-Age=0")) {
        jar.delete(name);
      } else {
        jar.set(name, { value, domain });
      }
    },
  };
  globalThis.fetch = (url, init) => {
    requests.push({ url: new URL(url), init });
    return Promise.resolve();
  };
  process.env.NEXT_PUBLIC_META_PIXEL_ID = "1000000000000001";

  try {
    const { AD_PARAMS_KEY } = await import("../lib/inAppBrowser.ts");
    const pixel = await import("../lib/metaPixel.ts?first-page");
    const template = (id, tier = "premium") => ({ id, tier, pricePaise: 99900 });
    const sent = (name) => requests.filter(({ url }) => url.searchParams.get("ev") === name);
    const param = (request, key) => request.url.searchParams.get(key);
    const askedOfFbq = (name) =>
      window.fbq.queue.some((command) => command[0] === "track" && command[1] === name);

    assert.equal(pixel.installMetaPixel(), true);

    /* Landing from the ad, before fbevents.js has loaded: PageView at once, with the click id. */
    pixel.metaPixelNavigated();
    assert.equal(sent("PageView").length, 1, "PageView waits for fbevents.js");
    const [view] = sent("PageView");
    assert.equal(view.init.keepalive, true, "PageView is not a keepalive request");
    assert.equal(view.init.mode, "no-cors");
    assert.equal(view.init.credentials, "include", "facebook.com's cookies do not go with it");
    assert.match(param(view, "fbc"), /^fb\.2\.\d{13}\.TEST123$/, "fbc is not built from the fbclid");
    assert.match(param(view, "fbp"), /^fb\.2\.\d{13}\.\d{16}$/, "fbp is not in fbevents.js's format");
    assert.equal(jar.get("_fbc")?.value, param(view, "fbc"));
    assert.equal(jar.get("_fbc")?.domain, "getlifafa.co.in", "_fbc is not on the site's own domain");
    assert.equal(jar.get("_fbp")?.value, param(view, "fbp"));
    for (const key of ["id", "ev", "dl", "rl", "ts", "v", "sw", "sh", "it"]) {
      assert.ok(view.url.searchParams.has(key), `PageView has no ${key}`);
    }
    assert.equal(param(view, "v"), "2.9.437");
    assert.ok(!askedOfFbq("PageView"), "PageView was also handed to fbevents.js");

    /* The same path again (a step change): no second PageView. */
    pixel.metaPixelNavigated();
    assert.equal(sent("PageView").length, 1, "PageView sent twice for one page");

    /* Select: ViewContent at once, with the same ids. */
    assert.equal(pixel.viewContent(template("emerald-shahi")), true);
    assert.equal(sent("ViewContent").length, 1, "ViewContent waits for fbevents.js");
    const [first] = sent("ViewContent");
    assert.equal(first.init.keepalive, true, "ViewContent is not a keepalive request");
    assert.equal(param(first, "cd[content_name]"), "emerald-shahi");
    assert.equal(param(first, "cd[content_category]"), "premium");
    assert.equal(param(first, "dl"), `${site}/create?fbclid=TEST123&utm_source=meta`);
    assert.equal(param(first, "fbc"), param(view, "fbc"), "ViewContent has another click id");
    assert.equal(param(first, "fbp"), param(view, "fbp"), "ViewContent has another browser id");
    assert.ok(!askedOfFbq("ViewContent"), "ViewContent was also handed to fbevents.js");

    /* The same template again: not sent. */
    assert.equal(pixel.viewContent(template("emerald-shahi")), false);
    assert.equal(sent("ViewContent").length, 1, "ViewContent sent twice for one template");

    /* Held: kept, and sent on the release with the address it was asked on. */
    const release = pixel.holdMetaPixel();
    assert.equal(pixel.viewContent(template("classic", "traditions")), true);
    assert.equal(sent("ViewContent").length, 1, "ViewContent sent while held");
    release();
    assert.equal(sent("ViewContent").length, 2, "ViewContent held was not sent on the release");
    assert.equal(param(sent("ViewContent")[1], "cd[content_category]"), "traditions");

    /* A page the pixel may not run on: nothing. */
    window.location = at("/demo/gulab-mahal");
    assert.equal(pixel.viewContent(template("gulab-mahal")), false);
    pixel.metaPixelNavigated();
    assert.equal(sent("ViewContent").length, 2, "ViewContent sent from /demo");
    assert.equal(sent("PageView").length, 1, "PageView sent from /demo");

    /* The next page in the same tab, with no fbclid in it: one PageView, the same ids, still once per template. */
    window.location = at("/create?step=details&template=emerald-shahi");
    const next = await import("../lib/metaPixel.ts?next-page");
    next.installMetaPixel();
    next.metaPixelNavigated();
    assert.equal(sent("PageView").length, 2);
    assert.equal(param(sent("PageView")[1], "fbc"), param(view, "fbc"), "the click id did not carry over");
    assert.equal(param(sent("PageView")[1], "fbp"), param(view, "fbp"), "the browser id did not carry over");
    assert.equal(next.viewContent(template("emerald-shahi")), false, "ViewContent sent again on a new page");
    assert.equal(next.viewContent(template("dak-ghar")), true);
    assert.equal(sent("ViewContent").length, 3);

    /* No cookie yet and no fbclid in the address: the one kept for the session. */
    jar.clear();
    session.set(AD_PARAMS_KEY, JSON.stringify({ fbclid: "STORED9", utm_source: "meta" }));
    window.location = at("/create?step=details");
    const third = await import("../lib/metaPixel.ts?third-page");
    third.installMetaPixel();
    third.metaPixelNavigated();
    assert.match(param(sent("PageView")[2], "fbc"), /^fb\.2\.\d{13}\.STORED9$/, "the stored fbclid was not used");

    /*
      A test price (lib/checkoutPrice.ts) is never a sale: no InitiateCheckout
      and no Purchase for one, nor for a free one, and both for a real price.
    */
    const { TEST_PRICE_BELOW_PAISE } = await import("../lib/checkoutPrice.ts");
    window.location = at("/dashboard/3f6c1d2e-0000-4000-8000-000000000000");
    const checkout = await import("../lib/metaPixel.ts?checkout");
    checkout.installMetaPixel();

    for (const amountPaise of [0, 100, 5000, TEST_PRICE_BELOW_PAISE - 1]) {
      assert.equal(
        checkout.initiateCheckout({ templateId: "emerald-shahi", amountPaise }),
        false,
        `InitiateCheckout taken for a test price of ${amountPaise} paise`,
      );
      assert.equal(
        checkout.purchase({ paymentId: `pay_TEST${amountPaise}`, templateId: "emerald-shahi", amountPaise }),
        false,
        `Purchase taken for a test price of ${amountPaise} paise`,
      );
    }

    assert.equal(
      checkout.initiateCheckout({ templateId: "emerald-shahi", amountPaise: TEST_PRICE_BELOW_PAISE }),
      true,
      "InitiateCheckout refused for the lowest real price",
    );
    assert.equal(
      checkout.purchase({ paymentId: "pay_REAL1", templateId: "emerald-shahi", amountPaise: 99900 }),
      true,
      "Purchase refused for a real payment",
    );

    /*
      A sale at a coupon's price is reported at what was paid: WEDDING10 on a
      Rs 699 and a Rs 999 card. On a dashboard address the events go to the
      image endpoint once fbevents.js has settled; the stand-in Image keeps them.
    */
    const images = [];
    globalThis.Image = class {
      set src(url) {
        images.push(new URL(url));
      }
    };
    for (const amountPaise of [62910, 89910]) {
      assert.equal(
        checkout.purchase({ paymentId: `pay_WEDDING10_${amountPaise}`, templateId: "shubh-vivah-ivory", amountPaise }),
        true,
        `Purchase refused for a WEDDING10 sale of ${amountPaise} paise`,
      );
    }
    checkout.metaPixelSettled();
    const purchased = [...images, ...requests.map(({ url }) => url)]
      .filter((url) => url.searchParams.get("ev") === "Purchase")
      .map((url) => url.searchParams.get("cd[value]"));
    assert.ok(
      purchased.includes("629.1") && purchased.includes("899.1"),
      `a WEDDING10 sale is not reported at the price paid: ${purchased.join(", ")}`,
    );
  } finally {
    globalThis.fetch = realFetch;
    delete globalThis.Image;
    delete globalThis.window;
    delete globalThis.document;
    if (realPixelId === undefined) {
      delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
    } else {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = realPixelId;
    }
  }

  console.log("PageView and ViewContent: sent at once and kept alive, with fbc and fbp, once each, held until released.");
  console.log("InitiateCheckout and Purchase: never for a test price or a free one; a WEDDING10 sale is reported at what was paid.");
}

const base = process.argv[2];

if (base !== undefined) {
  const code = process.argv[3] ?? "ZZZZZZZZ";

  for (const path of [`/i/${code}`, "/demo/emerald-shahi", "/demo/nikah"]) {
    const response = await fetch(new URL(path, base));
    const html = await response.text();

    assert.ok(html.includes("</html>"), `${path} did not return a page (${response.status})`);
    assert.ok(!html.includes("connect.facebook.net"), `${path} mentions connect.facebook.net`);
    assert.ok(!html.includes("fbevents"), `${path} mentions fbevents`);
    assert.ok(!html.includes("facebook.com/tr"), `${path} has the pixel's noscript image`);
    console.log(`${path}: ${response.status}, no pixel in the HTML.`);
  }
}
