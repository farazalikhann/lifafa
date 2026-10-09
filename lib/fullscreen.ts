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

import { coverDebug, coverDebugOn } from "@/lib/coverDebug";

/**
 * The longest a tap waits to hear that the screen has changed. Chrome on
 * Android says so in about a fifth of a second; a browser that never says so
 * is not waited on for longer than this.
 */
const SETTLE_TIMEOUT_MS = 450;

/**
 * The longest the two frames after it are waited for. A frame is a sixtieth
 * of a second; a tab whose frames have stopped is not a reason to keep a
 * guest on a closed cover.
 */
const FRAMES_TIMEOUT_MS = 300;

/**
 * `?nofs=1` on the link: fullscreen is never asked for. For telling, on a real
 * phone, a fault of the fullscreen switch from a fault of the cover.
 */
function fullscreenSkipped(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("nofs") === "1";
  } catch {
    return false;
  }
}

/* When fullscreen was last asked for, for the log to time the answer from. */
let askedAt = 0;
let watching = false;

/** Under `?coverdebug=1`: every change of fullscreen and of the screen's size, timed from the tap. */
function watchScreen(): void {
  if (watching || !coverDebugOn()) {
    return;
  }

  watching = true;

  const size = (): string => `${window.innerWidth}x${window.innerHeight}`;
  const since = (): string => `${Math.round(performance.now() - askedAt)} ms after the tap`;

  document.addEventListener("fullscreenchange", () => {
    coverDebug(
      `fullscreenchange (${document.fullscreenElement !== null ? "in" : "out"}) ${since()}, ${size()}`,
    );
  });
  document.addEventListener("fullscreenerror", () => {
    coverDebug(`fullscreenerror ${since()}`);
  });
  window.addEventListener("resize", () => {
    coverDebug(`resize ${since()}, ${size()}`);
  });
}

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
  void requestPageFullscreen();
}

/**
 * The request itself. Null when nothing was asked for, so nothing is coming;
 * otherwise the browser's answer, which never rejects: true for granted.
 */
function requestPageFullscreen(): Promise<boolean> | null {
  watchScreen();
  askedAt = performance.now();

  if (fullscreenSkipped()) {
    coverDebug("fullscreen not asked for: ?nofs=1");
    return null;
  }

  if (!canRequestFullscreen()) {
    coverDebug("fullscreen not asked for: this browser has none");
    return null;
  }

  if (document.fullscreenElement !== null) {
    coverDebug("fullscreen not asked for: already in it");
    return null;
  }

  coverDebug(`requestFullscreen() called, ${window.innerWidth}x${window.innerHeight}`);

  /*
    `navigationUI: "hide"` asks for the system navigation to go too, and is a
    hint rather than a promise — a browser that does not understand it ignores
    the option and gives plain fullscreen, which is the thing we came for.
  */
  try {
    return document.documentElement.requestFullscreen({ navigationUI: "hide" }).then(
      () => true,
      /* Denied, or the gesture had already expired. The card is fine as it is. */
      () => false,
    );
  } catch {
    return null;
  }
}

/**
 * Fullscreen asked for now, inside the tap, and `done` called once the screen
 * has stopped changing under the page. Returns how to call it off.
 *
 * THE SCREEN CHANGES SIZE A MOMENT AFTER THE TAP, NOT ON IT. On an Android
 * phone the browser takes its bars away about a fifth of a second later and
 * the page is laid out and painted again at the new height. A cover that had
 * started to open by then, its ground gone clear and its film just starting,
 * was caught half way by that repaint, and the guest saw a black screen. So
 * nothing is started until the browser has said the change is done
 * (`fullscreenchange`), and the page has then painted twice at its new size.
 *
 * Never left waiting: a browser that says nothing is given 450 ms, one that
 * refuses is taken at its word at once, and where nothing was asked for, an
 * iPhone or a page already in fullscreen, there is nothing to wait for and
 * only the two frames are.
 */
export function enterFullscreenThen(done: () => void): () => void {
  const startedAt = performance.now();
  let live = true;
  let settled = false;
  let timer = 0;
  let frame = 0;
  let net = 0;

  const since = (): number => Math.round(performance.now() - startedAt);

  const finish = (how: string): void => {
    if (!live) {
      return;
    }

    live = false;
    window.cancelAnimationFrame(frame);
    window.clearTimeout(net);
    coverDebug(`${how} ${since()} ms after the tap: the cover starts`);
    done();
  };

  const changed = (): void => settle("fullscreenchange");

  function settle(why: string): void {
    if (!live || settled) {
      return;
    }

    settled = true;
    window.clearTimeout(timer);
    document.removeEventListener("fullscreenchange", changed);
    coverDebug(`screen settled ${since()} ms after the tap: ${why}`);

    frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => finish("two frames painted"));
    });
    net = window.setTimeout(() => finish("no frames, not waited for"), FRAMES_TIMEOUT_MS);
  }

  const answer = requestPageFullscreen();

  if (answer === null) {
    settle("no fullscreen to wait for");
  } else {
    document.addEventListener("fullscreenchange", changed);
    timer = window.setTimeout(
      () => settle(`no fullscreenchange in ${SETTLE_TIMEOUT_MS} ms`),
      SETTLE_TIMEOUT_MS,
    );
    void answer.then((granted) => {
      if (!granted) {
        settle("fullscreen refused");
      }
    });
  }

  return () => {
    live = false;
    window.clearTimeout(timer);
    window.clearTimeout(net);
    window.cancelAnimationFrame(frame);
    document.removeEventListener("fullscreenchange", changed);
  };
}
