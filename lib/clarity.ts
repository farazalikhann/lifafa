/**
 * Microsoft Clarity: heatmaps and session recordings, to see how hosts use
 * the site.
 *
 * HOSTS ONLY, NEVER GUESTS. Clarity runs on the home page (and its pricing
 * section), /create (the editor, and the saved card's checkout), /login and
 * the sample invitations under /demo (a template's live demo, and the home
 * page's sample), the list in clarityAllowedOn below: a visitor there is
 * choosing a design, and the card is a made-up wedding. It never runs on a
 * guest's invitation (/i), check-in, the host's dashboard or /admin. Guests
 * have not agreed to be recorded. The Meta pixel stays off /demo all the same
 * (lib/metaPixel.ts).
 *
 * PRODUCTION DOMAIN ONLY. Off unless NEXT_PUBLIC_CLARITY_ID is set, the build
 * is a production one, and the page is served from getlifafa.co.in. So
 * localhost and Vercel preview addresses never load it.
 *
 * LEAVING AN ALLOWED PAGE. Clarity follows client-side navigation itself: it
 * wraps history.pushState and, when the address changes, stops and starts
 * again 250ms later, wherever the host now is. A host can go from the saved
 * card on /create to their guest list or their invitation without a page
 * load, so that restart would record a guest page. guardClarityNavigation
 * below stops Clarity before the address changes, and starts it again only if
 * the new page is allowed. Clarity's own restart then never fires: it only
 * schedules one while it is running.
 *
 * Host-typed text on the allowed pages is masked with data-clarity-mask: the
 * editor's fields, the card preview and the help form, and on a sample the
 * reply form and its answer, where a visitor may type their own name.
 */

const CLARITY_ID = (process.env.NEXT_PUBLIC_CLARITY_ID ?? "").trim();

const PRODUCTION_HOSTS: ReadonlySet<string> = new Set([
  "getlifafa.co.in",
  "www.getlifafa.co.in",
]);

/** Each with everything under it. "/" is the home page alone. */
const ALLOWED_PREFIXES = ["/create", "/login"];

/** A sample invitation: /demo/<template>, or /demo/nikah. One segment, nothing under it. */
const SAMPLE_PATH = /^\/demo\/[a-z0-9-]+$/;

type ClarityFn = ((...args: unknown[]) => void) & {
  q?: unknown[];
  /** Set by clarity.js once it has loaded: its version. */
  v?: unknown;
  /** Set by Clarity's tag once it has injected clarity.js. */
  t?: boolean;
};

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

/** Whether this build may load Clarity at all. */
export function clarityEnabled(): boolean {
  return CLARITY_ID.length > 0 && process.env.NODE_ENV === "production";
}

/** Whether Clarity may run on this path. An allow list: new routes stay out until added. */
export function clarityAllowedOn(pathname: string): boolean {
  return (
    pathname === "/" ||
    SAMPLE_PATH.test(pathname) ||
    ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

/** Whether this page is served from the production domain. */
export function clarityHostAllowed(): boolean {
  return PRODUCTION_HOSTS.has(window.location.hostname);
}

/** Microsoft's official snippet, with this build's project id. */
export function claritySnippet(): string {
  return `(function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", ${JSON.stringify(CLARITY_ID)});`;
}

/**
 * running: loading, or recording. paused: stopped by us, on a page it may not
 * see. off: the host left for such a page before clarity.js had loaded, so it
 * is kept from loading at all for the rest of this page's life.
 */
let state: "running" | "paused" | "off" = "running";
let guarded = false;
/** The address Clarity last saw, without its fragment. */
let current = "";

/** An address without its fragment, as Clarity compares them. */
function pageOf(href: string | URL): string {
  const url = new URL(href, window.location.href);
  url.hash = "";
  return url.href;
}

/**
 * Before the address changes to `next`. Stops Clarity if it is running, and
 * answers whether to start it again once the new page is in place.
 */
function leave(next: string): boolean {
  const allowed = clarityAllowedOn(new URL(next).pathname);

  if (state === "off") {
    return false;
  }

  if (state === "paused") {
    if (allowed) {
      state = "running";
    }

    return allowed;
  }

  const clarity = window.clarity;

  if (clarity?.v === undefined) {
    /*
      Not loaded yet. Allowed, it starts on the new page when it loads.
      Otherwise a function carrying `v` and `t` takes its place: both
      Clarity's tag and clarity.js read that as "Clarity is already here",
      and neither starts.
    */
    if (!allowed) {
      window.clarity = Object.assign(() => undefined, { v: "off", t: true, q: [] });
      state = "off";
    }

    return false;
  }

  clarity("stop");
  state = allowed ? "running" : "paused";

  return allowed;
}

function arrive(start: boolean): void {
  current = pageOf(window.location.href);

  if (start) {
    window.clarity?.("start");
  }
}

function wrap(method: "pushState" | "replaceState"): void {
  const original = window.history[method];

  window.history[method] = function (
    this: History,
    data: unknown,
    unused: string,
    url?: string | URL | null,
  ): void {
    const next = url === undefined || url === null ? current : pageOf(url);
    const start = next !== current ? leave(next) : false;

    original.call(this, data, unused, url);
    arrive(start);
  };
}

/**
 * Installs the stop-before-leaving guard. Called once, before the snippet is
 * put on the page, so the guard is in place before Clarity starts.
 *
 * Back and forward: a capturing listener on window runs before Clarity's own
 * (which does not capture, and is added later). Stopping Clarity removes its
 * listener, so it is not called for that navigation and schedules nothing.
 */
export function guardClarityNavigation(): void {
  if (guarded) {
    return;
  }

  guarded = true;
  current = pageOf(window.location.href);
  wrap("pushState");
  wrap("replaceState");

  window.addEventListener(
    "popstate",
    () => {
      const next = pageOf(window.location.href);

      if (next !== current) {
        arrive(leave(next));
      }
    },
    { capture: true },
  );
}

/**
 * The sign-in funnel, as Clarity custom events: to see where hosts with a
 * card leave between "Save and continue" and their account. Clarity only,
 * never the Meta pixel.
 *
 * - login_view_with_card: the sign-in page showed the visitor's own card.
 * - login_google_click: Continue with Google was pressed.
 * - login_email_code_sent: a sign-in code was sent by email (the first, or a
 *   new one).
 * - login_email_code_verified: the code was accepted.
 * - login_email_code_failed: sending or checking a code failed. Why is the
 *   session's login_email_code_failed_reason tag (lib/auth/emailCode.ts).
 * - login_success: back from a sign in (marked by app/auth/callback/route.ts
 *   in SIGNED_IN_COOKIE, read by components/analytics/Clarity.tsx).
 * - handoff_open_failed: from Instagram's or Facebook's browser, "Open in
 *   Chrome" (Safari) on /login did not open it, or the card could not be
 *   saved for it (components/browser/OpenInChromePrompt.tsx).
 */
export type ClarityEventName =
  | "login_view_with_card"
  | "login_google_click"
  | "login_email_code_sent"
  | "login_email_code_verified"
  | "login_email_code_failed"
  | "login_success"
  | "handoff_open_failed"
  /* "Save and continue" measured from the press to the saved card on screen (lib/saveTiming.ts). */
  | "save_timing"
  /* The saved card had not opened 8 seconds after the save, so the page was loaded directly. */
  | "save_watchdog"
  /* Back from sign in, the saved card had not opened 8 seconds after its save, so it was loaded directly. */
  | "open_saved_fallback"
  /*
    "Save and continue" pressed on a new card; the session's
    save_and_continue_step tag says on which step (details, customize or preview).
  */
  | "save_and_continue_click"
  /* Back from sign-in on an empty gallery, with no card to bring back (components/wizard/Wizard.tsx). */
  | "card_lost_after_login"
  /* Back from sign-in with the handoff gone, and the card brought back from this phone's autosave. */
  | "card_restored_after_login";

/** Set for a few minutes by a successful sign in; holds "1" and nothing else. */
export const SIGNED_IN_COOKIE = "lifafa_signed_in";

/**
 * Sends one event, where Clarity runs. Clarity's tag may not have loaded yet
 * (on /create it waits for the page), so its usual queue is put in place
 * first and the event waits in it; the tag keeps that queue when it arrives.
 * Off the pages and addresses Clarity is allowed on, nothing is sent.
 */
export function clarityEvent(name: ClarityEventName): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.clarity === undefined) {
    if (!clarityEnabled() || !clarityHostAllowed() || !clarityAllowedOn(window.location.pathname)) {
      return;
    }

    const queue: ClarityFn = Object.assign(
      (...args: unknown[]): void => {
        (queue.q ??= []).push(args);
      },
      { q: [] as unknown[] },
    );
    window.clarity = queue;
  }

  try {
    window.clarity("event", name);
  } catch {
    /* Measuring must never break the page. */
  }
}

/**
 * Tags the session with a value (a timing, a phase), where Clarity runs, on
 * the same terms as clarityEvent: Clarity filters sessions by tag, and an
 * event alone carries no number. Values are strings, as Clarity takes them.
 */
export function claritySet(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  if (window.clarity === undefined) {
    if (!clarityEnabled() || !clarityHostAllowed() || !clarityAllowedOn(window.location.pathname)) {
      return;
    }

    const queue: ClarityFn = Object.assign(
      (...args: unknown[]): void => {
        (queue.q ??= []).push(args);
      },
      { q: [] as unknown[] },
    );
    window.clarity = queue;
  }

  try {
    window.clarity("set", key, value);
  } catch {
    /* Measuring must never break the page. */
  }
}
