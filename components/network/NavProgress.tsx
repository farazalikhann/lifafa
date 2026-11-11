"use client";

import { useEffect, useId } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SLOW_LOAD_MS, clearWaiting, reportWaiting } from "@/lib/loadNotice";

/**
 * Answers every link tap at once: a thin bar runs along the top of the screen
 * and the tapped link dims, until the next page is on screen.
 *
 * A Next <Link> shows nothing until the next page's data has arrived, which on
 * a slow connection is seconds of a screen that has not reacted, so people tap
 * again. Before the page is ready the early script in NetworkNotice marks the
 * same two things for a link tapped then; this takes over once React runs.
 *
 * Only for a link that leaves this page on this site, in this tab. Cleared
 * when the address changes, when a page comes back from the back/forward
 * cache, and after a while in any case. Still waiting after SLOW_LOAD_MS, the
 * network notice says the internet seems slow, as LinkPending does.
 */

const BUSY = "data-nav-busy";
const PENDING = "data-nav-pending";
/** Long enough for the slowest real load; only a link whose navigation never happened waits this out. */
const GIVE_UP_MS = 30000;

function clear(): void {
  document.documentElement.removeAttribute(BUSY);
  for (const link of document.querySelectorAll(`[${PENDING}]`)) {
    link.removeAttribute(PENDING);
  }
}

/** The link a tap leaves this page through, or null. */
function leavingLink(event: MouseEvent): HTMLAnchorElement | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const target = event.target;
  const link = target instanceof Element ? target.closest("a[href]") : null;

  if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download")) {
    return null;
  }

  if (link.target !== "" && link.target !== "_self") {
    return null;
  }

  const url = new URL(link.href, window.location.href);

  if (url.origin !== window.location.origin) {
    return null;
  }

  /* The same page, or a jump within it. */
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return null;
  }

  return link;
}

export default function NavProgress(): null {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const id = `nav-${useId()}`;

  /* The address changed: the next page is here. */
  useEffect(() => {
    clear();
    clearWaiting(id);
  }, [pathname, search, id]);

  useEffect(() => {
    let slow = 0;
    let giveUp = 0;

    const stop = (): void => {
      window.clearTimeout(slow);
      window.clearTimeout(giveUp);
      clear();
      clearWaiting(id);
    };

    /* Bubbling, so it runs after the page's own handlers have had the tap. */
    const onClick = (event: MouseEvent): void => {
      const link = leavingLink(event);

      if (link === null) {
        return;
      }

      stop();
      document.documentElement.setAttribute(BUSY, "");
      link.setAttribute(PENDING, "");

      const href = link.href;
      slow = window.setTimeout(() => {
        reportWaiting(id, { kind: "slow", retry: () => window.location.assign(href) });
      }, SLOW_LOAD_MS);
      giveUp = window.setTimeout(stop, GIVE_UP_MS);
    };

    const onPageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        stop();
      }
    };

    document.addEventListener("click", onClick);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", stop);

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("popstate", stop);
      stop();
    };
  }, [id]);

  /* The bar itself is in the root layout, so the early script can show it before React runs. */
  return null;
}
