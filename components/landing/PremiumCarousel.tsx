"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from "react";
import Image from "next/image";
import Link from "next/link";

/** One premium template in the carousel. Plain data, built on the server. */
export interface CarouselSlide {
  id: string;
  name: string;
  /** "Premium, ₹999 per event", from lib/pricing.ts. */
  priceLabel: string;
  /** Where the slide leads: the wizard with this template chosen. */
  href: string;
  /** The template's live demo. */
  demoHref: string;
  /** A still of the template's first screen, 9:19.5. */
  poster: string;
  /** The opening animation, when one has been recorded (public/landing/previews). */
  video?: { mp4: string; webm: string };
}

/** How long a slide stays before the carousel moves on. */
const ADVANCE_MS = 5000;
/** How long the carousel waits after the visitor last touched it. */
const RESUME_MS = 8000;
/**
 * How many slides sit side by side, unscrolled, from 1024px: three phones of
 * 18rem with 3rem gaps are 60rem, inside any screen that wide. Must match
 * `.lifafa-carousel-row[data-fits-lg]` in globals.css.
 */
const FITS_LG = 3;
/** How far a mouse must move before a press becomes a drag rather than a click. */
const DRAG_SLOP_PX = 6;

/**
 * The Premium Collection as a row of phones: swipe on touch, drag with a
 * mouse, previous and next buttons, a dot per slide and a pause button.
 *
 * NO LIBRARY. The row is a native scroller with CSS scroll snap, so swiping is
 * the browser's own and every move is a compositor scroll (`scrollTo` with
 * smooth behaviour). The slide nearest the centre is the active one, read
 * from the scroll position once a frame at most.
 *
 * AUTO-ADVANCE every 5 seconds, looping from the last slide to the first. It
 * waits while the pointer is over the carousel, while it is pressed or
 * dragged, while a keyboard has focus in it, while it is off screen and while
 * the tab is hidden, and starts again 8 seconds after the last interaction.
 * Under reduced motion it never moves on its own and no video plays.
 *
 * Only the active slide may play its video. See PreviewMedia.
 */
export default function PremiumCarousel({
  slides,
  label,
}: {
  slides: readonly CarouselSlide[];
  label: string;
}): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [stopped, setStopped] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  /* Within a screen of the viewport: only then do the video elements exist. */
  const [nearView, setNearView] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  /* What holds the carousel still right now. Refs: read by timers, never rendered. */
  const hold = useRef({ hover: false, focus: false, press: false, visible: false });
  const timer = useRef<number | undefined>(undefined);
  const stoppedRef = useRef(false);
  const reducedRef = useRef(false);

  const count = slides.length;
  /* Whether every slide is in view at once (decided by CSS, read here). */
  const fitsRef = useRef(false);

  /** Makes `index` the active slide. */
  const activate = useCallback((index: number): void => {
    activeRef.current = index;
    setActive(index);
  }, []);

  /** Scrolls the row so slide `index` is centred. The browser animates it. */
  const scrollToIndex = useCallback((index: number): void => {
    const row = rowRef.current;
    const slide = row?.children[index] as HTMLElement | undefined;

    if (row == null || slide === undefined) {
      return;
    }

    row.scrollTo({
      left: slide.offsetLeft + slide.offsetWidth / 2 - row.clientWidth / 2,
      behavior: reducedRef.current ? "auto" : "smooth",
    });
  }, []);

  /**
   * Moves to slide `index`: scrolls it to the centre, or, when every slide is
   * already in view and nothing scrolls, moves the spotlight to it.
   */
  const moveTo = useCallback(
    (index: number): void => {
      if (fitsRef.current) {
        activate(index);
      } else {
        scrollToIndex(index);
      }
    },
    [activate, scrollToIndex],
  );

  /** (Re)starts the countdown to the next slide, unless something holds it. */
  const schedule = useCallback(
    (delay: number): void => {
      window.clearTimeout(timer.current);
      const h = hold.current;

      if (
        count < 2 ||
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
        moveTo((activeRef.current + 1) % count);
        schedule(ADVANCE_MS);
      }, delay);
    },
    [count, moveTo],
  );

  /* The active slide: the one whose centre is nearest the row's centre. */
  useEffect(() => {
    const row = rowRef.current;

    if (row === null) {
      return;
    }

    let frame = 0;
    const read = (): void => {
      frame = 0;
      fitsRef.current = row.scrollWidth <= row.clientWidth + 1;

      if (fitsRef.current) {
        return;
      }

      const middle = row.scrollLeft + row.clientWidth / 2;
      let nearest = 0;
      let best = Infinity;

      [...row.children].forEach((child, index) => {
        const el = child as HTMLElement;
        const distance = Math.abs(el.offsetLeft + el.offsetWidth / 2 - middle);

        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });

      if (nearest !== activeRef.current) {
        activate(nearest);
      }
    };
    const onScroll = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(read);
      }
    };

    read();
    row.addEventListener("scroll", onScroll, { passive: true });
    const resize = new ResizeObserver(() => {
      fitsRef.current = row.scrollWidth <= row.clientWidth + 1;
      /* Keep the active slide centred when the width changes. */
      scrollToIndex(activeRef.current);
    });
    resize.observe(row);

    return () => {
      row.removeEventListener("scroll", onScroll);
      resize.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [activate, scrollToIndex]);

  /* Reduced motion, on screen, tab visibility: each one starts or stops the clock. */
  useEffect(() => {
    const root = rootRef.current;

    if (root === null) {
      return;
    }

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = (): void => {
      reducedRef.current = motion.matches;
      setReduced(motion.matches);
      schedule(ADVANCE_MS);
    };
    onMotion();
    motion.addEventListener("change", onMotion);

    const observer = new IntersectionObserver(
      ([entry]) => {
        hold.current.visible = entry.isIntersecting;
        setOnScreen(entry.isIntersecting);
        schedule(ADVANCE_MS);
      },
      { threshold: 0.35 },
    );
    observer.observe(root);

    const approach = new IntersectionObserver(
      ([entry]) => setNearView(entry.isIntersecting),
      { rootMargin: "100% 0px" },
    );
    approach.observe(root);

    const onVisibility = (): void => schedule(ADVANCE_MS);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      motion.removeEventListener("change", onMotion);
      observer.disconnect();
      approach.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer.current);
    };
  }, [schedule]);

  /** Any touch of the carousel: hold the clock, then resume 8 seconds later. */
  const touched = (): void => schedule(RESUME_MS);

  /* Mouse dragging. Touch is left to the browser's own swipe. */
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);

  const onPointerDown = (event: ReactPointerEvent<HTMLUListElement>): void => {
    hold.current.press = true;
    schedule(RESUME_MS);

    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const row = event.currentTarget;
    drag.current = { x: event.clientX, left: row.scrollLeft, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLUListElement>): void => {
    const state = drag.current;

    if (state === null) {
      return;
    }

    const dx = event.clientX - state.x;

    if (!state.moved && Math.abs(dx) > DRAG_SLOP_PX) {
      state.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      /* Snapping fights a drag: off while dragging, back on at the end. */
      event.currentTarget.style.scrollSnapType = "none";
    }

    if (state.moved) {
      event.currentTarget.scrollLeft = state.left - dx;
    }
  };

  const endPress = (event: ReactPointerEvent<HTMLUListElement>): void => {
    hold.current.press = false;
    const state = drag.current;
    drag.current = null;

    if (state?.moved) {
      event.currentTarget.style.scrollSnapType = "";
      scrollToIndex(activeRef.current);
      /* A drag that ends over a link is not a click on it. */
      const swallow = (click: MouseEvent): void => {
        click.preventDefault();
        click.stopPropagation();
      };
      event.currentTarget.addEventListener("click", swallow, { capture: true, once: true });
      window.setTimeout(() => {
        rowRef.current?.removeEventListener("click", swallow, { capture: true });
      }, 0);
    }

    schedule(RESUME_MS);
  };

  /** A visitor's own move: announced, and the clock waits. */
  const go = (index: number): void => {
    const next = (index + count) % count;
    moveTo(next);
    setAnnouncement(`${next + 1} of ${count}: ${slides[next].name}`);
    touched();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
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

  const control =
    "flex h-11 w-11 items-center justify-center rounded-full border border-[var(--paper-hairline)] bg-[var(--paper-card)] text-[var(--paper-emerald)] transition-colors duration-150 hover:border-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)]";

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
        /* Keyboard focus holds it; a mouse click is just an interaction. */
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
      <ul
        ref={rowRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPress}
        onPointerCancel={endPress}
        onWheel={touched}
        data-fits-lg={count <= FITS_LG ? "" : undefined}
        className="lifafa-no-scrollbar lifafa-carousel-row flex snap-x snap-mandatory list-none gap-4 overflow-x-auto overscroll-x-contain pt-4 pb-8 select-none sm:gap-8 lg:gap-12"
      >
        {slides.map((slide, index) => {
          const isActive = index === active;

          return (
            <li
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${count}: ${slide.name}`}
              className="lifafa-carousel-slide flex shrink-0 snap-center flex-col items-center"
            >
              <div className="flex w-full flex-col items-center">
                <Link
                  href={slide.href}
                  draggable={false}
                  className="group flex w-full flex-col items-center rounded-[2.75rem] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--paper-emerald)]"
                  tabIndex={isActive ? 0 : -1}
                >
                  {/* Only the phone recedes when it is not the active slide: its caption keeps full contrast. */}
                  <span
                    className={`relative block aspect-[390/844] w-full overflow-hidden rounded-[2.5rem] border-[7px] border-[var(--paper-ink)] bg-[var(--paper-ink)] shadow-[0_30px_60px_-30px_rgba(30,27,24,0.55)] transition-[transform,opacity] duration-500 ease-out motion-reduce:transition-none ${
                      isActive ? "scale-100 opacity-100" : "scale-[0.92] opacity-70"
                    }`}
                  >
                    <PreviewMedia
                      slide={slide}
                      play={isActive && onScreen && !reduced}
                      mount={nearView}
                      priority={index === 0}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute top-2 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-black/60"
                    />
                  </span>
                  <span className="mt-5 font-[family-name:var(--paper-display)] text-2xl leading-tight font-semibold text-[var(--paper-ink)]">
                    {slide.name}
                  </span>
                </Link>
                <p className="mt-1 text-[0.9375rem] text-[var(--paper-muted)]">
                  {slide.priceLabel}
                </p>
                <Link
                  href={slide.demoHref}
                  prefetch={false}
                  draggable={false}
                  tabIndex={isActive ? 0 : -1}
                  className="mt-1 inline-flex min-h-11 items-center rounded px-1 text-[0.9375rem] font-semibold text-[var(--paper-emerald)] underline decoration-[var(--paper-gold)] underline-offset-[5px] hover:decoration-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-[var(--paper-emerald)]"
                  aria-label={`Open the ${slide.name} live demo`}
                >
                  Open live demo
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => go(activeRef.current - 1)}
          aria-label="Previous design"
          className={control}
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
              aria-label={`Show ${slide.name}`}
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
          aria-label="Next design"
          className={control}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5 L16 12 L9 19" />
          </svg>
        </button>

        {/* Hidden under reduced motion: the carousel never moves on its own there. */}
        <button
          type="button"
          onClick={toggleStopped}
          aria-pressed={stopped}
          aria-label={stopped ? "Start moving through the designs" : "Stop moving through the designs"}
          className={`ml-2 ${control} ${reduced ? "hidden" : ""}`}
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
 * A slide's screen: the poster, and over it the opening animation while the
 * slide is the active one.
 *
 * The video element exists only once the carousel is within a screen of the
 * viewport, and fetches nothing until it is asked to play (preload none). So
 * only the active slide's video is ever downloaded; the others show their
 * poster. It fades in once it is actually playing, and if it fails, or
 * autoplay is refused, the poster simply stays.
 *
 * MP4 (H.264) is listed first: it has hardware decoding on practically every
 * Android phone, which keeps a low-end one smooth. WebM is the fallback.
 */
function PreviewMedia({
  slide,
  play,
  mount,
  priority,
}: {
  slide: CarouselSlide;
  play: boolean;
  mount: boolean;
  priority: boolean;
}): ReactElement {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const hasVideo = slide.video !== undefined && !failed && mount;

  useEffect(() => {
    const video = videoRef.current;

    if (video === null || !hasVideo) {
      return;
    }

    if (play) {
      video.preload = "auto";
      video.currentTime = 0;
      video.play().catch(() => {
        /* Autoplay refused (data saver, low power mode): the poster stays. */
        setPlaying(false);
      });
    } else {
      video.pause();
      setPlaying(false);
    }
  }, [play, hasVideo]);

  return (
    <>
      <Image
        src={slide.poster}
        alt={`The ${slide.name} invitation on a phone`}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 18rem, (min-width: 640px) 16rem, 66vw"
        quality={72}
        className="object-cover object-top"
        draggable={false}
      />
      {hasVideo ? (
        <video
          ref={videoRef}
          muted
          playsInline
          loop
          disablePictureInPicture
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setPlaying(true)}
          className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-300 motion-reduce:transition-none ${
            playing ? "opacity-100" : "opacity-0"
          }`}
        >
          <source src={slide.video?.mp4} type="video/mp4" />
          {/* The last source: its error means no source could play. */}
          <source
            src={slide.video?.webm}
            type="video/webm"
            onError={() => setFailed(true)}
          />
        </video>
      ) : null}
    </>
  );
}
