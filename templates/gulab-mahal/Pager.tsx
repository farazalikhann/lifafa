"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useRevealGate } from "@/hooks/useRevealGate";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { whenIdle } from "@/templates/gulab-mahal/shared";

/**
 * The paging: Gulab Mahal is a stack of full-screen pages, one swipe each.
 *
 * NATIVE SCROLLING, SNAPPED BY CSS. While this card is the guest's page the
 * document itself is the snap container (`scroll-snap-type: y mandatory`, set
 * on <html> here and put back on the way out), and every page is a stop that
 * cannot be skipped (`.page` in the stylesheet). So a swipe is the browser's
 * own scroll, run on the compositor, and nothing here moves anything.
 *
 * A PAGE IS ANYTHING MARKED `data-gm-page`, found in the document's order:
 * the card's own pages and the two the guest's page draws after the card
 * (the reply and the thanks; see RsvpFrame and Closing). One more stop is put
 * at the foot of the guest's page, so whatever the page sets after the last
 * page (the way to keep the card) can be reached too.
 *
 * WHAT IT WATCHES, through two IntersectionObservers and no scroll handler:
 *
 *   each page's share of the screen. A page 60% on screen (or covering 60%
 *   of the screen, for one taller than it) is marked `data-gm-entered`, once,
 *   which is what plays its entrance; held until the cover lets the card go
 *   (useRevealGate), so page 2 arrives as the envelope hands over. A page with
 *   nothing of it on screen is marked `data-floating-paused`, which holds
 *   every CSS loop inside it (globals.css).
 *
 *   which page is across the middle of the screen: the current one. Its dot
 *   is lit, and once the scroll has come to rest the next page's pictures are
 *   fetched and decoded, and every page two or more away is marked
 *   `data-gm-far`, which leaves it undrawn (content-visibility: auto) until it
 *   comes near. Both wait for an idle moment, so a page changing its drawing
 *   is never part of a swipe's frames.
 *
 * Every change is an attribute on a page or a dot, set directly: a swipe
 * re-renders nothing. In a preview the card is in a box that scrolls; that is
 * watched instead, with no snapping and no dots.
 */

const PAGE = "data-gm-page";
const THRESHOLDS = Array.from({ length: 21 }, (_, index) => index / 20);

/** The nearest box that scrolls, for a card drawn inside one; null for the window. */
function scrollBoxOf(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);

    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
  }

  return null;
}

export default function GulabPager({
  pagewide,
  rootRef,
}: {
  /** True on the guest's page, where the document scrolls. */
  pagewide: boolean;
  rootRef: RefObject<HTMLElement | null>;
}): ReactElement | null {
  const still = useCardStill();
  const gateOpen = useRevealGate();
  const dotsRef = useRef<HTMLDivElement>(null);
  /* The page being read, by its place among the pages; -1 before any is. */
  const currentRef = useRef(-1);
  const [count, setCount] = useState(0);

  /* The dots are drawn again when the pages change in number: the lit one is lit again. */
  useEffect(() => {
    const dots = dotsRef.current?.children;

    if (dots === undefined) {
      return;
    }

    for (let n = 0; n < dots.length; n += 1) {
      dots[n].toggleAttribute("data-on", n === currentRef.current);
    }
  }, [count]);

  /* The document snaps from page to page while this card is the page. */
  useEffect(() => {
    if (!pagewide || still) {
      return;
    }

    const html = document.documentElement;
    const before = {
      type: html.style.scrollSnapType,
      padding: html.style.scrollPaddingTop,
    };
    html.style.scrollSnapType = "y mandatory";
    /* Under the host's preview strip, where there is one (0 for every guest). */
    html.style.scrollPaddingTop = "var(--lifafa-preview-h, 0px)";

    /* The last stop, at the very foot of the page. */
    const end = document.createElement("div");
    end.setAttribute("aria-hidden", "true");
    end.className = styles.snapEnd;
    (rootRef.current?.closest("main") ?? document.body).appendChild(end);

    return () => {
      html.style.scrollSnapType = before.type;
      html.style.scrollPaddingTop = before.padding;
      end.remove();
    };
  }, [pagewide, still, rootRef]);

  /* "Swipe up" goes for good at the guest's first scroll. */
  useEffect(() => {
    const root = rootRef.current;

    if (root === null || still) {
      return;
    }

    const box = pagewide ? null : scrollBoxOf(root);
    const source: HTMLElement | Window = box ?? window;
    const onScroll = (): void => {
      root.setAttribute("data-gm-scrolled", "");
      source.removeEventListener("scroll", onScroll);
    };

    source.addEventListener("scroll", onScroll, { passive: true });

    return () => source.removeEventListener("scroll", onScroll);
  }, [pagewide, still, rootRef]);

  useEffect(() => {
    const root = rootRef.current;

    if (root === null) {
      return;
    }

    const scope: ParentNode = pagewide ? (root.closest("main") ?? document) : root;
    const find = (): HTMLElement[] => [...scope.querySelectorAll<HTMLElement>(`[${PAGE}]`)];

    /* A card laid out as a picture of itself, or a browser with no observers: everything has arrived. */
    if (still || typeof IntersectionObserver === "undefined") {
      for (const page of find()) {
        page.setAttribute("data-gm-entered", "");
      }

      return;
    }

    const box = pagewide ? null : scrollBoxOf(root);
    let pages: HTMLElement[] = [];
    currentRef.current = -1;
    let cancelIdle: (() => void) | null = null;
    const fetched = new Set<string>();

    const settle = (): void => {
      cancelIdle?.();
      cancelIdle = whenIdle(() => {
        cancelIdle = null;

        pages.forEach((page, index) => {
          page.toggleAttribute("data-gm-far", Math.abs(index - currentRef.current) > 1);
        });

        /* The next page's pictures, fetched and decoded before the guest gets there. */
        const next = pages[currentRef.current + 1];

        for (const src of (next?.dataset.gmImages ?? "").split(" ")) {
          if (src === "" || fetched.has(src)) {
            continue;
          }

          fetched.add(src);
          const image = new Image();
          image.src = src;
          void image.decode().catch(() => undefined);
        }
      });
    };

    const light = (index: number): void => {
      const dots = dotsRef.current?.children;

      if (dots === undefined) {
        return;
      }

      for (let n = 0; n < dots.length; n += 1) {
        dots[n].toggleAttribute("data-on", n === index);
      }
    };

    const visibility = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const page = entry.target as HTMLElement;
          page.toggleAttribute("data-floating-paused", !entry.isIntersecting);

          if (!gateOpen || !entry.isIntersecting || page.hasAttribute("data-gm-entered")) {
            continue;
          }

          const screen = entry.rootBounds?.height ?? window.innerHeight;
          const needed = 0.6 * Math.min(entry.boundingClientRect.height, screen);

          if (entry.intersectionRect.height >= needed - 1) {
            page.setAttribute("data-gm-entered", "");
          }
        }
      },
      { root: box, threshold: THRESHOLDS },
    );

    /* A line across the middle of the screen: the page on it is the one being read. */
    const middle = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const index = pages.indexOf(entry.target as HTMLElement);

          if (index !== -1 && index !== currentRef.current) {
            currentRef.current = index;
            light(index);
            settle();
          }
        }
      },
      { root: box, rootMargin: "-49% 0px -50% 0px", threshold: 0 },
    );

    const watch = (): void => {
      const found = find();

      if (found.length === pages.length && found.every((page, index) => page === pages[index])) {
        return;
      }

      visibility.disconnect();
      middle.disconnect();
      pages = found;
      setCount(found.length);

      for (const page of pages) {
        visibility.observe(page);
        middle.observe(page);
      }

      light(currentRef.current);
    };

    watch();

    /*
      Pages come and go with the reply (the form, then the confirmation) and
      with the host's sections: looked for again when the page's elements
      change, at most once a frame.
    */
    let frame = 0;
    const mutations = new MutationObserver(() => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          watch();
        });
      }
    });
    mutations.observe(pagewide ? (root.closest("main") ?? document.body) : root, {
      childList: true,
      subtree: true,
    });

    return () => {
      visibility.disconnect();
      middle.disconnect();
      mutations.disconnect();
      window.cancelAnimationFrame(frame);
      cancelIdle?.();
    };
  }, [gateOpen, pagewide, still, rootRef]);

  /* The dots are the guest's page's alone; a preview's box has no right edge of its own to put them on. */
  if (!pagewide || still || count < 2) {
    return null;
  }

  return (
    <div ref={dotsRef} aria-hidden="true" className={styles.dots}>
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={styles.dot} />
      ))}
    </div>
  );
}
