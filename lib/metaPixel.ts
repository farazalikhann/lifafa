/**
 * The Meta Pixel, for measuring the ads that bring hosts here.
 *
 * HOSTS ONLY, NEVER GUESTS. It runs on the marketing pages and the host's own
 * pages, the list in pixelAllowedOn below, and nowhere else: not on an
 * invitation a guest opens (/i), not on a sample invitation (/demo), not on a
 * check-in link, the owner's /admin or an API route, and not while the
 * editor's full screen preview of a card is open (holdMetaPixel). This file
 * is the one place that decides it.
 *
 * OFF UNLESS CONFIGURED. NEXT_PUBLIC_META_PIXEL_ID is inlined at build time;
 * next.config.ts gives a Vercel production build Lifafa's own id when it is
 * not set. Empty, nothing is loaded and every call here does nothing, so a
 * local or preview build sends Meta nothing unless it is given the id.
 *
 * NOTHING PERSONAL IS SENT. No email, phone or name is ever passed (advanced
 * matching is never given any), and autoConfig is switched off before init so
 * the pixel does not read buttons and forms on its own.
 *
 * WHICH ADDRESS META IS TOLD. fbevents.js reports the page by reading
 * location.href itself, and has no setting to report anything else. Some host
 * pages carry an invitation's id: /dashboard/<id>, /create?event=<id>, and
 * /login?redirectTo=<a path naming one>. On those (reportedPage says which)
 * fbevents.js is told consent is revoked, so it sends nothing of its own, and
 * this file sends the event itself to Meta's image endpoint (/tr, the one the
 * pixel's own <noscript> uses) with the address written out without the id or
 * the query: /dashboard/invitation, /create, /login. The referrer is kept to
 * an origin by the site's referrer policy (app/layout.tsx).
 *
 * SENT ONCE IT HAS LOADED. fbevents.js loads with next/script's
 * afterInteractive, once the page has hydrated, so a visitor who leaves an
 * ad's landing page quickly is still counted. Events asked for before that
 * wait here, each with the address it was asked for on, and go once it has.
 */

const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

export const FBEVENTS_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const TRACK_ENDPOINT = "https://www.facebook.com/tr/";

/**
 * Set by app/auth/callback/route.ts on the redirect that ends a new account's
 * first sign in, and read here on the next host page: CompleteRegistration.
 * Holds "1" and nothing else, and lasts ten minutes.
 */
export const NEW_ACCOUNT_COOKIE = "lifafa_new_account";

/** Whether this build was given a pixel id at all. */
export function metaPixelEnabled(): boolean {
  return PIXEL_ID.length > 0;
}

/** This build's pixel id, empty when it has none. */
export function metaPixelId(): string {
  return PIXEL_ID;
}

/**
 * The five policy pages, by the addresses they will have. None is written yet
 * (the landing footer already links /terms and /refunds); a page at another
 * address is not measured until it is added here.
 */
export const POLICY_PATHS = [
  "/privacy",
  "/terms",
  "/refunds",
  "/shipping",
  "/contact",
] as const;

/** The routes the pixel may run on, each with everything under it. "/" is the landing page alone. */
const ALLOWED_PREFIXES = [
  "/create",
  "/login",
  "/auth/callback",
  "/dashboard",
  ...POLICY_PATHS,
];

/**
 * Whether the pixel may run on this path. An allow list, so a route added
 * later is left out until someone decides otherwise.
 */
export function pixelAllowedOn(pathname: string): boolean {
  return (
    pathname === "/" ||
    ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

/** An invitation's id, as the second segment of a host's dashboard address. */
const ID_IN_PATH = /^\/dashboard\/[^/]+/;

/**
 * Query parameters that say nothing about anyone: the ad's own (fbclid is
 * what ties a visit to the ad that was tapped) and the wizard's step and
 * template. Any other key, `event` and `redirectTo` among them, makes the
 * page one whose address is written out instead.
 */
const SAFE_QUERY_KEYS: ReadonlySet<string> = new Set([
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "step",
  "template",
]);

/**
 * The address to report for a page, and whether fbevents.js may read it from
 * the page itself (`asIs`). When it may not, `href` is the origin and the path
 * with any invitation id replaced, and no query or fragment.
 */
export function reportedPage(url: URL): { href: string; asIs: boolean } {
  const asIs =
    !ID_IN_PATH.test(url.pathname) &&
    url.hash.length <= 1 &&
    [...url.searchParams.keys()].every((key) => SAFE_QUERY_KEYS.has(key));

  if (asIs) {
    return { href: url.href, asIs };
  }

  return {
    href: `${url.origin}${url.pathname.replace(ID_IN_PATH, "/dashboard/invitation")}`,
    asIs,
  };
}

type EventParams = Record<string, string | number | readonly string[]>;

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
  /** Read by fbevents.js: no PageView of its own on history.pushState. */
  disablePushState?: boolean;
  /** Read by fbevents.js: a second PageView on one page load is sent, not dropped. */
  allowDuplicatePageViews?: boolean;
}

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

interface Pending {
  name: string;
  params: EventParams;
  eventID?: string;
  page: { href: string; asIs: boolean };
  time: number;
  onSent?: () => void;
}

/** off: not installed. waiting: fbevents.js not loaded yet. settled: loaded, or failed to. */
let state: "off" | "waiting" | "settled" = "off";
const pending: Pending[] = [];
/** How many full screen previews are open. */
let holds = 0;
/** What fbevents.js was last told. It starts out granted. */
let consentGranted = true;
let lastPageViewPath: string | null = null;
let registrationQueued = false;

function here(): URL {
  return new URL(window.location.href);
}

/** Whether, right now, anything may be sent at all. */
function mayRun(): boolean {
  return holds === 0 && pixelAllowedOn(window.location.pathname);
}

/**
 * Tells fbevents.js whether it may send anything of its own: only on an
 * allowed page whose address can be reported as it is. Revoked, it holds
 * every command in its queue, its own included; the one it makes by itself,
 * a PageView when the browser restores a page from its back/forward cache,
 * is a trackCustom and is dropped before consent is given back, since this
 * file never calls trackCustom and the page it was made for is gone.
 */
function syncConsent(): void {
  const fbq = window.fbq;

  if (state === "off" || fbq === undefined) {
    return;
  }

  const grant = mayRun() && reportedPage(here()).asIs;

  if (grant === consentGranted) {
    return;
  }

  if (grant) {
    for (let index = fbq.queue.length - 1; index >= 0; index -= 1) {
      if (fbq.queue[index]?.[0] === "trackCustom") {
        fbq.queue.splice(index, 1);
      }
    }
  }

  fbq("consent", grant ? "grant" : "revoke");
  consentGranted = grant;
}

function readCookie(name: string): string | null {
  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${name}=`));

  return match === undefined ? null : decodeURIComponent(match.slice(name.length + 1));
}

/**
 * One event to Meta's image endpoint, with the address written out. The same
 * parameters fbevents.js sends, and its browser id (_fbp) and click id (_fbc)
 * cookies when it has set them, so the event is still tied to the visit the
 * ad began. No referrer header, and the reported referrer is an origin.
 */
function sendImage(event: Pending): void {
  const query = new URLSearchParams({
    id: PIXEL_ID,
    ev: event.name,
    dl: event.page.href,
    rl: document.referrer.length > 0 ? new URL(document.referrer).origin : "",
    if: String(window.top !== window),
    ts: String(event.time),
    sw: String(window.screen.width),
    sh: String(window.screen.height),
  });

  if (event.eventID !== undefined) {
    query.set("eid", event.eventID);
  }

  for (const [key, value] of Object.entries(event.params)) {
    query.set(
      `cd[${key}]`,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  }

  for (const [cookie, param] of [
    ["_fbp", "fbp"],
    ["_fbc", "fbc"],
  ] as const) {
    const value = readCookie(cookie);

    if (value !== null) {
      query.set(param, value);
    }
  }

  const image = new Image();
  image.referrerPolicy = "no-referrer";
  image.src = `${TRACK_ENDPOINT}?${query.toString()}`;
}

/**
 * Sends one event: through fbevents.js when it is loaded and the event was
 * asked for on this very page, which it may report as it is; otherwise to the
 * image endpoint with the address it was asked for on.
 */
function deliver(event: Pending): void {
  syncConsent();

  const fbq = window.fbq;
  const current = reportedPage(here());

  if (
    fbq?.callMethod !== undefined &&
    consentGranted &&
    event.page.asIs &&
    current.asIs &&
    event.page.href === current.href
  ) {
    fbq(
      "track",
      event.name,
      event.params,
      event.eventID === undefined ? undefined : { eventID: event.eventID },
    );
  } else {
    sendImage(event);
  }

  event.onSent?.();
}

/** Sends what has waited, once fbevents.js has settled and while this page may. */
function flush(): void {
  if (state !== "settled" || !mayRun()) {
    return;
  }

  for (const event of pending.splice(0)) {
    deliver(event);
  }
}

/** Whether the event was taken: queued or sent. */
function track(
  name: string,
  params: EventParams,
  options: { eventID?: string; onSent?: () => void } = {},
): boolean {
  if (!metaPixelEnabled() || typeof window === "undefined" || !mayRun()) {
    return false;
  }

  const event: Pending = {
    name,
    params,
    eventID: options.eventID,
    onSent: options.onSent,
    page: reportedPage(here()),
    time: Date.now(),
  };

  if (state === "settled") {
    deliver(event);
  } else {
    pending.push(event);
  }

  return true;
}

/**
 * Meta's own queue, as its snippet makes it, then autoConfig off and init
 * with no customer data. Called by components/analytics/MetaPixel.tsx on the
 * first allowed page, before fbevents.js is put on it. False when there is no
 * pixel id.
 */
export function installMetaPixel(): boolean {
  if (!metaPixelEnabled() || typeof window === "undefined") {
    return false;
  }

  if (state !== "off") {
    return true;
  }

  if (window.fbq === undefined) {
    const stub = function (...args: unknown[]): void {
      if (stub.callMethod !== undefined) {
        /* fbevents.js reads its flags off `this`, so it must be the stub. */
        stub.callMethod.apply(stub, args);
      } else {
        stub.queue.push(args);
      }
    } as Fbq;

    stub.push = stub;
    stub.loaded = true;
    stub.version = "2.0";
    stub.queue = [];
    window.fbq = stub;
    window._fbq ??= stub;
  }

  const fbq = window.fbq;

  /* PageView is sent from here, once per path; see metaPixelNavigated. */
  fbq.disablePushState = true;
  fbq.allowDuplicatePageViews = true;
  fbq("set", "autoConfig", false, PIXEL_ID);
  fbq("init", PIXEL_ID);
  state = "waiting";
  syncConsent();

  return true;
}

/** fbevents.js has loaded, or failed to: what has waited can go. */
export function metaPixelSettled(): void {
  state = "settled";
  flush();
}

/**
 * Every route change, from components/analytics/MetaPixel.tsx: consent for
 * the new address, anything that waited for an allowed page, a PageView when
 * the path is a new one, and CompleteRegistration when the sign in that just
 * ended made an account.
 */
export function metaPixelNavigated(): void {
  if (state === "off") {
    return;
  }

  syncConsent();
  flush();

  const path = window.location.pathname;

  if (path !== lastPageViewPath) {
    lastPageViewPath = path;
    pageView();
  }

  if (!registrationQueued && readCookie(NEW_ACCOUNT_COOKIE) === "1") {
    registrationQueued = completeRegistration();
  }
}

/**
 * Keeps the pixel quiet while it is held: from the full screen preview, which
 * shows the guest's card. Returns the release.
 */
export function holdMetaPixel(): () => void {
  let released = false;

  holds += 1;

  if (typeof window !== "undefined") {
    syncConsent();
  }

  return () => {
    if (released) {
      return;
    }

    released = true;
    holds -= 1;
    syncConsent();
    flush();
  };
}

/** Paise to rupees, as Meta takes a value. */
function rupees(paise: number): number {
  return Math.round(paise) / 100;
}

const REGISTERED_KEY = "lifafa.meta.registered";
const PURCHASES_KEY = "lifafa.meta.purchases";

function readStore(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Private mode or blocked storage: Meta's own eventID dedupe still holds. */
  }
}

export function pageView(): boolean {
  return track("PageView", {});
}

/** A template looked at in the gallery: chosen, or its live demo opened. */
export function viewContent(template: {
  id: string;
  name: string;
  pricePaise: number;
}): boolean {
  return track("ViewContent", {
    content_name: template.name,
    content_ids: [template.id],
    content_type: "product",
    value: rupees(template.pricePaise),
    currency: "INR",
  });
}

/**
 * A new account's first sign in. Once per browser: the cookie is cleared and
 * a flag is kept once it has been sent.
 */
export function completeRegistration(): boolean {
  const clear = (): void => {
    document.cookie = `${NEW_ACCOUNT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
  };

  if (readStore(REGISTERED_KEY) !== null) {
    clear();
    return false;
  }

  return track(
    "CompleteRegistration",
    {},
    {
      onSent: () => {
        writeStore(REGISTERED_KEY, "1");
        clear();
      },
    },
  );
}

/** Pay pressed, for the amount the server's order charges. */
export function initiateCheckout(checkout: {
  templateId: string;
  amountPaise: number;
}): boolean {
  return track("InitiateCheckout", {
    value: rupees(checkout.amountPaise),
    currency: "INR",
    content_ids: [checkout.templateId],
  });
}

/** Taken in this page's life and perhaps not sent yet. */
const queuedPurchases = new Set<string>();

function firedPurchases(): string[] {
  try {
    const parsed: unknown = JSON.parse(readStore(PURCHASES_KEY) ?? "[]");

    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * A payment the server has confirmed: once per Razorpay payment id, which is
 * also the eventID Meta dedupes it on (and the one a Conversions API event
 * for the same payment must carry). The id is kept in this browser once it
 * has been sent.
 */
export function purchase(payment: {
  paymentId: string;
  templateId: string;
  amountPaise: number;
}): boolean {
  if (
    queuedPurchases.has(payment.paymentId) ||
    firedPurchases().includes(payment.paymentId)
  ) {
    return false;
  }

  queuedPurchases.add(payment.paymentId);

  return track(
    "Purchase",
    {
      value: rupees(payment.amountPaise),
      currency: "INR",
      content_ids: [payment.templateId],
    },
    {
      eventID: payment.paymentId,
      onSent: () => {
        /* The last fifty are plenty: a host pays once per invitation. */
        writeStore(
          PURCHASES_KEY,
          JSON.stringify([...firedPurchases(), payment.paymentId].slice(-50)),
        );
      },
    },
  );
}
