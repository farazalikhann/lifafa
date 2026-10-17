"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactElement,
} from "react";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import { ART, EVENT_CARD_ASPECT, EVENT_CARD_BOX } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { Corners, Shadow } from "@/templates/gulab-mahal/Decor";
import GulabPage from "@/templates/gulab-mahal/Page";
import { gulabCopy, scriptLeading, type GulabFonts } from "@/templates/gulab-mahal/shared";
import { useFitInside } from "@/templates/gulab-mahal/useFitInside";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

const pc = (share: number): string => `${(share * 100).toFixed(1)}%`;

/* Where each place in the stack is: the top card, then the two behind it, smaller, lower and turned. */
const SLOTS = [
  "translate3d(0, 0, 0) rotate(0deg) scale(1)",
  "translate3d(0, 4.5%, 0) rotate(-3deg) scale(0.95)",
  "translate3d(0, 9%, 0) rotate(3deg) scale(0.9)",
] as const;
const slotOf = (place: number): string => SLOTS[Math.min(place, SLOTS.length - 1)];

/* Sent away past this share of the card's width, or flicked faster than this, in px per ms. */
const SEND_PAST = 0.28;
const SEND_SPEED = 0.6;
/* A drag that has gone this far sideways before it has gone as far down is the card's, not the page's. */
const SIDEWAYS_PX = 8;
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";

/** One function's card: its number, its name in script, its day and time, and where. */
function EventCard({
  entry,
  number,
  language,
  fonts,
}: {
  entry: TimelineEntry;
  number: number;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement {
  const boxRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const page = calendarPageText(entry.date, entry.time, language);
  const venue = entry.venueName.trim();

  useFitInside(boxRef, wordsRef, `${entry.label}|${entry.date}|${entry.time}|${venue}|${language}`);

  return (
    <>
      <Shadow src={ART.shadow.eventCard} aspect={EVENT_CARD_ASPECT} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.eventCard} alt="" loading="lazy" decoding="async" draggable={false} className={styles.stackArt} />
      <div
        ref={boxRef}
        className={styles.stackBox}
        style={{
          top: pc(EVENT_CARD_BOX.top),
          bottom: pc(EVENT_CARD_BOX.bottom),
          left: pc(EVENT_CARD_BOX.side),
          right: pc(EVENT_CARD_BOX.side),
        }}
      >
        <div ref={wordsRef} className={styles.stackWords}>
          <p className={`${styles.caps} ${styles.stackNumber}`} style={fonts.heading}>
            {gulabCopy(language).number(number)}
          </p>
          <h3
            className={`${styles.script} ${styles.stackName} text-balance`}
            style={{ ...fonts.names, lineHeight: scriptLeading(language) }}
          >
            {entry.label.trim()}
          </h3>
          {page !== null ? (
            <>
              <p className={styles.stackDate} style={fonts.heading}>
                {page.day} {page.month} {page.year}
              </p>
              <p className={styles.stackWeekday} style={fonts.heading}>
                {page.weekday}
              </p>
              {page.time !== null && hasEventTime(entry.time) ? (
                <p className={styles.stackTime} style={fonts.body}>
                  {page.time}
                </p>
              ) : null}
            </>
          ) : null}
          {venue.length > 0 ? (
            <p className={`${styles.stackVenue} wrap-anywhere text-balance`} style={fonts.italic(language)}>
              {venue}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

/**
 * Page 5: every function, as a stack of cards.
 *
 * The top card in front, the next two behind it, a little smaller (95% and
 * 90%), lower, and turned 3 degrees one way and the other. The guest swipes
 * the top card off to either side, turning as it goes; the next comes
 * forward, and the one sent away goes to the back, so the stack goes round.
 * Previous and Next do the same from buttons, with "2 / 4" between them.
 *
 * ONLY A SIDEWAYS DRAG IS THE CARD'S. The stack lets the browser have every
 * vertical pan (`touch-action: pan-y`), so a swipe up still goes to the next
 * page; a drag that goes sideways first moves the card, written once a frame
 * with nothing read from the page, and lets go to a spring back or a send.
 * Every place in the stack is a transform, and moving between places is a
 * transition of transform and opacity.
 *
 * The list is the card's own `timelineEntries`. With one function there is
 * one card, and no stack and no buttons.
 */
export default function GulabStackPage({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement | null {
  const copy = cardCopy(language);
  const own = gulabCopy(language);
  const entries = timelineEntries(draft, language);
  const count = entries.length;
  /* The cards' order, front first, by their place in `entries`. */
  const [order, setOrder] = useState<readonly number[]>(() => entries.map((_, index) => index));
  /* The card just sent to the back, which fades in there rather than being seen arriving. */
  const [arriving, setArriving] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const busy = useRef(false);
  const drag = useRef({
    pointer: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastT: 0,
    speed: 0,
    sideways: false,
    width: 0,
    frame: 0,
  });

  /* A new list of functions (the host editing the preview): start again from the first. */
  useEffect(() => {
    setOrder(entries.map((_, index) => index));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  useEffect(() => {
    if (arriving === null) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setArriving(null));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [arriving]);

  /* The top card sent off to one side; when it is gone, to the back. */
  const send = useCallback(
    (direction: -1 | 1): void => {
      const top = order[0];
      const card = cardRefs.current[top];

      if (card === null || card === undefined || busy.current || count < 2) {
        return;
      }

      busy.current = true;
      const away = Math.max(window.innerWidth, card.offsetWidth * 2) * 1.1;
      card.style.transition = "transform 320ms cubic-bezier(0.4, 0, 1, 1), opacity 320ms ease-in";
      card.style.transform = `translate3d(${(direction * away).toFixed(0)}px, 0, 0) rotate(${direction * 16}deg)`;
      card.style.opacity = "0";

      window.setTimeout(() => {
        card.style.transition = "none";
        setArriving(top);
        setOrder((current) => [...current.slice(1), current[0]]);
        busy.current = false;
      }, 330);
    },
    [count, order],
  );

  /* The back card brought to the front. */
  const bringBack = (): void => {
    if (busy.current || count < 2) {
      return;
    }

    setOrder((current) => [current[current.length - 1], ...current.slice(0, -1)]);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const top = cardRefs.current[order[0]];

    if (busy.current || count < 2 || top === null || top === undefined) {
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
    state.width = top.offsetWidth;
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
        /* Down or up first: the page's, not the card's. */
        state.pointer = -1;
        return;
      }

      if (Math.abs(dx) < SIDEWAYS_PX) {
        return;
      }

      state.sideways = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const top = cardRefs.current[order[0]];

      if (top !== null && top !== undefined) {
        top.style.transition = "none";
      }
    }

    const elapsed = Math.max(1, event.timeStamp - state.lastT);
    state.speed = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;

    if (state.frame === 0) {
      state.frame = window.requestAnimationFrame(() => {
        state.frame = 0;
        const top = cardRefs.current[order[0]];

        if (top === null || top === undefined) {
          return;
        }

        const moved = state.lastX - state.startX;
        top.style.transform = `translate3d(${moved.toFixed(1)}px, 0, 0) rotate(${((moved / Math.max(1, state.width)) * 10).toFixed(2)}deg)`;
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

    const moved = state.lastX - state.startX;
    const top = cardRefs.current[order[0]];

    if (Math.abs(moved) > state.width * SEND_PAST || Math.abs(state.speed) > SEND_SPEED) {
      send(moved < 0 ? -1 : 1);
      return;
    }

    if (top !== null && top !== undefined) {
      top.style.transition = `transform 520ms ${SPRING}`;
      top.style.transform = SLOTS[0];
    }
  };

  if (count === 0) {
    return null;
  }

  const front = order[0] ?? 0;

  return (
    <GulabPage label={copy.timeline.heading} images={[ART.eventCard, ART.shadow.eventCard]} variant={3}>
      <p className={`${styles.caps} ${styles.lineUp} ${styles.stackHeading} ${styles.onVelvet}`} style={fonts.heading}>
        {copy.timeline.heading}
      </p>

      <div
        className={`${styles.stack} ${styles.rise}`}
        style={{ "--card-aspect": String(EVENT_CARD_ASPECT) } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Tucked over the stack's top right and bottom left, above every card, clear of their words. */}
        <Corners size={0.3} className={styles.stackCorner} />

        {entries.map((entry, index) => {
          const place = order.indexOf(index);
          const hidden = place >= SLOTS.length;
          const isArriving = arriving === index;

          return (
            <div
              key={entry.id}
              ref={(element) => {
                cardRefs.current[index] = element;
              }}
              className={styles.stackCard}
              aria-hidden={place === 0 ? undefined : true}
              style={{
                zIndex: count - place,
                transform: slotOf(place),
                opacity: hidden || isArriving ? 0 : 1,
                transition: isArriving
                  ? "none"
                  : `transform 560ms ${SPRING}, opacity 320ms ease-out`,
              }}
            >
              <EventCard entry={entry} number={index + 1} language={language} fonts={fonts} />
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <div className={`${styles.stackControls} ${styles.lineUp}`} style={{ "--gm-delay": "400ms" } as CSSProperties}>
          <button type="button" className={`${styles.satin} ${styles.stackButton}`} onClick={bringBack} style={fonts.heading}>
            <svg viewBox="0 0 12 20" aria-hidden="true" focusable="false">
              <path d="M10 2 L3 10 L10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{own.previous}</span>
          </button>
          <p className={`${styles.stackCounter} ${styles.onVelvet}`} style={fonts.heading} aria-live="polite">
            <span aria-hidden="true">{own.counter(front + 1, count)}</span>
            <span className="sr-only">{own.counterSpoken(front + 1, count)}</span>
          </p>
          <button type="button" className={`${styles.satin} ${styles.stackButton}`} onClick={() => send(-1)} style={fonts.heading}>
            <span>{own.next}</span>
            <svg viewBox="0 0 12 20" aria-hidden="true" focusable="false">
              <path d="M2 2 L9 10 L2 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      ) : null}
    </GulabPage>
  );
}
