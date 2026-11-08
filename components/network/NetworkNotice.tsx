"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
} from "react";
import { usePathname } from "next/navigation";
import {
  loadNoticeState,
  serverLoadNoticeState,
  subscribeLoadNotice,
} from "@/lib/loadNotice";

/**
 * One small notice at the foot of the screen, for a page that is waiting on
 * the network: rendered once, by the root layout.
 *
 * BEFORE THE PAGE'S SCRIPTS HAVE RUN (the server's HTML, and the hydration
 * that matches it) it is the early notice below: hidden, then shown by the
 * stylesheet after 8 seconds with a "Try again" that is a real link, so it
 * appears on a line too slow to have brought the scripts at all. A small
 * script beside it answers a button tapped before the page can: the notice
 * says so at once, and the tap is made again when the page is ready.
 *
 * ONCE THE PAGE HAS RUN it says what lib/loadNotice.ts holds: a load that is
 * slow or failed, with its retry, and whether the browser is offline.
 *
 * Fixed, over the page and clear of the bars pinned to its foot, so it moves
 * nothing when it comes or goes. Not on a guest's invitation, check-in or the
 * owner's pages, which have their own loading screens.
 */

const HIDDEN_ON = [/^\/i\//, /^\/checkin(\/|$)/, /^\/admin(\/|$)/];

const subscribeToNothing = (): (() => void) => () => {};

/** The card kept as the visitor types (lib/cardAutosave.ts). */
const AUTOSAVE_KEY = "lifafa:card-autosave";

/** How long a tap made before the page was ready is kept to be made again: the notice has said it will work. */
const TAP_KEPT_MS = 60000;

declare global {
  interface Window {
    __lifafaReady?: boolean;
    __lifafaTap?: { el: Element; label: string; at: number };
  }
}

/*
  Runs as the server's HTML arrives. Marks the notice when a card is kept on
  this phone, shows it with the slow line 8 seconds from the start of the
  page load (the stylesheet alone counts from when it arrived), and
  holds a button tap made before the page is ready (stopped, so nothing
  half-loaded acts on it) for NetworkNotice to make again.
*/
const EARLY_SCRIPT = `(function(){var w=window,d=document,n=d.getElementById("lifafa-load-notice");if(!n||w.__lifafaEarly)return;w.__lifafaEarly=1;try{if(localStorage.getItem(${JSON.stringify(AUTOSAVE_KEY)}))n.setAttribute("data-kept","")}catch(e){}setTimeout(function(){n.setAttribute("data-slow","");n.setAttribute("data-show","")},Math.max(0,8000-performance.now()));d.addEventListener("click",function(e){if(w.__lifafaReady)return;var t=e.target,b=t&&t.closest?t.closest("button"):null;if(!b||b.disabled)return;e.preventDefault();e.stopImmediatePropagation();w.__lifafaTap={el:b,label:b.getAttribute("aria-label")||b.textContent.trim(),at:Date.now()};n.setAttribute("data-waiting","")},true)})();`;

const BOX =
  "lifafa-notice fixed inset-x-4 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-2.5 text-sm leading-snug text-[var(--lifafa-cream)] shadow-lg";
const RETRY =
  "inline-flex min-h-11 shrink-0 items-center rounded-full px-3 font-semibold text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:no-underline disabled:opacity-70";

function EarlyNotice(): ReactElement {
  return (
    <>
      {/*
        Hidden in its own style, not only by the stylesheet: the page can be
        painted before the rules below arrive (globals.css), and the notice
        must not show then. The stylesheet reveals it (an animation and
        !important rules outrank an inline style).
      */}
      <div
        id="lifafa-load-notice"
        role="status"
        className={`${BOX} lifafa-load-notice`}
        style={{ visibility: "hidden", opacity: 0 }}
      >
        <p className="min-w-0 flex-1">
          <span data-wait-line="" style={{ display: "none" }}>
            Loading. Your tap will work in a moment.
          </span>
          <span data-slow-line="">Your internet seems slow.</span>
          <span data-kept-line="" style={{ display: "none" }}>
            {" "}
            Your card is saved on this phone.
          </span>
        </p>
        {/* A real link: it reloads with or without the page's scripts. */}
        <a href="" data-slow-line="" className={RETRY}>
          Try again
        </a>
      </div>
      <script dangerouslySetInnerHTML={{ __html: EARLY_SCRIPT }} />
    </>
  );
}

/** Whether React is handling clicks on this element yet. */
function answersTaps(el: Element): boolean {
  return Object.entries(el).some(
    ([key, props]) =>
      key.startsWith("__reactProps$") &&
      typeof (props as { onClick?: unknown } | null)?.onClick === "function",
  );
}

/** The button tapped early, or the one that has taken its place since. */
function tappedButton(tap: { el: Element; label: string }): HTMLButtonElement | null {
  const candidates = [tap.el, ...document.querySelectorAll("button")];

  for (const el of candidates) {
    if (
      el instanceof HTMLButtonElement &&
      el.isConnected &&
      !el.disabled &&
      (el === tap.el || (el.getAttribute("aria-label") ?? el.textContent?.trim()) === tap.label) &&
      answersTaps(el)
    ) {
      return el;
    }
  }

  return null;
}

/** The bars pinned to the foot of a page: the wizard's on /create, a demo's Create bar. */
const FOOT_BARS = "[data-lifafa-foot-bar], [data-demo-create-bar]";

/**
 * Keeps the notice just above the bar at the foot of the page, error line
 * and all, measured while the notice is on screen and never otherwise:
 * nothing is written to the page for a notice that is not showing.
 */
function useClearOfFootBar(box: { current: HTMLDivElement | null }, key: string | null): void {
  useLayoutEffect(() => {
    const element = box.current;

    if (key === null || element === null) {
      return;
    }

    const bars = [...document.querySelectorAll<HTMLElement>(FOOT_BARS)];
    const place = (): void => {
      const height = Math.max(0, ...bars.map((bar) => bar.getBoundingClientRect().height));
      /* 0.75rem above it; with no bar on screen, the stylesheet's place (globals.css). */
      element.style.bottom = height > 0 ? `${Math.ceil(height) + 12}px` : "";
    };

    place();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(place) : null;
    for (const bar of bars) {
      observer?.observe(bar);
    }

    return () => observer?.disconnect();
  }, [box, key]);
}

export default function NetworkNotice(): ReactElement | null {
  const pathname = usePathname();
  const isClient = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  const { online, waiting, savesOnPhone } = useSyncExternalStore(
    subscribeLoadNotice,
    loadNoticeState,
    serverLoadNoticeState,
  );
  /* "Try again" pressed: busy for a moment, so it cannot be pressed twice. */
  const [retrying, setRetrying] = useState(false);
  const hidden = HIDDEN_ON.some((pattern) => pattern.test(pathname));
  const showWaiting = isClient && !hidden && waiting !== null && (online || waiting.reloads !== true);
  const showOffline = isClient && !hidden && !showWaiting && !online;
  const box = useRef<HTMLDivElement>(null);
  useClearOfFootBar(box, showWaiting ? "waiting" : showOffline ? `offline-${pathname}` : null);

  /* The page is ready: taps go to it from now, and one made too early is made again. */
  useEffect(() => {
    window.__lifafaReady = true;
    const tap = window.__lifafaTap;
    window.__lifafaTap = undefined;

    if (tap === undefined || Date.now() - tap.at > TAP_KEPT_MS) {
      return;
    }

    /* The page may still be putting the button in place (the gallery is redrawn as the wizard takes over). */
    let tries = 0;
    let timer = 0;
    const again = (): void => {
      const button = tappedButton(tap);

      if (button !== null) {
        button.click();
      } else if (++tries < 25) {
        timer = window.setTimeout(again, 120);
      }
    };

    timer = window.setTimeout(again, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!retrying) {
      return;
    }

    const timer = window.setTimeout(() => setRetrying(false), 2000);
    return () => window.clearTimeout(timer);
  }, [retrying]);

  if (hidden) {
    return null;
  }

  if (!isClient) {
    return <EarlyNotice />;
  }

  if (showWaiting && waiting !== null) {
    return (
      <div ref={box} role="status" className={BOX}>
        <p className="min-w-0 flex-1">
          {online ? "Your internet seems slow." : "You are offline."}
          {savesOnPhone ? " Your card is saved on this phone." : ""}
        </p>
        <button
          type="button"
          disabled={retrying}
          aria-busy={retrying}
          onClick={() => {
            setRetrying(true);
            waiting.retry();
          }}
          className={RETRY}
        >
          Try again
        </button>
      </div>
    );
  }

  if (showOffline) {
    return (
      <div ref={box} role="status" className={BOX}>
        <p className="min-w-0 flex-1 py-1.5">
          {savesOnPhone
            ? "You are offline. Changes are saved on this phone."
            : "You are offline. Check your connection."}
        </p>
      </div>
    );
  }

  return null;
}
