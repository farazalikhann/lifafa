"use client";

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactElement } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { playEffectSound } from "@/lib/effectSound";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import { STAMP_ART, STAMP_ASPECT, stampFor } from "@/templates/dak-ghar/art";
import { PageHeading } from "@/templates/dak-ghar/Paper";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { SOUND } from "@/templates/dak-ghar/sounds";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/* One step through the pile (the stylesheet's transition takes as long). */
const STEP_MS = 600;
/* A drag that has gone this far sideways before it has gone as far down is the pile's; past this share of the width, or this fast (px per ms), it steps. */
const SIDEWAYS_PX = 8;
const STEP_PAST = 0.22;
const STEP_SPEED = 0.5;

/*
  The places in the pile, front first: the card being read; the next one
  behind it, a little smaller, higher and turned, its top showing over the
  front card; the one after that, smaller again and turned the other way;
  one more, unseen, waiting. PAST is a card read and slid off the pile to the
  left. Each is a transform and an opacity, the step between them a
  transition of both (`.stampCard`).
*/
interface Place {
  x: number;
  y: number;
  scale: number;
  turn: number;
  opacity: number;
}

const PLACES: readonly Place[] = [
  { x: 0, y: 0, scale: 1, turn: 0, opacity: 1 },
  { x: 2, y: -1.9, scale: 0.94, turn: 2.5, opacity: 1 },
  { x: -2, y: -3.6, scale: 0.88, turn: -2, opacity: 0.9 },
  { x: 0, y: -4.6, scale: 0.82, turn: 0, opacity: 0 },
];
/* Thrown off the pile to the left: lifted a little, turned, gone. */
const PAST: Place = { x: -128, y: -1.2, scale: 1.04, turn: -14, opacity: 0 };
/* The paper's whoosh for a step, at the card's own level. */
const STEP_VOLUME = 0.8;
/* How many are drawn. */
const DRAWN = 3;

const placeOf = (offset: number): Place => (offset < 0 ? PAST : PLACES[Math.min(offset, PLACES.length - 1)]);
/* x as a share of the card's width, y in rem (the cards' heights differ, the peek should not). */
const transformOf = ({ x, y, scale, turn }: Place): string =>
  `translate3d(${x}%, ${y}rem, 0) rotate(${turn}deg) scale(${scale})`;

/** One function: its postage stamp, and under it what, when and where. */
function StampFace({ entry, index, language }: { entry: TimelineEntry; index: number; language: CardLanguage }): ReactElement {
  const kind = stampFor(entry.label);
  const page = calendarPageText(entry.date, entry.time, language);
  const venue = entry.venueName.trim();

  return (
    <>
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
      <div className={`${styles.stampWords} flex w-full min-w-0 flex-col items-center gap-1 text-center`}>
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
    </>
  );
}

/**
 * Every function, in date order, each on the postage stamp that matches it
 * (haldi, mehendi, sangeet, the wedding, the reception's banquet; the palace
 * by the lake for anything else). The list is the card's own
 * `timelineEntries`.
 *
 * A PILE OF CARDS ON THE TABLE, read one at a time, as Sheesh Mahal's
 * celebrations stand down its hall: the card being read in front, the next
 * two behind it, a little smaller, higher and turned, their stamps showing
 * over its top edge. Going on (a swipe to the left, or Next) slides the front
 * card off the pile to the left while each card behind comes forward one
 * place; going back (a swipe to the right, or Previous) brings it back. The
 * front card follows the finger while it is dragged. Each step is heard (the
 * paper whoosh) and seen: the card thrown off lifts and turns as it
 * goes, the one that comes to the front drops onto the pile with a small
 * settle, and its stamp presses down a beat after (`[data-stepped]` in the
 * stylesheet, so nothing plays before the guest's first step). Only a sideways drag is
 * the pile's (`touch-action: pan-y`), so the page still scrolls. Previous and
 * Next under it, with a dot per function between them. It never moves on its
 * own; under reduced motion the cards change places with a short fade. One
 * function: its card alone.
 *
 * The cards share one grid cell, so the pile is as tall as its tallest card
 * and nothing is measured to lay it out.
 */
export default function DakGharStamps({ draft, language }: { draft: EventDraft; language: CardLanguage }): ReactElement | null {
  const entries = timelineEntries(draft, language);
  const { ref, shown } = useReveal<HTMLElement>();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const count = entries.length;
  const own = dakCopy(language);

  /* The card in front. */
  const [at, setAt] = useState(0);
  /* Whether the guest has stepped yet: the arrival only plays for a step. */
  const [stepped, setStepped] = useState(false);
  const atRef = useRef(0);
  const busy = useRef(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef({ pointer: -1, startX: 0, startY: 0, lastX: 0, lastT: 0, speed: 0, sideways: false, width: 0, frame: 0 });

  /* A new list of functions (the host editing the preview): from the first again. */
  useEffect(() => {
    atRef.current = 0;
    setAt(0);
  }, [count]);

  if (count === 0) {
    return null;
  }

  const go = (to: number): void => {
    if (to < 0 || to >= count || to === atRef.current || busy.current) {
      return;
    }

    busy.current = true;
    playEffectSound(SOUND.whoosh, 0, STEP_VOLUME);
    atRef.current = to;
    setAt(to);
    setStepped(true);
    window.setTimeout(() => {
      busy.current = false;
    }, reducedMotion ? 260 : STEP_MS);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const front = cardRefs.current[atRef.current];

    if (count < 2 || busy.current || front === null || front === undefined || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    const state = drag.current;
    state.pointer = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;
    state.speed = 0;
    state.sideways = false;
    /* Read once, here. */
    state.width = front.offsetWidth;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;

    if (event.pointerId !== state.pointer) {
      return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.sideways) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SIDEWAYS_PX) {
        /* Up or down first: the page's, not the pile's. */
        state.pointer = -1;
        return;
      }

      if (Math.abs(dx) < SIDEWAYS_PX) {
        return;
      }

      state.sideways = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const front = cardRefs.current[atRef.current];

      if (front !== null && front !== undefined) {
        front.style.transition = "none";
      }
    }

    const elapsed = Math.max(1, event.timeStamp - state.lastT);
    state.speed = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;

    /* At most once a frame, and only a transform and an opacity. */
    if (state.frame === 0) {
      state.frame = window.requestAnimationFrame(() => {
        state.frame = 0;
        const front = cardRefs.current[atRef.current];

        if (front === null || front === undefined) {
          return;
        }

        const moved = state.lastX - state.startX;
        /* Towards a card there is none past: held back. */
        const towards = atRef.current - Math.sign(moved);
        const held = towards < 0 || towards >= count ? moved * 0.25 : moved * 0.7;
        const share = Math.min(1, Math.abs(held) / Math.max(1, state.width));
        front.style.transform = `translate3d(${held.toFixed(1)}px, 0, 0) rotate(${(held / Math.max(1, state.width)) * 8}deg)`;
        front.style.opacity = (1 - share * 0.4).toFixed(3);
      });
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;

    if (event.pointerId !== state.pointer) {
      return;
    }

    state.pointer = -1;
    window.cancelAnimationFrame(state.frame);
    state.frame = 0;

    if (!state.sideways) {
      return;
    }

    const front = cardRefs.current[atRef.current];

    /* From where the finger left it, by the stylesheet's transition. */
    if (front !== null && front !== undefined) {
      front.style.transition = "";
      front.style.transform = "";
      front.style.opacity = "";
    }

    const moved = state.lastX - state.startX;
    const to = atRef.current + (moved < 0 ? 1 : -1);
    const far = Math.abs(moved) > state.width * STEP_PAST || Math.abs(state.speed) > STEP_SPEED;

    if (far) {
      go(to);
    }
  };

  const heading = cardCopy(language).timeline.heading;

  return (
    <section ref={ref} className={styles.page}>
      <div className={`${styles.reveal} ${shown ? styles.shown : ""} flex w-full max-w-[28rem] flex-col items-center gap-6`}>
        <PageHeading>{heading}</PageHeading>

        <div
          className={`${styles.stampPile} ${count > 1 ? "" : styles.stampPileOne}`}
          data-stepped={stepped ? "" : undefined}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {entries.map((entry, index) => {
            const offset = index - at;
            const place = placeOf(offset);
            const front = offset === 0;

            return (
              <div
                key={entry.id}
                ref={(element) => {
                  cardRefs.current[index] = element;
                }}
                className={styles.stampCard}
                data-front={front ? "" : undefined}
                data-off={offset < 0 || offset >= DRAWN ? "" : undefined}
                aria-hidden={front ? undefined : true}
                inert={!front}
                style={
                  {
                    zIndex: offset < 0 ? 20 : 10 - Math.min(offset, 9),
                    transform: transformOf(place),
                    opacity: place.opacity,
                  } as CSSProperties
                }
              >
                <div className={styles.stampFace}>
                  <StampFace entry={entry} index={index} language={language} />
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 ? (
          <div className="flex items-center gap-2">
            <button type="button" className={styles.stampNav} disabled={at === 0} onClick={() => go(atRef.current - 1)} aria-label={own.previous}>
              <svg viewBox="0 0 12 20" aria-hidden="true" focusable="false">
                <path d="M10 2 L3 10 L10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span aria-hidden="true">{own.previousShort}</span>
            </button>
            <div className="flex items-center">
              {entries.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  className={styles.stampDot}
                  aria-label={`${entry.label.trim()} (${index + 1} / ${count})`}
                  aria-current={index === at ? "true" : undefined}
                  onClick={() => go(index)}
                >
                  <span />
                </button>
              ))}
            </div>
            <button type="button" className={styles.stampNav} disabled={at === count - 1} onClick={() => go(atRef.current + 1)} aria-label={own.next}>
              <span aria-hidden="true">{own.nextShort}</span>
              <svg viewBox="0 0 12 20" aria-hidden="true" focusable="false">
                <path d="M2 2 L9 10 L2 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="sr-only" aria-live="polite">
              {`${entries[at]?.label.trim() ?? ""}, ${at + 1} / ${count}`}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
