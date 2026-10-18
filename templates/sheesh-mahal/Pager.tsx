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
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { whenIdle } from "@/templates/sheesh-mahal/shared";

/**
 * The paging: Sheesh Mahal is a palace of rooms, one swipe each.
 *
 * NATIVE SCROLLING, SNAPPED BY CSS, as Gulab Mahal's: while this card is the
 * guest's page the document itself is the snap container, set on <html> here
 * and put back on the way out, and every page is a stop that cannot be
 * skipped. The swipe is the browser's own scroll, and the walk through each
 * room is the stylesheet's, driven by that scroll on the compositor (see
 * `.pin` and `.zoom`): nothing here moves anything.
 *
 * A PAGE IS ANYTHING MARKED `data-sm-page`, in the document's order: the
 * card's own and the two the guest's page draws after it (the reply and the
 * thanks). One more stop goes at the foot of the guest's page, so what the
 * page sets after the last page can be reached too.
 *
 * WHAT IT WATCHES, through two IntersectionObservers and no scroll handler:
 *
 *   each page's share of the screen. A page 60% on screen is marked
 *   `data-sm-entered`, once, which plays its entrance; held until the cover
 *   lets the card go (useRevealGate), so page 2 arrives as the doors hand
 *   over. A page with (next to) nothing of it on screen has its room marked
 *   `data-floating-paused`, which holds every CSS loop in it (globals.css);
 *   the room, not the page, because the walk-through animations on the page's
 *   own boxes must never be held.
 *
 *   which page is across the middle of the screen: the one being read. It is
 *   marked `data-sm-current` (the only room that takes a tap, and the one
 *   whose glints follow the tilt) and its dot is lit; once the scroll has
 *   come to rest the next page's pictures are fetched and decoded, and every
 *   page two or more away is marked `data-sm-far`, which leaves it undrawn
 *   (content-visibility: auto). Both wait for an idle moment, so a page
 *   changing its drawing is never part of a swipe's frames.
 *
 * Every change is an attribute set directly: a swipe re-renders nothing. In a
 * preview the card is in a box that scrolls; that is watched instead, with no
 * snapping and no dots.
 */

const PAGE = "data-sm-page";
const THRESHOLDS = Array.from({ length: 21 }, (_, index) => index / 20);
/* Less of a page than this on screen, and the loops in its room are held. */
const PAUSE_BELOW = 0.02;

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

export default function SheeshPager({
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
    html.style.scrollPaddingTop = "var(--lifafa-preview-h, 0px)";

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
      root.setAttribute("data-sm-scrolled", "");
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

    if (still || typeof IntersectionObserver === "undefined") {
      for (const page of find()) {
        page.setAttribute("data-sm-entered", "");
        page.setAttribute("data-sm-current", "");
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
          page.toggleAttribute("data-sm-far", Math.abs(index - currentRef.current) > 1);
        });

        const next = pages[currentRef.current + 1];

        for (const src of (next?.dataset.smImages ?? "").split(" ")) {
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

    const mark = (index: number): void => {
      pages.forEach((page, n) => page.toggleAttribute("data-sm-current", n === index));
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
          const room = page.querySelector<HTMLElement>("[data-sm-room]");
          room?.toggleAttribute("data-floating-paused", entry.intersectionRatio < PAUSE_BELOW);

          if (!gateOpen || !entry.isIntersecting || page.hasAttribute("data-sm-entered")) {
            continue;
          }

          const screen = entry.rootBounds?.height ?? window.innerHeight;
          const needed = 0.6 * Math.min(entry.boundingClientRect.height, screen);

          if (entry.intersectionRect.height >= needed - 1) {
            page.setAttribute("data-sm-entered", "");
          }
        }
      },
      { root: box, threshold: [PAUSE_BELOW, ...THRESHOLDS] },
    );

    const middle = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const index = pages.indexOf(entry.target as HTMLElement);

          if (index !== -1 && index !== currentRef.current) {
            currentRef.current = index;
            mark(index);
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

      mark(currentRef.current);
    };

    watch();

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
