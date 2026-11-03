/**
 * Instagram's and Facebook's in-app browsers, and the way out of them.
 *
 * Google refuses to sign anyone in from inside an app's own web view, so a
 * host who taps an ad there can design a card but cannot save it. They are
 * let be until they press "Save and continue"; then the card is saved on the
 * server (lib/handoff/actions.ts) and they are sent to /login in a real
 * browser with its id (components/browser/useInAppHandoff.tsx).
 *
 * INSTAGRAM AND FACEBOOK ONLY. Instagram's web view puts "Instagram" in the
 * user agent; Facebook's puts FBAN, FBAV or FB_IAB. Every other browser,
 * Chrome and Safari included, is left alone.
 */

export type InAppPlatform = "android" | "ios";
export type InAppApp = "instagram" | "facebook";

export interface InAppBrowser {
  app: InAppApp;
  platform: InAppPlatform;
}

/**
 * Which app's browser this is, and on what, from the user agent; null for any
 * ordinary browser. Anything that is not Android gets the iPhone treatment.
 */
export function inAppBrowser(userAgent: string): InAppBrowser | null {
  const app: InAppApp | null = userAgent.includes("Instagram")
    ? "instagram"
    : /FBAN|FBAV|FB_IAB/.test(userAgent)
      ? "facebook"
      : null;

  if (app === null) {
    return null;
  }

  return { app, platform: /Android/i.test(userAgent) ? "android" : "ios" };
}

/** The app's name as a visitor knows it. */
export function inAppName(app: InAppApp): string {
  return app === "instagram" ? "Instagram" : "Facebook";
}

/**
 * An Android intent link that opens this exact address in Chrome: the same
 * path and the same query, fbclid and utm tags included, so the ad still gets
 * the visit. Without Chrome, Android loads browser_fallback_url, the address
 * as it was. A fragment cannot ride inside an intent (its own syntax starts
 * at #Intent), so only the fallback keeps one.
 */
export function chromeIntentUrl(href: string): string {
  const url = new URL(href);
  const scheme = url.protocol.replace(/:$/, "");

  return (
    `intent://${url.host}${url.pathname}${url.search}` +
    `#Intent;scheme=${scheme};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(url.href)};end`
  );
}

/** The same address with x-safari-https:// in front, which iOS hands to Safari. */
export function safariUrl(href: string): string {
  const url = new URL(href);
  return `x-safari-${url.protocol}//${url.host}${url.pathname}${url.search}${url.hash}`;
}

/*
  THE AD'S TAGS. fbclid ties a visit to the ad that was tapped, and the utm
  tags say which campaign. They arrive on the landing page and are gone from
  the address a page or two later, so they are kept for the session (in this
  module too, for when storage is blocked) and put back on the link to the
  real browser.
*/

const AD_PARAMS = [
  "fbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
] as const;

const AD_PARAMS_KEY = "lifafa.inApp.adParams";

let adParamsInMemory: Record<string, string> | null = null;

/** Keeps the ad's tags from this address, if it has any. Never throws. */
export function rememberAdParams(search: string): void {
  const params = new URLSearchParams(search);
  const found: Record<string, string> = {};

  for (const key of AD_PARAMS) {
    const value = params.get(key);

    if (value !== null && value !== "") {
      found[key] = value;
    }
  }

  if (Object.keys(found).length === 0) {
    return;
  }

  adParamsInMemory = found;

  try {
    window.sessionStorage.setItem(AD_PARAMS_KEY, JSON.stringify(found));
  } catch {
    /* Private mode or blocked storage: the in-memory copy still holds. */
  }
}

function rememberedAdParams(): Record<string, string> {
  if (adParamsInMemory !== null) {
    return adParamsInMemory;
  }

  try {
    const parsed: unknown = JSON.parse(
      window.sessionStorage.getItem(AD_PARAMS_KEY) ?? "null",
    );

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    const kept: Record<string, string> = {};

    for (const key of AD_PARAMS) {
      const value: unknown = (parsed as Record<string, unknown>)[key];

      if (typeof value === "string") {
        kept[key] = value;
      }
    }

    return kept;
  } catch {
    return {};
  }
}

/** The address with the ad's tags on it, where it does not carry its own already. */
export function withAdParams(href: string): string {
  const url = new URL(href);
  const current = new URLSearchParams(window.location.search);

  for (const key of AD_PARAMS) {
    const value = current.get(key) ?? rememberedAdParams()[key];

    if (value !== undefined && value !== "" && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  return url.href;
}

/**
 * A path on this site with the ad's tags on it: withAdParams for a link that
 * stays on the site ("/demo/emerald-shahi", "/create?template=..."), so the
 * visit can still be told apart from one that came without an ad.
 */
export function withAdParamsPath(path: string): string {
  const url = new URL(withAdParams(new URL(path, window.location.origin).href));

  return `${url.pathname}${url.search}${url.hash}`;
}
