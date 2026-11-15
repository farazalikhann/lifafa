import { inAppBrowser, type InAppBrowser } from "@/lib/inAppBrowser";

/**
 * When the "open in Chrome" sheet may come up (components/browser/StartInChrome.tsx).
 * Small and without imports beyond lib/inAppBrowser.ts, because the gate that
 * reads it is on every page of the site.
 *
 * ON THE FIRST PAGE A VISITOR OPENS, whatever it is: the home page (the
 * Instagram bio link), /create, a demo, a policy page. Never on a guest's
 * invitation (/i), the host's pages (/dashboard, /checkin), sign in (/login,
 * /auth), /admin, or a saved card's payment page (/create?event=...). A visit
 * that starts on one of those meets the sheet on the first allowed page after.
 *
 * ONCE PER SESSION, in this tab's session storage: shown once, and not again
 * after "Continue here" or anything else.
 *
 * THE TEST SWITCH. `?inapp_test=1` on the address treats any browser as
 * Instagram's and ignores the once-per-session mark, so the sheet can be
 * checked from a desktop or a phone's own Chrome. Taken off the link the
 * sheet opens in the real browser.
 */

/** The address switch that shows the sheet in any browser, every time. */
export const IN_APP_TEST_PARAM = "inapp_test";

/** Set for the session once the sheet has been shown. */
const SHOWN_KEY = "lifafa.inApp.startSheetShown";
/** The same, where the browser keeps no session storage. */
let shownInMemory = false;

/** Pages the sheet never comes up on, with everything under them. */
const NEVER_ON = ["/i", "/dashboard", "/checkin", "/login", "/auth", "/admin", "/api"];

export function inAppTest(search: string): boolean {
  return new URLSearchParams(search).get(IN_APP_TEST_PARAM) === "1";
}

/**
 * Instagram's or Facebook's browser, or any browser under the test switch
 * (as Instagram, on the platform its user agent names). Null otherwise.
 */
export function startSheetBrowser(userAgent: string, search: string): InAppBrowser | null {
  const found = inAppBrowser(userAgent);

  if (found !== null || !inAppTest(search)) {
    return found;
  }

  return { app: "instagram", platform: /iPhone|iPad|iPod/i.test(userAgent) ? "ios" : "android" };
}

/** Whether the sheet may come up on this page. */
export function startSheetAllowedOn(pathname: string, search: string): boolean {
  if (NEVER_ON.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  /* A saved card's payment page (app/create/page.tsx). */
  return !(pathname === "/create" && new URLSearchParams(search).has("event"));
}

export function startSheetShown(): boolean {
  if (shownInMemory) {
    return true;
  }

  try {
    return window.sessionStorage.getItem(SHOWN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markStartSheetShown(): void {
  shownInMemory = true;

  try {
    window.sessionStorage.setItem(SHOWN_KEY, "1");
  } catch {
    /* Private mode or blocked storage: the in-memory mark still holds for this page. */
  }
}
