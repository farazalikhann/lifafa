"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import Image from "next/image";
import { CAROUSEL_CONTROL } from "@/components/landing/styles";
import { guideVideoOpen } from "@/lib/metaPixel";

/**
 * The client half of the home page's video guide (components/landing/
 * VideoGuide.tsx, which renders the cards on the server and their text from
 * guide-videos.json): the carousel, the thumbnail link and the chapter list's
 * "Show all".
 */

/** One video's card, rendered on the server. */
export interface GuideSlide {
  id: string;
  /** The video's title, for the dot that shows it. */
  name: string;
  lang: string;
  content: ReactNode;
}

/** How long a card stays before the carousel moves on. */
const ADVANCE_MS = 6000;
/** How long the carousel waits after the visitor last touched it. */
const RESUME_MS = 8000;

/**
 * Whether the thumbnails may be asked for: the page has loaded and the
 * carousel is within a screen of the viewport. On a phone a lazy image this
 * near the top is fetched at once, beside the hero (DESIGN.md, step art).
 */
const ThumbnailsReady = createContext(false);

/**
 * The video guides as a row of cards: swipe on touch, previous and next
 * buttons, a dot per card and a pause button. Built like PremiumCarousel.
 *
 * NO LIBRARY. The row is a native scroller with CSS scroll snap, so swiping is
 * the browser's own and every move is a compositor scroll. Each card snaps to
 * the left gutter with the next one peeking in at the right edge. The active
 * card is the one whose snap point is nearest the scroll position.
 *
 * FROM 1024px both cards sit side by side: nothing scrolls, the controls are
 * hidden and nothing moves on its own.
 *
 * AUTO-ADVANCE on narrower screens every 6 seconds, looping from the last card
 * to the first. It waits while a finger is on the carousel, while the pointer
 * is over it, while a keyboard has focus in it, while it is off screen and
 * while the tab is hidden, and starts again 8 seconds after the last
 * interaction. Under reduced motion it never moves on its own.
 */
export default function VideoGuideCarousel({
  slides,
  label,
}: {
  slides: readonly GuideSlide[];
  label: string;
}): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [stopped, setStopped] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [thumbnails, setThumbnails] = useState(false);

  /* Read by timers, never rendered. */
  const hold = useRef({ hover: false, focus: false, press: false, visible: false });
  const timer = useRef<number | undefined>(undefined);
  const stoppedRef = useRef(false);
  const reducedRef = useRef(false);
  /* Both cards in view at once, nothing to scroll (decided by CSS, read here). */
  const fitsRef = useRef(false);
  /* Each card's scroll position, measured when the row's width changes. */
  const targets = useRef<number[]>([]);

  const count = slides.length;

  /** Measures where the row scrolls to for each card, and whether it scrolls at all. */
  const measure = useCallback((): void => {
    const row = rowRef.current;

    if (row === null) {
      return;
    }

    const max = row.scrollWidth - row.clientWidth;
    const cards = [...row.children] as HTMLElement[];
    const start = cards[0]?.offsetLeft ?? 0;
    fitsRef.current = max <= 1;
    targets.current = cards.map((card) => Math.min(card.offsetLeft - start, max));
  }, []);

  /** Scrolls the row to card `index`. The browser animates it. */
  const scrollToIndex = useCallback((index: number): void => {
    const left = targets.current[index];

    if (left === undefined || fitsRef.current) {
      return;
    }

    rowRef.current?.scrollTo({ left, behavior: reducedRef.current ? "auto" : "smooth" });
  }, []);

  /** (Re)starts the countdown to the next card, unless something holds it. */
  const schedule = useCallback(
    (delay: number): void => {
      window.clearTimeout(timer.current);
      const h = hold.current;

      if (
        count < 2 ||
        fitsRef.current ||
        stoppedRef.current ||
        reducedRef.current ||
        h.hover ||
        h.focus ||
        h.press ||
        !h.visible ||
        document.hidden
      ) {
        return;
      }

      timer.current = window.setTimeout(() => {
        scrollToIndex((activeRef.current + 1) % count);
        schedule(ADVANCE_MS);
      }, delay);
    },
    [count, scrollToIndex],
  );

  /* The active card, from the scroll position; the layout, from the row's width. */
  useEffect(() => {
    const row = rowRef.current;

    if (row === null) {
      return;
    }

    let frame = 0;
    const read = (): void => {
      frame = 0;
      let nearest = 0;
      let best = Infinity;

      targets.current.forEach((left, index) => {
        const distance = Math.abs(left - row.scrollLeft);

        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });

      if (nearest !== activeRef.current) {
        activeRef.current = nearest;
        setActive(nearest);
      }
    };
    const onScroll = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(read);
      }
    };

    measure();
    read();
    row.addEventListener("scroll", onScroll, { passive: true });

    /* Only a change of width moves the cards; a "Show all" changes the height alone. */
    let width = row.clientWidth;
    const resize = new ResizeObserver(() => {
      if (row.clientWidth === width) {
        return;
      }

      width = row.clientWidth;
      measure();
      row.scrollTo({ left: targets.current[activeRef.current] ?? 0, behavior: "auto" });
      schedule(ADVANCE_MS);
    });
    resize.observe(row);

    return () => {
      row.removeEventListener("scroll", onScroll);
      resize.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [measure, schedule]);

  /* Reduced motion, on screen, tab visibility: each one starts or stops the clock. */
  useEffect(() => {
    const root = rootRef.current;

    if (root === null) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = (): void => {
      reducedRef.current = motion.matches;
      schedule(ADVANCE_MS);
    };
    onMotion();
    motion.addEventListener("change", onMotion);

    const observer = new IntersectionObserver(
      ([entry]) => {
        hold.current.visible = entry.isIntersecting;
        schedule(ADVANCE_MS);
      },
      { threshold: 0.2 },
    );
    observer.observe(root);

    const onVisibility = (): void => schedule(ADVANCE_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      motion.removeEventListener("change", onMotion);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer.current);
    };
  }, [schedule]);

  /* The thumbnails: once the page has loaded and gone quiet, and the carousel is a screen away. */
  useEffect(() => {
    const root = rootRef.current;

    if (root === null) {
      return;
    }

    let settled = false;
    let near = false;
    let idle: number | undefined;
    let timeout: number | undefined;
    const update = (): void => {
      if (settled && near) {
        setThumbnails(true);
        approach.disconnect();
      }
    };
    const settle = (): void => {
      const done = (): void => {
        settled = true;
        update();
      };

      if (typeof window.requestIdleCallback === "function") {
        idle = window.requestIdleCallback(done, { timeout: 2000 });
      } else {
        timeout = window.setTimeout(done, 200);
      }
    };
    const approach = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        update();
      },
      { rootMargin: "100% 0px" },
    );
    approach.observe(root);

    if (document.readyState === "complete") {
      settle();
    } else {
      window.addEventListener("load", settle, { once: true });
    }

    return () => {
      approach.disconnect();
      window.removeEventListener("load", settle);
      if (idle !== undefined) window.cancelIdleCallback(idle);
      window.clearTimeout(timeout);
    };
  }, []);

  /** Any touch of the carousel: hold the clock, then resume 8 seconds later. */
  const touched = (): void => schedule(RESUME_MS);

  /** A visitor's own move: announced, and the clock waits. */
  const go = (index: number): void => {
    const next = (index + count) % count;
    scrollToIndex(next);
    setAnnouncement(`${next + 1} of ${count}`);
    touched();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (fitsRef.current) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(activeRef.current + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(activeRef.current - 1);
    }
  };

  const toggleStopped = (): void => {
    const next = !stoppedRef.current;
    stoppedRef.current = next;
    setStopped(next);
    schedule(ADVANCE_MS);
  };

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={onKeyDown}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") {
          hold.current.hover = true;
          window.clearTimeout(timer.current);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") {
          hold.current.hover = false;
          schedule(RESUME_MS);
        }
      }}
      onFocus={(event) => {
        /* Keyboard focus holds it; a tap or a click is just an interaction. */
        if (event.target.matches(":focus-visible")) {
          hold.current.focus = true;
          window.clearTimeout(timer.current);
        } else {
          touched();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          hold.current.focus = false;
          schedule(RESUME_MS);
        }
      }}
    >
      <ThumbnailsReady value={thumbnails}>
        {/*
          A finger on the row holds the clock until it lifts, or until the
          browser takes the gesture over as a scroll (pointercancel). A mouse
          is held by hovering instead.
        */}
        <div
          ref={rowRef}
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse") {
              hold.current.press = true;
              window.clearTimeout(timer.current);
            }
          }}
          onPointerUp={() => {
            hold.current.press = false;
            touched();
          }}
          onPointerCancel={() => {
            hold.current.press = false;
            touched();
          }}
          onWheel={touched}
          className="lifafa-no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto overscroll-x-contain px-5 py-1 sm:scroll-px-14 sm:gap-4 sm:px-14 lg:grid lg:snap-none lg:grid-cols-2 lg:gap-8 lg:overflow-visible lg:px-0"
        >
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}`}
              className="flex w-[calc(100%-1rem)] shrink-0 snap-start flex-col sm:w-[min(calc(100%-1rem),34rem)] lg:w-auto"
            >
              {slide.content}
            </div>
          ))}
        </div>
      </ThumbnailsReady>

      {/* Nothing to move between from 1024px, where both cards are in view. */}
      <div className="mt-5 flex items-center justify-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => go(activeRef.current - 1)}
          aria-label="Previous video"
          className={CAROUSEL_CONTROL}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5 L8 12 L15 19" />
          </svg>
        </button>

        <div className="flex items-center">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => go(index)}
              aria-label={slide.name}
              lang={slide.lang}
              aria-current={index === active ? "true" : undefined}
              className="flex h-11 w-8 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--paper-emerald)]"
            >
              <span
                className={`h-2 w-2 rounded-full transition-[transform,opacity] duration-300 motion-reduce:transition-none ${
                  index === active
                    ? "scale-125 bg-[var(--paper-emerald)]"
                    : "bg-[var(--paper-muted)] opacity-40"
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go(activeRef.current + 1)}
          aria-label="Next video"
          className={CAROUSEL_CONTROL}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5 L16 12 L9 19" />
          </svg>
        </button>

        {/* Hidden under reduced motion by CSS, so it never jumps: the carousel never moves on its own there. */}
        <button
          type="button"
          onClick={toggleStopped}
          aria-pressed={stopped}
          aria-label={stopped ? "Start moving through the videos" : "Stop moving through the videos"}
          className={`ml-2 ${CAROUSEL_CONTROL} motion-reduce:hidden`}
        >
          {stopped ? (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
              <path d="M8 5 L19 12 L8 19 Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
              <path d="M7 5 h3.5 v14 H7 Z M13.5 5 H17 v14 h-3.5 Z" />
            </svg>
          )}
        </button>
      </div>

      {/* Says where a visitor's own move landed. Silent while it moves by itself. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/**
 * A card's thumbnail and its "Watch on YouTube" pill: one plain link to the
 * video, in a new tab (the YouTube app on a phone). No iframe and no YouTube
 * script on this page. A tap is logged as the Meta Pixel's GuideVideoOpen.
 *
 * The 16:9 box is drawn from the first byte, so the picture fills it without
 * moving anything. It is asked for once ThumbnailsReady says so, and fades in
 * once it has loaded.
 */
export function GuideWatchLink({
  href,
  language,
  thumbnail,
  alt,
  playLabel,
}: {
  href: string;
  language: string;
  thumbnail: string;
  alt: string;
  playLabel: string;
}): ReactElement {
  const ready = useContext(ThumbnailsReady);
  const [loaded, setLoaded] = useState(false);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      draggable={false}
      onClick={() => guideVideoOpen(language)}
      className="group block focus-visible:outline-none"
    >
      <span className="relative block aspect-video overflow-hidden bg-[var(--paper-washi)]">
        {ready ? (
          <Image
            src={thumbnail}
            alt={alt}
            fill
            loading="lazy"
            sizes="(min-width: 640px) 34rem, calc(100vw - 4rem)"
            quality={72}
            draggable={false}
            onLoad={() => setLoaded(true)}
            className={`object-cover transition-opacity duration-300 motion-reduce:transition-none ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
          />
        ) : null}
        <noscript>
          <img src={thumbnail} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        </noscript>
        {/* The keyboard focus ring, inside the card's rounded edge (CARD's 24px less its border) where nothing clips it. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-t-[calc(1.5rem-1px)] opacity-0 ring-3 ring-[var(--paper-emerald)] ring-inset group-focus-visible:opacity-100"
        />
      </span>
      <span className="flex px-5 pt-5 sm:px-6 lg:px-7">
        <span className="inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-[var(--paper-emerald)] px-4 text-[0.9375rem] font-semibold text-[var(--paper-emerald)] transition-colors duration-200 group-hover:bg-[var(--paper-emerald)]/[0.06]">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0" fill="currentColor">
            <path d="M8 5.5 L19 12 L8 18.5 Z" />
          </svg>
          {playLabel}
        </span>
      </span>
    </a>
  );
}

/** One chapter: its start time, its name and the link that opens the video there. */
export interface GuideChapter {
  t: string;
  label: string;
  url: string;
}

/**
 * A video's chapters, each a link that opens it at that second in a new tab.
 * On phones and tablets the first `visible` show, with a "Show all" for the
 * rest so the card stays short; from 1024px every one shows and the button
 * is gone. The server renders it closed.
 */
export function ChapterList({
  chapters,
  labelledBy,
  showAllLabel,
  showFewerLabel,
  visible = 5,
}: {
  chapters: readonly GuideChapter[];
  /** The id of the timeline's heading. */
  labelledBy: string;
  showAllLabel: string;
  showFewerLabel: string;
  visible?: number;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = (): void => {
    const next = !open;
    setOpen(next);

    /* Closing pulls the button up the page: keep it on screen. */
    if (!next) {
      window.requestAnimationFrame(() => {
        buttonRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    }
  };

  return (
    <>
      <ol
        id={listId}
        role="list"
        aria-labelledby={labelledBy}
        className="mt-3 border-t border-[var(--paper-hairline)]"
      >
        {chapters.map((chapter, index) => (
          <li
            key={chapter.url}
            className={`border-b border-[var(--paper-hairline)] ${
              index >= visible && !open ? "max-lg:hidden" : ""
            }`}
          >
            <a
              href={chapter.url}
              target="_blank"
              rel="noopener"
              draggable={false}
              className="group flex items-baseline gap-4 rounded py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)] lg:py-2.5"
            >
              <span className="w-11 shrink-0 text-[0.9375rem] font-semibold text-[var(--paper-emerald)] tabular-nums">
                {chapter.t}
              </span>
              <span className="min-w-0 flex-1 break-words text-[var(--paper-ink)] decoration-[var(--paper-gold)] underline-offset-[5px] group-hover:underline">
                {chapter.label}
              </span>
            </a>
          </li>
        ))}
      </ol>
      {chapters.length > visible ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={listId}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded px-1 font-semibold text-[var(--paper-emerald)] underline decoration-[var(--paper-gold)] decoration-1 underline-offset-[5px] hover:decoration-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)] lg:hidden"
        >
          {open ? showFewerLabel : showAllLabel}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`h-4 w-4 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9 L12 15 L18 9" />
          </svg>
        </button>
      ) : null}
    </>
  );
}
