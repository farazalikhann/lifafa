/**
 * Instagram's in-app browser, and the way out of it.
 *
 * Google refuses to sign anyone in from inside an app's own web view, so a
 * host who taps an Instagram ad cannot finish here. They also cannot carry a
 * half made card across: the draft lives in this browser's storage
 * (lib/pendingCard.ts), and Chrome has its own. So they are asked to move
 * before they start (components/browser/OpenInChromePrompt.tsx).
 *
 * INSTAGRAM ONLY. Its web view, on Android and on iOS, puts "Instagram" in
 * the user agent. Facebook's own in-app browser says FBAN or FB_IAB instead,
 * and is left alone, as is every ordinary browser.
 */

export type InstagramPlatform = "android" | "ios";

/**
 * Which Instagram this is, from the user agent, or null when it is not
 * Instagram at all. Anything that is not Android gets the iPhone treatment:
 * written steps, which are right anywhere a button cannot open a browser.
 */
export function instagramPlatform(userAgent: string): InstagramPlatform | null {
  if (!userAgent.includes("Instagram")) {
    return null;
  }

  return /Android/i.test(userAgent) ? "android" : "ios";
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
