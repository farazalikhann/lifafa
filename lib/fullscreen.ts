/**
 * Taking the browser's chrome off an invitation, where the browser allows it.
 *
 * A guest opens a link and gets an address bar across the top of somebody's
 * wedding card. The Fullscreen API is the only way to take it away, and it is
 * only ever granted from inside a user gesture — which is exactly what "tap
 * seal to open" already is. Called from anywhere else it rejects, so the tap
 * handler is the one place this belongs.
 *
 * WHAT THIS DOES NOT DO, and cannot:
 *
 * iPhone Safari has no Fullscreen API at all. `requestFullscreen` is absent on
 * every element except <video>, and no amount of markup, meta tag or gesture
 * changes that — Apple does not offer a page fullscreen to the web. An iPhone
 * guest keeps Safari's bars, which collapse on scroll the way they do on every
 * site, and the card is laid out in dvh and svh so it fits either way. The one
 * route to a genuinely chromeless page on iOS is Add to Home Screen, and a
 * wedding guest is not going to install an invitation.
 *
 * So this is an enhancement for the browsers that have it (Chrome, Firefox and
 * Samsung Internet on Android, and desktop) and silently nothing everywhere
 * else. Nothing about the card depends on it.
 */

/**
 * Whether this browser will put the page into fullscreen at all.
 *
 * Two separate questions and neither implies the other: whether the method
 * exists — it does not on iPhone Safari — and whether the document is allowed
 * to use it, which is false inside an iframe that was not given
 * `allowfullscreen`, where the method exists and always rejects.
 */
function canRequestFullscreen(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof document.documentElement.requestFullscreen === "function" &&
    document.fullscreenEnabled === true
  );
}

/**
 * Put the whole page into fullscreen, if this browser does that.
 *
 * The document element rather than the cover the guest tapped, deliberately:
 * the browser drops out of fullscreen the moment the fullscreen element leaves
 * the DOM, and the cover unmounts as soon as it has finished opening — which
 * is the exact moment the card is supposed to be filling the screen. The root
 * element is the one thing that outlives every transition on this page.
 *
 * Never throws and never reports. A guest who taps a seal is asking to see an
 * invitation; a dialog about a display mode is not an answer to that, and the
 * page is complete with the address bar still on it.
 */
export function enterFullscreen(): void {
  if (!canRequestFullscreen() || document.fullscreenElement !== null) {
    return;
  }

  /*
    `navigationUI: "hide"` asks for the system navigation to go too, and is a
    hint rather than a promise — a browser that does not understand it ignores
    the option and gives plain fullscreen, which is the thing we came for.
  */
  void document.documentElement
    .requestFullscreen({ navigationUI: "hide" })
    .catch(() => {
      /* Denied, or the gesture had already expired. The card is fine as it is. */
    });
}
