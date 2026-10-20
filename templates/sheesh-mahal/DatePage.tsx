"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import AddToCalendar from "@/components/card/AddToCalendar";
import {
  measure,
  spokenCountdown,
  unitsOf,
  type Countdown,
} from "@/components/card/sections/CountdownSection";
import { useCardStill } from "@/hooks/useCardStill";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { CalendarInvite } from "@/lib/calendar";
import { calendarPageText, eventInstant, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import type { Theme } from "@/lib/themes";
import { MOON, MOON_ASPECT } from "@/templates/sheesh-mahal/art";
import SwipeHint from "@/templates/sheesh-mahal/Hint";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import { useRoomArt } from "@/templates/sheesh-mahal/picture";
import { usePageRest } from "@/templates/sheesh-mahal/rest";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import {
  GOLD_DEEP,
  INDIGO_INK,
  IVORY,
  sheeshCopy,
  whenIdle,
  type SheeshFonts,
} from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/* Each line on the moon after the one before; the tiles after the last line, each after the one before. */
const STAGGER = 150;
const TILES_AT = 5 * STAGGER + 100;
const TILE_STAGGER = 110;
/* The words keep this share of the moon's radius clear of its edge. */
const MOON_MARGIN = 0.86;
/* How far the words may be stepped down to fit the moon, and the step. */
const FIT_FLOOR = 0.4;
const FIT_STEP = 0.03;
/* A flip: the old number's top half turns down to the middle, then the new one's bottom half turns down from it. */
const HALF_FLIP_MS = 200;

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

/**
 * Sets the words on the moon as large as fits inside its circle with a
 * margin: each line as wide as the circle is at the line's farthest edge
 * from the moon's centre, and no wider. Every size is in `em`, so `--fit` on
 * the block scales the lot. Measured with layout sizes (offset*), which the
 * walk into the room (a scale) does not change. Before the first paint,
 * again when the room changes size and when the fonts arrive.
 */
function fitMoon(scene: HTMLElement, words: HTMLElement): void {
  const radius = scene.clientWidth * MOON.r * MOON_MARGIN;

  const fits = (): boolean => {
    const half = words.offsetHeight / 2;

    for (const line of words.children) {
      if (!(line instanceof HTMLElement)) {
        continue;
      }

      /* The glyphs, not the line's leading. */
      const inset = line.offsetHeight * 0.12;
      const top = line.offsetTop + inset - half;
      const bottom = line.offsetTop + line.offsetHeight - inset - half;
      const far = Math.max(Math.abs(top), Math.abs(bottom));

      if (far >= radius || line.offsetWidth / 2 > Math.sqrt(radius * radius - far * far)) {
        return false;
      }
    }

    return true;
  };

  let fit = 1;
  words.style.setProperty("--fit", "1");

  while (fit > FIT_FLOOR && !fits()) {
    fit = Math.max(FIT_FLOOR, fit - FIT_STEP);
    words.style.setProperty("--fit", fit.toFixed(3));
  }
}

/** One line on the moon, fading up in its turn. */
function Line({
  order,
  className,
  style,
  children,
}: {
  order: number;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}): ReactElement {
  return (
    <p
      className={`${styles.lineUp} ${className}`}
      style={{ "--sm-delay": `${order * STAGGER}ms`, ...style } as CSSProperties}
    >
      {children}
    </p>
  );
}

/** The four halves of a tile's face: each shows `digits`, cut to its half. */
function Half({
  which,
  digits,
  flap,
}: {
  which: "top" | "bottom";
  digits: string;
  flap?: (element: HTMLSpanElement | null) => void;
}): ReactElement {
  return (
    <span
      ref={flap}
      className={`${styles.tileHalf} ${which === "top" ? styles.tileTop : styles.tileBottom} ${
        flap !== undefined ? styles.tileFlap : ""
      }`}
    >
      <span className={styles.tileFigure}>{digits}</span>
    </span>
  );
}

/**
 * A mirror tile of the countdown, which flips like a flip clock when its
 * number changes: the old number's top half turns down about the tile's
 * middle (rotateX), then the new number's bottom half turns down from the
 * middle over the old, 400ms in all, transforms alone. Only while its page
 * is at rest on the screen and the tab is shown, and never under reduced
 * motion; otherwise the number simply changes.
 */
function FlipTile({
  digits,
  label,
  order,
  fonts,
  labelClass,
}: {
  digits: string;
  label: string;
  order: number;
  fonts: SheeshFonts;
  labelClass: string;
}): ReactElement {
  const tileRef = useRef<HTMLDivElement>(null);
  const topFlap = useRef<HTMLSpanElement | null>(null);
  const bottomFlap = useRef<HTMLSpanElement | null>(null);
  const last = useRef(digits);
  const [flip, setFlip] = useState<{ from: string; n: number } | null>(null);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /* A changed number: flipped, if it may be; before the paint, so the old number is what is seen turning. */
  useLayoutEffect(() => {
    const from = last.current;
    last.current = digits;

    if (from === digits) {
      return;
    }

    const page = tileRef.current?.closest("[data-sm-page]");
    const may =
      !reducedMotion &&
      document.visibilityState === "visible" &&
      page !== null &&
      page !== undefined &&
      page.hasAttribute("data-sm-rest") &&
      !from.includes("–");

    setFlip((was) => (may ? { from, n: (was?.n ?? 0) + 1 } : null));
  }, [digits, reducedMotion]);

  useLayoutEffect(() => {
    const top = topFlap.current;
    const bottom = bottomFlap.current;

    if (flip === null || top === null || bottom === null) {
      return;
    }

    const down = top.animate([{ transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" }], {
      duration: HALF_FLIP_MS,
      easing: "cubic-bezier(0.55, 0, 0.9, 0.45)",
      fill: "forwards",
    });
    const up = bottom.animate([{ transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" }], {
      duration: HALF_FLIP_MS,
      delay: HALF_FLIP_MS,
      easing: "cubic-bezier(0.2, 0.6, 0.35, 1)",
      fill: "both",
    });
    const n = flip.n;

    void up.finished
      .then(() => setFlip((was) => (was?.n === n ? null : was)))
      .catch(() => undefined);

    return () => {
      down.cancel();
      up.cancel();
    };
  }, [flip]);

  return (
    <div
      className={styles.tileDrop}
      style={{ "--sm-delay": `${TILES_AT + order * TILE_STAGGER}ms` } as CSSProperties}
    >
      <div ref={tileRef} className={styles.tile} style={fonts.heading}>
        {/* At rest: the new number's top half, and the old one's bottom half until the flap has come down over it. */}
        <Half which="top" digits={digits} />
        <Half which="bottom" digits={flip === null ? digits : flip.from} />
        {flip !== null ? (
          <>
            <Half
              key={`t${flip.n}`}
              which="top"
              digits={flip.from}
              flap={(element) => {
                topFlap.current = element;
              }}
            />
            <Half
              key={`b${flip.n}`}
              which="bottom"
              digits={digits}
              flap={(element) => {
                bottomFlap.current = element;
              }}
            />
          </>
        ) : null}
      </div>
      <span className={labelClass} style={fonts.heading}>
        {label}
      </span>
    </div>
  );
}

/**
 * The countdown on the mirror-work wall: the card's own `measure` and
 * `unitsOf`, ticking once a second while the tab is shown and the page is
 * within a screen of being seen. After the moment, the card's own words
 * for it instead.
 */
function MoonCountdown({
  draft,
  language,
  fonts,
  near,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: SheeshFonts;
  near: boolean;
}): ReactElement | null {
  const copy = cardCopy(language);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const target = eventInstant(draft.eventDate, draft.eventTime);
  const targetTime = target === null ? null : target.getTime();

  useEffect(() => {
    if (targetTime === null || !near) {
      return;
    }

    const instant = new Date(targetTime);
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = (): void => setCountdown(measure(instant, new Date()));
    const sync = (): void => {
      if (document.visibilityState === "hidden") {
        if (timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      } else if (timer === null) {
        tick();
        timer = setInterval(tick, 1000);
      }
    };

    sync();
    document.addEventListener("visibilitychange", sync);

    return () => {
      if (timer !== null) {
        clearInterval(timer);
      }
      document.removeEventListener("visibilitychange", sync);
    };
  }, [targetTime, near]);

  if (targetTime === null) {
    return null;
  }

  if (countdown !== null && countdown.kind !== "counting") {
    return (
      <p
        className={`${styles.moonAfter} ${styles.tileDrop}`}
        style={{ ...fonts.body, "--sm-delay": `${TILES_AT}ms` } as CSSProperties}
      >
        {countdown.kind === "begun" ? copy.countdown.begun : copy.countdown.passed}
      </p>
    );
  }

  const units = unitsOf(countdown, copy.countdown);

  return (
    <>
      <p className="sr-only" role="timer" aria-live="off">
        {spokenCountdown(units)}
      </p>
      <div aria-hidden="true" className={styles.tiles}>
        {units.map((unit, order) => (
          <FlipTile
            key={unit.id}
            digits={unit.digits}
            label={language === "hi" ? unit.label : (unit.shortLabel ?? unit.label)}
            order={order}
            fonts={fonts}
            labelClass={`${styles.tileLabel} ${styles.caps}`}
          />
        ))}
      </div>
    </>
  );
}

/** The calendar button in ivory satin and antique gold: the card's own, with its sheet, links and file. */
function calendarTheme(theme: Theme): Theme {
  return {
    ...theme,
    accent: GOLD_DEEP,
    surface: IVORY,
    textPrimary: INDIGO_INK,
    textMuted: "#3A3F6E",
  };
}

/**
 * Page 3: Save the Date, written on the moon through the jharokha.
 *
 * THE PICTURE COVERS THE ROOM, as `object-fit: cover` would lay it, in a box
 * of the picture's own shape (`.moonScene`), so the moon is found by its
 * measured place (MOON) at any screen's shape. On a tall phone the picture
 * is cut at its sides and the moon stays within the middle 80% of the width.
 *
 * ON THE MOON, in deep indigo, centred on its centre: "Save the Date" in
 * small spaced capitals, the weekday in italic, the day large and bold, the
 * month and year in spaced capitals and the time in italic, all fitted
 * inside the moon's circle with a margin (fitMoon). Behind the moon's edge a
 * soft warm glow breathes, its opacity rising and falling over eight
 * seconds, held while the page is moving or off the screen.
 *
 * ON THE MIRROR-WORK WALL below the ledge, lifted clear of the browser's
 * bars: the countdown in four mirror tiles that flip as their numbers change
 * (FlipTile), or after the moment the card's own words for it; and under it
 * the card's own Add to Calendar as an ivory satin pill with a thin gold
 * edge.
 *
 * THE ENTRANCE plays once: the words on the moon fade up line by line, then
 * the tiles drop in one after another. Under reduced motion the glow holds
 * still, the lines simply fade in and the numbers change without flipping.
 */
export default function SheeshDatePage({
  draft,
  language,
  occasionId,
  invite,
  theme,
  fonts,
  showCountdown,
}: {
  draft: EventDraft;
  language: CardLanguage;
  occasionId: OccasionId;
  invite: CalendarInvite;
  theme: Theme;
  fonts: SheeshFonts;
  showCountdown: boolean;
}): ReactElement {
  const art = useRoomArt();
  const own = sheeshCopy(language);
  const still = useCardStill();
  const sceneRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);
  const time = page !== null && page.time !== null && hasEventTime(draft.eventTime) ? page.time : null;
  const key = `${page?.weekday}|${page?.day}|${page?.month}|${page?.year}|${time}|${language}`;

  usePageRest(sceneRef, { onNear: setNear });

  useLayoutEffect(() => {
    const scene = sceneRef.current;
    const words = wordsRef.current;

    if (scene === null || words === null) {
      return;
    }

    let live = true;
    let cancelIdle: (() => void) | null = null;
    const fit = (): void => {
      if (live) {
        fitMoon(scene, words);
      }
    };
    const refit = (): void => {
      cancelIdle?.();
      cancelIdle = whenIdle(fit);
    };

    fit();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(refit) : null;
    observer?.observe(scene);
    void document.fonts?.ready.then(fit);
    /* A face that arrives later (the Devanagari one, when the guest switches to Hindi): fitted again. */
    document.fonts?.addEventListener("loadingdone", refit);

    return () => {
      live = false;
      cancelIdle?.();
      observer?.disconnect();
      document.fonts?.removeEventListener("loadingdone", refit);
    };
  }, [key]);

  const ink: CSSProperties = { color: INDIGO_INK };

  return (
    <SheeshPage
      label={own.pages.date}
      images={art === null ? [] : [art.jharokhaMoon]}
      ground={
        <div
          ref={sceneRef}
          className={styles.moonScene}
          style={{ "--moon-aspect": String(MOON_ASPECT) } as CSSProperties}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art?.jharokhaMoon} alt="" loading="lazy" decoding="async" draggable={false} className={styles.moonArt} />
          <span
            aria-hidden="true"
            className={styles.moonGlow}
            style={{ left: pc(MOON.x), top: pc(MOON.y), width: pc(MOON.r * 3.6) }}
          />
          <div
            ref={wordsRef}
            className={styles.moonWords}
            style={{ left: pc(MOON.x), top: pc(MOON.y), ...ink }}
          >
            <Line order={0} className={`${styles.moonCaps} ${styles.caps}`} style={fonts.heading}>
              {own.pages.date}
            </Line>
            {page !== null ? (
              <>
                <Line order={1} className={styles.moonWeekday} style={fonts.heading}>
                  {page.weekday}
                </Line>
                <Line order={2} className={styles.moonDay} style={fonts.heading}>
                  {page.day}
                </Line>
                <Line order={3} className={`${styles.moonMonth} ${styles.caps}`} style={fonts.heading}>
                  {page.month} {page.year}
                </Line>
                {time !== null ? (
                  <Line order={4} className={styles.moonTime} style={fonts.heading}>
                    {time}
                  </Line>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      }
    >
      <div className={styles.moonFoot}>
        {/* For a guest who tapped their way here: a smaller "Swipe up", above the tiles (Hint.tsx). */}
        <SwipeHint language={language} small />
        {showCountdown ? (
          <MoonCountdown draft={draft} language={language} fonts={fonts} near={near || still} />
        ) : null}
        <div
          className={`${styles.calendarPill} ${styles.tileDrop}`}
          style={{ "--sm-delay": `${TILES_AT + 4 * TILE_STAGGER + 80}ms` } as CSSProperties}
        >
          <AddToCalendar
            draft={draft}
            theme={calendarTheme(theme)}
            invite={invite}
            occasionId={occasionId}
            language={language}
          />
        </div>
      </div>
    </SheeshPage>
  );
}
