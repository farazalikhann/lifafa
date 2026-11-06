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
 * ad's landing page quickly is still counted; on /create it waits for the
 * page to have loaded (lazyOnload, components/analytics/MetaPixel.tsx), as
 * nothing sent there waits for it. Events asked for before that
 * wait here, each with the address it was asked for on, and go once it has.
 *
 * EXCEPT PAGEVIEW AND VIEWCONTENT, WHICH GO AT ONCE. On a slow phone
 * fbevents.js can take seconds, and a visitor who leaves before it has loaded
 * (or taps "See live demo", which opens /demo, where the pixel may not run)
 * takes every event waiting here with them. So these two never wait for
 * fbevents.js and never go through it: each is one request to the image
 * endpoint, made as a keepalive fetch that the browser finishes after the
 * page has gone (an image where fetch cannot be used), and never both. fbq is
 * never asked for a PageView, so it cannot send a second one. Held, they wait
 * for the release instead of being dropped. PageView once per path, as
 * before; ViewContent once per template per tab (sessionStorage).
 *
 * THE CLICK ID GOES WITH EVERY EVENT WE SEND OURSELVES. An event sent before
 * fbevents.js has loaded finds none of its cookies yet, so they are made
 * here the way it makes them, on the same domain and in the same format, and
 * it takes them over when it loads: _fbp, the browser id, when there is none,
 * and _fbc, the click id, from the fbclid in the address (or the one kept for
 * the session, lib/inAppBrowser.ts) when it has none for that click. Both are
 * a random number or the ad's own id, nothing about the person.
 */

const PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "").trim();

export const FBEVENTS_SRC = "https://connect.facebook.net/en_US/fbevents.js";
const TRACK_ENDPOINT = "https://www.facebook.com/tr/";
/**
 * The `v` fbevents.js reports, for an event sent before it has loaded; once it
 * has, its own (window.fbq.version) is used. Last seen November 2026.
 */
const FBEVENTS_VERSION = "2.9.437";
/** How long fbevents.js keeps _fbp and _fbc: ninety days. */
const META_COOKIE_SECONDS = 90 * 24 * 60 * 60;
/** Where lib/inAppBrowser.ts keeps the ad's tags for the session (its AD_PARAMS_KEY). */
const AD_PARAMS_KEY = "lifafa.inApp.adParams";

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
  /** One of Meta's own events (fbq "track"), or one of ours ("trackCustom"). */
  custom: boolean;
  /** Sent at once as a keepalive request, never through fbevents.js; waits only for a hold's release. */
  keepalive: boolean;
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
/** When the pixel was installed on this page: fbevents.js reports it as `it`. */
let initTime: number | null = null;

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
 * is a trackCustom and is dropped before consent is given back, since the
 * page it was made for is gone. Our own custom events never wait in that
 * queue: deliver hands one to fbevents.js only once it has loaded and while
 * consent is granted, so it runs at once, and otherwise sends it as an image.
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
 * Writes one of fbevents.js's cookies as it does: `fb.<index>.<time>.<tail>`
 * on the widest domain this site may set a cookie on (getlifafa.co.in, so
 * www and the bare domain share it), where `index` is that domain's number of
 * dots, for ninety days. Returns the value, which is still the one to send
 * when cookies are blocked: then with index 1, as Meta asks of a value no
 * cookie holds.
 */
function writeMetaCookie(name: string, time: number, tail: string): string {
  const host = window.location.hostname;
  const labels = host.split(".");
  const isAddress = /^[\d.]+$/.test(host) || host.includes(":");
  const attributes = `Path=/; Max-Age=${META_COOKIE_SECONDS}; SameSite=Lax`;

  /* From the shortest: a browser refuses a public suffix (in, co.in), so the first that holds is the site's own. */
  if (!isAddress && labels.length > 1) {
    for (let count = 2; count <= labels.length; count += 1) {
      const value = `fb.${count - 1}.${time}.${tail}`;
      document.cookie = `${name}=${value}; Domain=${labels.slice(-count).join(".")}; ${attributes}`;

      if (readCookie(name) === value) {
        return value;
      }
    }
  }

  const value = `fb.${labels.length - 1}.${time}.${tail}`;
  document.cookie = `${name}=${value}; ${attributes}`;

  return readCookie(name) === value ? value : `fb.1.${time}.${tail}`;
}

/** Sixteen random digits, as fbevents.js's own browser ids have. */
function randomDigits(): string {
  const bytes = new Uint8Array(16);

  try {
    crypto.getRandomValues(bytes);
  } catch {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }

  return Array.from(bytes, (byte, index) => String(index === 0 ? 1 + (byte % 9) : byte % 10)).join("");
}

/** The browser id: fbevents.js's _fbp, made here first when it has not made one. */
function browserId(time: number): string {
  return readCookie("_fbp") ?? writeMetaCookie("_fbp", time, randomDigits());
}

/** The ad's fbclid kept for the session by lib/inAppBrowser.ts, if any. */
function storedFbclid(): string | null {
  try {
    const parsed: unknown = JSON.parse(readStore(AD_PARAMS_KEY, "session") ?? "null");
    const value: unknown =
      typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>).fbclid
        : undefined;

    return typeof value === "string" && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * The click id: _fbc as fbevents.js keeps it. A new click (an fbclid in the
 * address the cookie is not for) makes a new one, as it does; with no cookie,
 * the fbclid kept for the session makes one; with neither, there is none.
 */
function clickId(time: number): string | null {
  const cookie = readCookie("_fbc");
  const forClick = (fbclid: string): boolean =>
    cookie !== null && cookie.split(".").slice(3).join(".") === fbclid;
  const inAddress = here().searchParams.get("fbclid");

  if (inAddress !== null && inAddress.length > 0) {
    return forClick(inAddress) ? cookie : writeMetaCookie("_fbc", time, inAddress);
  }

  if (cookie !== null) {
    return cookie;
  }

  const stored = storedFbclid();

  return stored === null ? null : writeMetaCookie("_fbc", time, stored);
}

/**
 * One event's address at Meta's image endpoint, with the page written out. The
 * parameters fbevents.js sends that tie an event to the ad's click and to this
 * browser (fbc, fbp; see the top of this file), its version, and the event's
 * own. The reported referrer is an origin.
 */
function trackUrl(event: Pending): string {
  const version = window.fbq?.version;
  const query = new URLSearchParams({
    id: PIXEL_ID,
    ev: event.name,
    dl: event.page.href,
    rl: document.referrer.length > 0 ? new URL(document.referrer).origin : "",
    if: String(window.top !== window),
    ts: String(event.time),
    sw: String(window.screen.width),
    sh: String(window.screen.height),
    v: version !== undefined && version !== "2.0" ? version : FBEVENTS_VERSION,
    r: "stable",
    it: String(initTime ?? event.time),
    tz: String(-new Date().getTimezoneOffset()),
    coo: "false",
    fbp: browserId(event.time),
  });

  const fbc = clickId(event.time);

  if (fbc !== null) {
    query.set("fbc", fbc);
  }

  if (event.eventID !== undefined) {
    query.set("eid", event.eventID);
  }

  for (const [key, value] of Object.entries(event.params)) {
    query.set(
      `cd[${key}]`,
      typeof value === "object" ? JSON.stringify(value) : String(value),
    );
  }

  return `${TRACK_ENDPOINT}?${query.toString()}`;
}

/** One event as an image, the way the pixel's own <noscript> sends one. No referrer header. */
function sendImage(event: Pending): void {
  const image = new Image();
  image.referrerPolicy = "no-referrer";
  image.src = trackUrl(event);
}

/**
 * One event as a keepalive fetch: the same GET the image makes, cookies and
 * all, which the browser finishes even when the page is left a moment later.
 * An image where fetch cannot be used. A fetch that fails later is not tried
 * again, so the event can never reach Meta twice.
 */
function sendKeepalive(event: Pending): void {
  const url = trackUrl(event);

  try {
    void fetch(url, {
      method: "GET",
      mode: "no-cors",
      credentials: "include",
      cache: "no-store",
      keepalive: true,
      referrerPolicy: "no-referrer",
    }).catch(() => undefined);
  } catch {
    sendImage(event);
  }
}

/**
 * Sends one event: a keepalive one as a keepalive request; any other through
 * fbevents.js when it is loaded and the event was asked for on this very
 * page, which it may report as it is; otherwise to the image endpoint with
 * the address it was asked for on.
 */
function deliver(event: Pending): void {
  syncConsent();

  const fbq = window.fbq;
  const current = reportedPage(here());

  if (event.keepalive) {
    sendKeepalive(event);
  } else if (
    fbq?.callMethod !== undefined &&
    consentGranted &&
    event.page.asIs &&
    current.asIs &&
    event.page.href === current.href
  ) {
    fbq(
      event.custom ? "trackCustom" : "track",
      event.name,
      event.params,
      event.eventID === undefined ? undefined : { eventID: event.eventID },
    );
  } else {
    sendImage(event);
  }

  event.onSent?.();
}

/** Whether a taken event may go now: this page may send, and fbevents.js has settled unless it is a keepalive one. */
function ready(event: Pending): boolean {
  return mayRun() && (event.keepalive || state === "settled");
}

/** Sends what has waited and may go now; the rest waits on. */
function flush(): void {
  if (!mayRun()) {
    return;
  }

  for (const event of pending.splice(0)) {
    if (ready(event)) {
      deliver(event);
    } else {
      pending.push(event);
    }
  }
}

/**
 * Whether the event was taken: queued or sent. Never on a page the pixel may
 * not run on. While held, a keepalive event is queued for the release and any
 * other is dropped.
 */
function track(
  name: string,
  params: EventParams,
  options: {
    eventID?: string;
    onSent?: () => void;
    custom?: boolean;
    keepalive?: boolean;
  } = {},
): boolean {
  const keepalive = options.keepalive ?? false;

  if (
    !metaPixelEnabled() ||
    typeof window === "undefined" ||
    !pixelAllowedOn(window.location.pathname) ||
    (holds > 0 && !keepalive)
  ) {
    return false;
  }

  const event: Pending = {
    name,
    custom: options.custom ?? false,
    keepalive,
    params,
    eventID: options.eventID,
    onSent: options.onSent,
    page: reportedPage(here()),
    time: Date.now(),
  };

  if (ready(event)) {
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
  initTime = Date.now();
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
/** In sessionStorage: the templates this tab has sent ViewContent for. */
const VIEWED_KEY = "lifafa.meta.viewed";

type StoreArea = "local" | "session";

function readStore(key: string, area: StoreArea = "local"): string | null {
  try {
    return (area === "session" ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string, area: StoreArea = "local"): void {
  try {
    (area === "session" ? window.sessionStorage : window.localStorage).setItem(key, value);
  } catch {
    /* Private mode or blocked storage: the page's own record, or Meta's eventID dedupe, still holds. */
  }
}

/** A page view: sent at once, never through fbq, so it is sent once (see the top of this file). */
export function pageView(): boolean {
  return track("PageView", {}, { keepalive: true });
}

/** Taken in this page's life and perhaps not sent yet. */
const viewedTemplates = new Set<string>();

function viewedThisSession(): string[] {
  try {
    const parsed: unknown = JSON.parse(readStore(VIEWED_KEY, "session") ?? "[]");

    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * A template looked at in the gallery: chosen, or its live demo opened. Once
 * per template per tab, and sent at once so a tap that leaves the page is
 * still counted (see the top of this file). `content_name` is the template's
 * id and `content_category` its tier, the collection it is sold in.
 */
export function viewContent(template: {
  id: string;
  tier: "premium" | "traditions";
  pricePaise: number;
}): boolean {
  if (viewedTemplates.has(template.id) || viewedThisSession().includes(template.id)) {
    return false;
  }

  const taken = track(
    "ViewContent",
    {
      content_name: template.id,
      content_category: template.tier,
      content_ids: [template.id],
      content_type: "product",
      value: rupees(template.pricePaise),
      currency: "INR",
    },
    {
      keepalive: true,
      onSent: () => {
        writeStore(
          VIEWED_KEY,
          JSON.stringify([...viewedThisSession(), template.id]),
          "session",
        );
      },
    },
  );

  if (taken) {
    viewedTemplates.add(template.id);
  }

  return taken;
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

/**
 * A visitor in Instagram's or Facebook's in-app browser being sent to the real
 * one (lib/inAppBrowser.ts). A custom event: `platform` is android or ios,
 * `app` is instagram or facebook, and `step` is save ("Save and continue" in
 * the wizard, components/browser/useInAppHandoff.tsx) or signin (the button
 * in the prompt on /login, components/browser/InAppLoginPrompt.tsx).
 */
export function openInBrowserClick(click: {
  platform: "android" | "ios";
  app: "instagram" | "facebook";
  step: "save" | "signin";
}): boolean {
  return track(
    "OpenInBrowserClick",
    { platform: click.platform, app: click.app, step: click.step },
    { custom: true },
  );
}
