"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import { STAMP_ART, STAMP_ASPECT, stampFor } from "@/templates/dak-ghar/art";
import { PageHeading } from "@/templates/dak-ghar/Paper";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** One function: its postage stamp, and under it what, when and where. */
function StampCard({
  entry,
  index,
  count,
  language,
}: {
  entry: TimelineEntry;
  index: number;
  count: number;
  language: CardLanguage;
}): ReactElement {
  const kind = stampFor(entry.label);
  const page = calendarPageText(entry.date, entry.time, language);
  const venue = entry.venueName.trim();

  return (
    <article
      className={styles.stampSlide}
      data-slide={index}
      role="group"
      aria-roledescription={language === "hi" ? "स्लाइड" : "slide"}
      aria-label={`${index + 1} / ${count}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={STAMP_ART[kind]}
        alt=""
        width={480}
        height={Math.round(480 / STAMP_ASPECT[kind])}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`${styles.stampArt} ${index % 2 === 1 ? styles.stampArtFlip : ""}`}
      />
      <div className="flex w-full min-w-0 flex-col items-center gap-1 text-center">
        <h3 className="max-w-full text-[1.625rem] wrap-anywhere text-balance" style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.1) }}>
          {entry.label.trim()}
        </h3>
        {page !== null ? (
          <>
            <p className="text-base text-balance" style={{ ...DAK_FONTS.sans, fontWeight: 600, lineHeight: leading(language, 1.4) }}>
              {page.weekday}, {page.day} {page.month} {page.year}
            </p>
            {page.time !== null && hasEventTime(entry.time) ? (
              <p className="text-base" style={{ ...DAK_FONTS.sans, color: "var(--dg-red)", fontWeight: 600, lineHeight: leading(language, 1.4) }}>
                {page.time}
              </p>
            ) : null}
          </>
        ) : null}
        {venue.length > 0 ? (
          <p className="mt-1 max-w-full text-base wrap-anywhere text-balance" style={{ ...DAK_FONTS.sans, color: "var(--dg-ink-muted)", lineHeight: leading(language, 1.45) }}>
            {venue}
          </p>
        ) : null}
      </div>
    </article>
  );
}

function Arrow({ flip }: { flip: boolean }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Every function, in date order, each on the postage stamp that matches it
 * (haldi, mehendi, sangeet, the wedding, the reception's banquet; the palace
 * by the lake for anything else). The list is the card's own
 * `timelineEntries`.
 *
 * A HORIZONTAL CAROUSEL: the browser's own scrolling with CSS scroll snap, so
 * a swipe is native and smooth on any phone; the next stamp peeks in at the
 * edge. A mouse can drag it. Dots and Previous and Next buttons under it, for
 * a keyboard, a screen reader, or a guest who does not know to swipe; which
 * slide is in view is read by an IntersectionObserver, never by measuring as
 * it scrolls. It never moves on its own. One function: just its card.
 */
export default function DakGharStamps({ draft, language }: { draft: EventDraft; language: CardLanguage }): ReactElement | null {
  const entries = timelineEntries(draft, language);
  const { ref, shown } = useReveal<HTMLElement>();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const drag = useRef<{ id: number; x: number; left: number; moved: boolean } | null>(null);
  const count = entries.length;
  const own = dakCopy(language);

  useEffect(() => {
    const scroller = scrollerRef.current;

    if (scroller === null || count < 2 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (seen) => {
        for (const entry of seen) {
          if (entry.isIntersecting) {
            setCurrent(Number((entry.target as HTMLElement).dataset.slide ?? 0));
          }
        }
      },
      { root: scroller, threshold: 0.6 },
    );

    for (const slide of scroller.querySelectorAll("[data-slide]")) {
      observer.observe(slide);
    }

    return () => observer.disconnect();
  }, [count]);

  if (count === 0) {
    return null;
  }

  const go = (index: number): void => {
    const scroller = scrollerRef.current;
    const slide = scroller?.querySelector<HTMLElement>(`[data-slide="${index}"]`);

    if (scroller === null || slide === null || slide === undefined) {
      return;
    }

    /* Read once, on the tap: the slide's centre to the scroller's. */
    const left = slide.offsetLeft - (scroller.clientWidth - slide.offsetWidth) / 2;
    scroller.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
  };

  /* A mouse drags it; touch and pens scroll it natively. */
  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const scroller = scrollerRef.current;

    if (event.pointerType !== "mouse" || event.button !== 0 || scroller === null) {
      return;
    }

    drag.current = { id: event.pointerId, x: event.clientX, left: scroller.scrollLeft, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const scroller = scrollerRef.current;
    const held = drag.current;

    if (held === null || scroller === null || held.id !== event.pointerId) {
      return;
    }

    const dx = event.clientX - held.x;

    if (!held.moved && Math.abs(dx) > 4) {
      held.moved = true;
      scroller.setPointerCapture(event.pointerId);
      scroller.classList.add(styles.stampDragging);
    }

    if (held.moved) {
      scroller.scrollLeft = held.left - dx;
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const scroller = scrollerRef.current;
    const held = drag.current;
    drag.current = null;

    if (held === null || scroller === null || !held.moved) {
      return;
    }

    scroller.classList.remove(styles.stampDragging);
    scroller.releasePointerCapture(event.pointerId);
    /* To the nearest slide, in the direction it was pulled. */
    const pulled = event.clientX - held.x;
    go(Math.max(0, Math.min(count - 1, pulled < -30 ? current + 1 : pulled > 30 ? current - 1 : current)));
  };

  const heading = cardCopy(language).timeline.heading;

  return (
    <section ref={ref} className={styles.page}>
      <div className={`${styles.reveal} ${shown ? styles.shown : ""} flex w-full max-w-[28rem] flex-col items-center gap-6`}>
        <PageHeading>{heading}</PageHeading>

        <div
          role="region"
          aria-roledescription={language === "hi" ? "कैरोसेल" : "carousel"}
          aria-label={heading}
          className="flex w-full flex-col items-center gap-4"
        >
          <div
            ref={scrollerRef}
            tabIndex={count > 1 ? 0 : undefined}
            className={`${styles.stampScroller} ${count === 1 ? styles.stampScrollerOne : ""}`}
            onPointerDown={count > 1 ? onPointerDown : undefined}
            onPointerMove={count > 1 ? onPointerMove : undefined}
            onPointerUp={count > 1 ? onPointerUp : undefined}
            onPointerCancel={count > 1 ? onPointerUp : undefined}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                go(Math.min(count - 1, current + 1));
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                go(Math.max(0, current - 1));
              }
            }}
          >
            {entries.map((entry, index) => (
              <StampCard key={entry.id} entry={entry} index={index} count={count} language={language} />
            ))}
          </div>

          {count > 1 ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={styles.stampNav}
                aria-label={own.previous}
                disabled={current === 0}
                onClick={() => go(current - 1)}
              >
                <Arrow flip />
              </button>
              <div className="flex items-center">
                {entries.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={styles.stampDot}
                    aria-label={`${entry.label.trim()} (${index + 1} / ${count})`}
                    aria-current={index === current ? "true" : undefined}
                    onClick={() => go(index)}
                  >
                    <span />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.stampNav}
                aria-label={own.next}
                disabled={current === count - 1}
                onClick={() => go(current + 1)}
              >
                <Arrow flip={false} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
