"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactElement,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import { FUNCTION_CARD, FUNCTION_CARD_ASPECT, HALL_ASPECT, HALL_FAR } from "@/templates/sheesh-mahal/art";
import { useCoupleFit, type CoupleFit } from "@/templates/sheesh-mahal/fit";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import { useRoomArt } from "@/templates/sheesh-mahal/picture";
import { usePageRest } from "@/templates/sheesh-mahal/rest";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import {
  INDIGO_INK,
  scriptLeading,
  sheeshCopy,
  type SheeshFonts,
} from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/* One step down the hall (the stylesheet's transitions take as long), and under reduced motion the fade through. */
const STEP_MS = 600;
const FADE_OUT_MS = 180;
const FADE_IN_MS = 240;
/* A drag that has gone this far sideways before it has gone as far down is the cards'; past this share of the width, or this fast (px per ms), it steps. */
const SIDEWAYS_PX = 8;
const STEP_PAST = 0.22;
const STEP_SPEED = 0.5;
/* The function's name, in an antique gold dark enough to read on the ivory. */
const NAME_GOLD = "#7A5A12";

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

/*
  The places in the corridor, front first, each a share of the card's own
  box: the card in front; the next one behind it, smaller, higher (towards
  the far end) and dimmer, its top showing over the front one's; the one after
  that, smaller again; and one more, unseen, waiting to come into view. PAST
  is a card walked by: grown, drifted to the side and gone.
*/
interface Place {
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

const PLACES: readonly Place[] = [
  { x: 0, y: 0, scale: 1, opacity: 1 },
  { x: 0, y: -21, scale: 0.8, opacity: 0.55 },
  { x: 0, y: -36, scale: 0.64, opacity: 0.3 },
  { x: 0, y: -46, scale: 0.52, opacity: 0 },
];
const PAST: Place = { x: -14, y: 3, scale: 1.15, opacity: 0 };
/* How many places are drawn. */
const DRAWN = 3;

const placeOf = (offset: number): Place => (offset < 0 ? PAST : PLACES[Math.min(offset, PLACES.length - 1)]);
const transformOf = ({ x, y, scale }: Place): string => `translate3d(${x}%, ${y}%, 0) scale(${scale})`;

/** One function's card: its number, its name, a rule, its day and time, and where. */
function FunctionCard({
  entry,
  number,
  language,
  fonts,
  register,
}: {
  entry: TimelineEntry;
  number: number;
  language: CardLanguage;
  fonts: SheeshFonts;
  register: CoupleFit;
}): ReactElement {
  const art = useRoomArt();
  const own = sheeshCopy(language);
  const page = calendarPageText(entry.date, entry.time, language);
  const venue = entry.venueName.trim();
  const time = page?.time !== null && page?.time !== undefined && hasEventTime(entry.time) ? page.time : null;
  const { words, lantern } = FUNCTION_CARD;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art?.functionCard} alt="" loading="lazy" decoding="async" draggable={false} className={styles.fnArt} />
      <span
        aria-hidden="true"
        className={styles.fnLantern}
        style={{ left: pc(lantern.x - lantern.size / 2), top: `calc(${pc(lantern.y)} - ${(lantern.size * 50).toFixed(2)}cqw)`, width: pc(lantern.size) }}
      />
      <div
        ref={(element) => {
          register.box = element;
        }}
        className={styles.fnText}
        style={{ top: pc(words.top), bottom: pc(1 - words.bottom), left: pc(words.left), right: pc(1 - words.right) }}
      >
        <div
          ref={(element) => {
            register.words = element;
          }}
          className={styles.fnWords}
          style={{ color: INDIGO_INK }}
        >
          <p className={`${styles.fnNumber} ${styles.caps}`} style={fonts.heading}>
            {own.functions.number(number)}
          </p>
          <h3 className={styles.fnName} style={{ ...fonts.names, lineHeight: scriptLeading(language), color: NAME_GOLD }}>
            {entry.label.trim()}
          </h3>
          <span aria-hidden="true" className={styles.fnRule} />
          {page !== null ? (
            <>
              <p className={styles.fnDate} style={fonts.heading}>
                {page.day} {page.month} {page.year}
              </p>
              <p className={styles.fnWhen} style={fonts.body}>
                {time === null ? page.weekday : `${page.weekday} · ${time}`}
              </p>
            </>
          ) : null}
          {venue.length > 0 ? (
            <p className={styles.fnVenue} style={fonts.heading}>
              {venue}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}

/**
 * Page 5: the celebrations, one card a function, standing down the hall.
 *
 * The hall again (hall.webp), nearer than on page 2 and higher, its far end a
 * little above the middle, darkened at the edges so the cards stand out.
 * Over it, "The Celebrations" in small spaced capitals, and the functions as
 * function-card.webp cards in the corridor, in depth: the one being read in
 * front, about 78% of the width and a little below the middle; the next
 * behind it, smaller, higher and dimmer; the one after that smaller and
 * dimmer again. At most three are drawn.
 *
 * On each card, in its safe area (FUNCTION_CARD.words): "No. 1" in small
 * capitals, the function's name in script in deep antique gold, a thin gold
 * rule, the date, the weekday and the time in deep indigo, and the venue in
 * small capitals, a line left out when there is none; stepped down to fit
 * (fit.ts), broken between words alone. The lantern at the top of the front
 * card glows, a warm light flickering slowly (the stylesheet).
 *
 * GOING ON (a swipe to the left on the cards, or Next) is a step down the
 * hall: the front card grows, drifts to the side and fades, as if walked
 * past, while each card behind comes up one place; going back (a swipe to
 * the right, or Previous) is the same step the other way. Every place is a
 * transform and an opacity, and the step between them a transition of both.
 * As on page 4 only a sideways drag is the cards' (`touch-action: pan-y`), so
 * a swipe up or down still changes page. Previous and Next are under the
 * cards, with "1 / 4" between them; a card for one function has no buttons.
 *
 * The list is the card's own `timelineEntries`, earliest first.
 *
 * Once the page has come to rest (rest.ts), once: the heading fades up and
 * the cards rise into their places from a little lower, back to front. Under
 * reduced motion the lantern is still and the cards fade through.
 */
export default function SheeshFunctionsPage({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: SheeshFonts;
}): ReactElement | null {
  const art = useRoomArt();
  const own = sheeshCopy(language);
  const still = useCardStill();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const entries = timelineEntries(draft, language);
  const count = entries.length;

  /* The card in front. */
  const [at, setAt] = useState(0);
  const atRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const parts = useRef<CoupleFit[]>([]);
  /* A step under way, and under reduced motion the fade out waiting for the new card to fade in. */
  const busy = useRef(false);
  const fading = useRef<Animation | null>(null);
  const drag = useRef({ pointer: -1, startX: 0, startY: 0, lastX: 0, lastT: 0, speed: 0, sideways: false, width: 0, frame: 0 });

  if (parts.current.length !== count) {
    parts.current = entries.map((_, index) => parts.current[index] ?? { name: null, box: null, words: null });
  }

  useCoupleFit(
    parts,
    `${entries.map((entry) => `${entry.label}|${entry.date}|${entry.time}|${entry.venueName}`).join("||")}|${language}`,
  );

  /* A new list of functions (the host editing the preview): from the first again. */
  useEffect(() => {
    atRef.current = 0;
    setAt(0);
  }, [count]);

  /* The entrance, once, when the page has first come to rest. */
  usePageRest(rootRef, {
    onRest: () => rootRef.current?.setAttribute("data-fn-in", ""),
  });

  /* Under reduced motion: the cards, faded out, have taken their new places; faded in again. */
  useLayoutEffect(() => {
    const out = fading.current;
    const deck = deckRef.current;

    if (out === null || deck === null) {
      return;
    }

    fading.current = null;
    const back = deck.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE_IN_MS, easing: "ease-out" });
    out.cancel();
    void back.finished.then(
      () => {
        busy.current = false;
      },
      () => {
        busy.current = false;
      },
    );
  }, [at]);

  if (count === 0) {
    return null;
  }

  /* A step to the card `to`: forward one, or back one. */
  const go = (to: number): void => {
    if (to < 0 || to >= count || to === atRef.current || busy.current) {
      return;
    }

    busy.current = true;
    const deck = deckRef.current;

    if (reducedMotion && !still && deck !== null) {
      const out = deck.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_OUT_MS, easing: "ease-in", fill: "forwards" });
      void out.finished.then(
        () => {
          fading.current = out;
          atRef.current = to;
          setAt(to);
        },
        () => {
          busy.current = false;
        },
      );
      return;
    }

    atRef.current = to;
    setAt(to);
    window.setTimeout(() => {
      busy.current = false;
    }, STEP_MS);
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const front = cardRefs.current[atRef.current];

    if (count < 2 || busy.current || front === null || front === undefined) {
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
        /* Down or up first: the page's, not the cards'. */
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
        const held = towards < 0 || towards >= count ? moved * 0.25 : moved * 0.6;
        const share = Math.min(1, Math.abs(held) / Math.max(1, state.width));
        /* Drawn on to the left, it begins to grow as it does when walked past. */
        const grow = held < 0 ? share * 0.08 : 0;
        front.style.transform = `translate3d(${held.toFixed(1)}px, 0, 0) scale(${(1 + grow).toFixed(3)})`;
        front.style.opacity = (1 - share * 0.5).toFixed(3);
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
    }

    const moved = state.lastX - state.startX;
    const to = atRef.current + (moved < 0 ? 1 : -1);
    const far = Math.abs(moved) > state.width * STEP_PAST || Math.abs(state.speed) > STEP_SPEED;

    if (far && to >= 0 && to < count && !busy.current) {
      go(to);
      return;
    }

    if (front !== null && front !== undefined) {
      front.style.transform = transformOf(PLACES[0]);
      front.style.opacity = "1";
    }
  };

  return (
    <SheeshPage
      label={own.pages.functions}
      images={art === null ? [] : [art.hall, art.functionCard]}
      ground={
        <>
          <div
            className={styles.fnScene}
            style={
              {
                "--hall-aspect": String(HALL_ASPECT),
                "--far-x": String(HALL_FAR.x),
                "--far-y": String(HALL_FAR.y),
              } as CSSProperties
            }
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art?.hall} alt="" loading="lazy" decoding="async" draggable={false} className={styles.fnHall} />
          </div>
          <span aria-hidden="true" className={styles.fnVignette} />
        </>
      }
    >
      <div
        ref={rootRef}
        className={`${styles.functions} ${count > 1 ? "" : styles.functionsAlone}`}
        style={{ "--fc-aspect": String(FUNCTION_CARD_ASPECT) } as CSSProperties}
      >
        <p className={`${styles.fnHeading} ${styles.caps}`} style={fonts.heading}>
          {own.pages.functions}
        </p>

        <div
          ref={deckRef}
          className={styles.fnDeck}
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
                className={styles.fnCard}
                data-front={front ? "" : undefined}
                data-off={offset < 0 || offset >= DRAWN ? "" : undefined}
                aria-hidden={front ? undefined : true}
                inert={!front}
                style={{
                  zIndex: offset < 0 ? 20 : 10 - Math.min(offset, 9),
                  transform: transformOf(place),
                  opacity: place.opacity,
                }}
              >
                <div
                  className={styles.fnRise}
                  style={{ "--sm-delay": `${(DRAWN - 1 - Math.min(Math.max(offset, 0), DRAWN - 1)) * 140}ms` } as CSSProperties}
                >
                  <FunctionCard
                    entry={entry}
                    number={index + 1}
                    language={language}
                    fonts={fonts}
                    register={parts.current[index]}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 ? (
          <div className={styles.fnControls}>
            <button
              type="button"
              className={styles.fnPill}
              style={fonts.heading}
              disabled={at === 0}
              onClick={() => go(atRef.current - 1)}
            >
              <svg viewBox="0 0 12 20" aria-hidden="true" focusable="false">
                <path d="M10 2 L3 10 L10 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{own.functions.previous}</span>
            </button>
            <p className={styles.fnCounter} style={fonts.heading} aria-live="polite">
              <span aria-hidden="true">{own.functions.counter(at + 1, count)}</span>
              <span className="sr-only">{own.functions.counterSpoken(at + 1, count)}</span>
            </p>
            <button
              type="button"
              className={styles.fnPill}
              style={fonts.heading}
              disabled={at === count - 1}
              onClick={() => go(atRef.current + 1)}
            >
              <span>{own.functions.next}</span>
              <svg viewBox="0 0 12 20" aria-hidden="true" focusable="false">
                <path d="M2 2 L9 10 L2 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </SheeshPage>
  );
}
