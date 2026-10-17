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
import { ART, ROLL_ASPECT, ROLL_PAPER } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { Corners, Shadow } from "@/templates/gulab-mahal/Decor";
import GulabPage from "@/templates/gulab-mahal/Page";
import {
  IVORY,
  ROSE_GOLD_DEEP,
  WINE,
  WINE_SOFT,
  gulabCopy,
  scriptLeading,
  type GulabFonts,
} from "@/templates/gulab-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";
const SETTLE = "cubic-bezier(0.34, 1.15, 0.64, 1)";
/* Let go past this share of the way, the scroll finishes opening; short of it, it rolls back up. */
const OPEN_PAST = 0.35;
/* A press that moves less than this is a tap, which opens it. */
const TAP_SLOP_PX = 6;

/**
 * The countdown, ticking once a second while the tab is shown: the card's own
 * `measure` and `unitsOf`, in four small rose-gold frames.
 */
function ScrollCountdown({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement | null {
  const copy = cardCopy(language);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const target = eventInstant(draft.eventDate, draft.eventTime);
  const targetTime = target === null ? null : target.getTime();

  useEffect(() => {
    if (targetTime === null) {
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
  }, [targetTime]);

  if (targetTime === null) {
    return null;
  }

  const units = unitsOf(countdown, copy.countdown);

  if (countdown !== null && countdown.kind !== "counting") {
    return (
      <p
        className={styles.script}
        style={{ ...fonts.names, fontSize: "7cqw", lineHeight: scriptLeading(language) }}
      >
        {countdown.kind === "begun" ? copy.countdown.begun : copy.countdown.passed}
      </p>
    );
  }

  return (
    <>
      <p className="sr-only" role="timer" aria-live="off">
        {spokenCountdown(units)}
      </p>
      <div aria-hidden="true" className={styles.countdown}>
        {units.map((unit) => (
          <div key={unit.id} className={styles.countdownBox}>
            <span className={styles.countdownFigure} style={fonts.heading}>
              {unit.digits}
            </span>
            <span
              className={language === "hi" ? styles.countdownLabelHi : styles.countdownLabel}
              style={fonts.heading}
            >
              {language === "hi" ? unit.label : (unit.shortLabel ?? unit.label)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** The calendar button in wine and rose gold: the card's own, with its sheet, links and file. */
function calendarTheme(theme: Theme): Theme {
  return {
    ...theme,
    accent: WINE,
    surface: IVORY,
    textPrimary: WINE,
    textMuted: WINE_SOFT,
  };
}

/**
 * Page 3: the date, on a scroll the guest pulls open.
 *
 * TWO ROLLS AND THE PAPER BETWEEN THEM. The top roll stays where it is; the
 * paper is in a window that starts under the top roll's middle and clips
 * whatever of it is above, and the bottom roll rides the paper's lower edge.
 * Opening is one number, how far along it is, and both the paper and the
 * bottom roll are moved down by that share of the paper's height: one
 * transform each, nothing else. Closed, the two rolls touch and the paper is
 * all above the window.
 *
 * THE GUEST PULLS IT. The bottom roll follows the finger: its height is read
 * once as the finger comes down, and while it moves the two transforms are
 * written once a frame, with nothing read from the page. Let go past 35% of
 * the way, it finishes opening on a spring; short of it, it rolls back up. A
 * tap anywhere on the scroll opens it all the way. Once open it stays open
 * and lets a swipe up the page through.
 *
 * THIS IS THE CARD'S REVEAL: it opens fresh on every visit, and the host's
 * scratch panels for the date and the countdown are not used on this card.
 * Under reduced motion, and on a card laid out as a picture, it is open from
 * the start.
 *
 * On the paper, in wine: "Save the Date" in spaced capitals, the weekday, the
 * day large in script, the month and year, the time, a thin rose-gold rule
 * and the countdown in four small rose-gold frames. Under the scroll, the
 * card's own Add to Calendar, which fades in once the scroll is open.
 *
 * THE WORDS DO NOT MOVE. As the paper and the bottom roll come down, the
 * words are moved up by exactly as much, so they stay where they are under
 * the top roll, and the paper, which clips them, uncovers them from the top
 * down, as a scroll is read.
 */
export default function GulabScrollPage({
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
  fonts: GulabFonts;
  showCountdown: boolean;
}): ReactElement {
  const copy = cardCopy(language);
  const own = gulabCopy(language);
  const still = useCardStill();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const openFromStart = still || reducedMotion;
  const [open, setOpen] = useState(false);
  const shown = open || openFromStart;

  const paperRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const paperShadowRef = useRef<HTMLImageElement>(null);
  const rollRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const drag = useRef({
    progress: 0,
    height: 0,
    startY: 0,
    lastY: 0,
    pressed: false,
    moved: false,
    frame: 0,
    settling: [] as Animation[],
  });

  const page = calendarPageText(draft.eventDate, draft.eventTime, language);

  /*
    Both moving parts, `progress` of the way open, and the words held still
    against the paper's movement: they stay where they are under the top
    roll and the paper's edge, which clips them, uncovers them from the top.
  */
  const write = useCallback((progress: number): void => {
    const state = drag.current;
    const travel = (progress * state.height).toFixed(1);
    const y = `translate3d(0, ${travel}px, 0)`;

    if (paperRef.current !== null) {
      paperRef.current.style.transform = y;
    }

    if (wordsRef.current !== null) {
      wordsRef.current.style.transform = `translate3d(0, -${travel}px, 0)`;
    }

    /* The paper's shadow, as long as the paper that has come down. */
    if (paperShadowRef.current !== null) {
      paperShadowRef.current.style.transform = `scaleY(${progress.toFixed(4)})`;
    }

    if (rollRef.current !== null) {
      rollRef.current.style.transform = y;
    }

    if (hintRef.current !== null) {
      hintRef.current.style.opacity = String(Math.max(0, 1 - progress * 4));
    }
  }, []);

  /* From where it is to open or closed, on a spring; then left there, written as its own style. */
  const settle = useCallback(
    (to: 0 | 1): void => {
      const state = drag.current;
      const paper = paperRef.current;
      const roll = rollRef.current;

      if (paper === null || roll === null) {
        return;
      }

      if (state.height === 0) {
        state.height = paper.offsetHeight - roll.offsetHeight * 0.95;
      }

      for (const animation of state.settling) {
        animation.cancel();
      }

      const from = `translate3d(0, ${(state.progress * state.height).toFixed(1)}px, 0)`;
      const end = `translate3d(0, ${(to * state.height).toFixed(1)}px, 0)`;
      const timing: KeyframeAnimationOptions = {
        duration: to === 1 ? 750 : 520,
        easing: to === 1 ? SPRING : SETTLE,
        fill: "forwards",
      };

      state.settling = [
        paper.animate([{ transform: from }, { transform: end }], timing),
        roll.animate([{ transform: from }, { transform: end }], timing),
      ];

      if (paperShadowRef.current !== null) {
        state.settling.push(
          paperShadowRef.current.animate(
            [{ transform: `scaleY(${state.progress})` }, { transform: `scaleY(${to})` }],
            timing,
          ),
        );
      }

      if (wordsRef.current !== null) {
        state.settling.push(
          wordsRef.current.animate(
            [
              { transform: `translate3d(0, -${(state.progress * state.height).toFixed(1)}px, 0)` },
              { transform: `translate3d(0, -${(to * state.height).toFixed(1)}px, 0)` },
            ],
            timing,
          ),
        );
      }

      if (hintRef.current !== null) {
        state.settling.push(
          hintRef.current.animate(
            [{ opacity: hintRef.current.style.opacity || "1" }, { opacity: to === 1 ? "0" : "1" }],
            { duration: 300, fill: "forwards" },
          ),
        );
      }

      const done = state.settling[0];
      done.addEventListener("finish", () => {
        if (state.settling[0] !== done) {
          return;
        }

        state.progress = to;
        write(to);

        for (const animation of state.settling) {
          animation.cancel();
        }

        state.settling = [];

        if (to === 1) {
          setOpen(true);
        }
      });
    },
    [write],
  );

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    if (shown || event.button !== 0) {
      return;
    }

    const state = drag.current;
    const paper = paperRef.current;
    const roll = rollRef.current;

    if (paper === null || roll === null) {
      return;
    }

    /* Caught mid-spring: carry on from where it is now. */
    if (state.settling.length > 0) {
      for (const animation of state.settling) {
        animation.cancel();
      }

      state.settling = [];
      write(state.progress);
    }

    /* Read once, here, and never while the finger moves. */
    state.height = paper.offsetHeight - roll.offsetHeight * 0.95;
    state.startY = event.clientY - state.progress * state.height;
    state.lastY = event.clientY;
    state.pressed = true;
    state.moved = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;

    if (!state.pressed) {
      return;
    }

    state.lastY = event.clientY;

    if (state.frame === 0) {
      state.frame = window.requestAnimationFrame(() => {
        state.frame = 0;
        const travelled = state.lastY - state.startY;

        if (Math.abs(travelled - state.progress * state.height) > TAP_SLOP_PX) {
          state.moved = true;
        }

        state.progress = Math.min(1, Math.max(0, travelled / Math.max(1, state.height)));
        write(state.progress);
      });
    }
  };

  const onPointerUp = (): void => {
    const state = drag.current;

    if (!state.pressed) {
      return;
    }

    state.pressed = false;
    window.cancelAnimationFrame(state.frame);
    state.frame = 0;
    settle(!state.moved || state.progress > OPEN_PAST ? 1 : 0);
  };

  /* A tap anywhere on the closed scroll, or Enter or Space on it, opens it. */
  const onActivate = (): void => {
    if (!shown && !drag.current.pressed && drag.current.settling.length === 0) {
      settle(1);
    }
  };

  useEffect(
    () => () => {
      window.cancelAnimationFrame(drag.current.frame);
    },
    [],
  );

  const date = page !== null ? (
    <>
      <p className={`${styles.caps} ${styles.scrollCaps}`} style={fonts.heading}>
        {copy.calendar.heading}
      </p>
      <p className={styles.scrollWeekday} style={fonts.heading}>
        {page.weekday}
      </p>
      <p
        className={`${styles.script} ${styles.scrollDay}`}
        style={{ ...fonts.names, lineHeight: 1.1 }}
      >
        {page.day}
      </p>
      <p className={styles.scrollMonth} style={fonts.heading}>
        {page.month} {page.year}
      </p>
      {page.time !== null && hasEventTime(draft.eventTime) ? (
        <p className={styles.scrollTime} style={fonts.body}>
          {page.time}
        </p>
      ) : null}
    </>
  ) : (
    <p className={`${styles.caps} ${styles.scrollCaps}`} style={fonts.heading}>
      {copy.calendar.heading}
    </p>
  );

  return (
    <GulabPage
      label={copy.calendar.heading}
      images={[ART.scrollRoll, ART.scrollPaper, ART.shadow.roll, ART.shadow.paper]}
      variant={1}
    >
      <div
        className={`${styles.scroll} ${styles.rise} ${shown ? styles.scrollOpen : ""}`}
        style={
          {
            "--roll-aspect": String(ROLL_ASPECT),
            "--paper-share": String(ROLL_PAPER),
          } as CSSProperties
        }
      >
        {/*
          The paper's shadow: the window's size, and as long as the paper
          that has come down (a scale, from the top). Outside the window,
          which would cut its soft edges off.
        */}
        <img
          ref={paperShadowRef}
          src={ART.shadow.paper}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          draggable={false}
          className={styles.paperShadow}
          style={shown ? { transform: "scaleY(1)" } : undefined}
        />

        {/* The paper's window: it starts under the top roll's middle and hides whatever of the paper is above. */}
        <div className={styles.scrollWindow}>
          <div
            ref={paperRef}
            className={styles.scrollPaper}
            style={shown ? { transform: "translate3d(0, var(--paper-h), 0)" } : undefined}
            onClick={onActivate}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART.scrollPaper} alt="" loading="lazy" decoding="async" draggable={false} className={styles.scrollPaperArt} />
            <div
              ref={wordsRef}
              className={styles.scrollWords}
              style={{
                color: WINE,
                ...(shown ? { transform: "translate3d(0, calc(var(--paper-h) * -1), 0)" } : null),
              }}
            >
              {date}
              {showCountdown ? (
                <>
                  <span aria-hidden="true" className={styles.divider} style={{ fontSize: "3cqw", color: ROSE_GOLD_DEEP }}>
                    <span className={styles.dividerMark} />
                  </span>
                  <ScrollCountdown draft={draft} language={language} fonts={fonts} />
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.rollTop} onClick={onActivate}>
          <Shadow src={ART.shadow.roll} aspect={ROLL_ASPECT} drop={0.012} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.scrollRoll} alt="" loading="lazy" decoding="async" draggable={false} className={styles.rollArt} />
          <Corners size={0.24} which="top" className={styles.rollCorner} />
        </div>

        {/* The bottom roll, which the guest pulls; the hint rides under it. */}
        <div
          ref={rollRef}
          className={styles.rollBottom}
          style={shown ? { transform: "translate3d(0, var(--paper-h), 0)" } : undefined}
          role={shown ? undefined : "button"}
          tabIndex={shown ? undefined : 0}
          aria-label={shown ? undefined : own.pullScroll}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onActivate();
            }
          }}
        >
          <Shadow src={ART.shadow.roll} aspect={ROLL_ASPECT} drop={0.012} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.scrollRoll} alt="" loading="lazy" decoding="async" draggable={false} className={styles.rollArt} />
          <Corners size={0.24} which="foot" className={styles.rollCorner} />
          {shown ? null : (
            <p ref={hintRef} className={`${styles.scrollHint} ${styles.onVelvet}`} style={fonts.italic(language)}>
              <span>{own.pullScroll}</span>
              <svg viewBox="0 0 20 12" aria-hidden="true" focusable="false" className={styles.scrollHintArrow}>
                <path d="M2 2 L10 9 L18 2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          )}
        </div>
      </div>

      {/* Under the scroll, and only once it is open: until then it keeps its place, unseen and out of reach. */}
      <div className={`${styles.calendarButton} ${shown ? styles.calendarButtonShown : ""}`} inert={!shown}>
        <AddToCalendar
          draft={draft}
          theme={calendarTheme(theme)}
          invite={invite}
          occasionId={occasionId}
          language={language}
        />
      </div>
    </GulabPage>
  );
}
