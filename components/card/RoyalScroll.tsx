"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { CalendarPageText } from "@/lib/cardFormat";
import {
  SCROLL_H,
  SCROLL_PAPER_H,
  SCROLL_PAPER_SHARE,
  SCROLL_ROLLER_H,
  SCROLL_SAFE_INSET,
  SCROLL_TRAVEL,
  type ScrollArt,
  type ScrollInks,
} from "@/lib/royalScroll";

/**
 * The date, on a royal scroll that unrolls when the guest taps it.
 *
 * TWO ROLLERS AND ONE STRIP OF PAPER. Closed, the rollers lie together in the
 * middle of the space the open scroll will take, and no paper shows. Open, the
 * top roller is at the top, the bottom one at the bottom, and the paper runs
 * between them from the middle of one to the middle of the other. The space is
 * the open scroll's from the first paint, at a fixed proportion, so nothing on
 * the card moves when it opens or when its pictures arrive.
 *
 * HOW THE PAPER IS REVEALED: TWO WINDOWS, MOVED BY TRANSFORM. Nothing is
 * clipped by an animated clip-path and nothing changes size. The paper and the
 * words on it are one sheet, drawn twice — once behind a window over the top
 * half and once behind a window over the bottom half. Each window starts
 * pushed to the middle and travels out with its roller; the sheet inside it
 * travels the same distance the other way, at the same moment, on the same
 * curve, so the sheet stands still on the page while the window's edge moves
 * across it. The sheet's own half is clipped as well as the window: a window
 * pushed to the middle lies over the other half of the page, and would show
 * that half of the paper through itself if the sheet were whole. What the guest sees is paper appearing from the centre outward,
 * under the rollers. Four transforms and the two rollers', all on the
 * compositor.
 *
 * IN ORDER: the rollers settle (150ms), then roll apart (1.2s, a slow heavy
 * stop) leaning a few degrees as they go, and the lines come up from the
 * centre outward, 80ms apart, as the paper reaches them. Once, for the life of
 * the page: scrolling away and back finds it open.
 *
 * WHEN IT PLAYS: WHEN IT IS TAPPED, AND NOT BEFORE. It used to unroll by
 * itself as the guest reached it. Now it waits rolled up, with "Tap to open" under
 * it and a small shake of the rollers every few seconds, and the whole of the
 * space the open scroll will take is the button: a tap, a click, Enter or
 * Space. The host's preview is the same, so the host sees what a guest does.
 *
 * Its pictures are sent for when the screen is still 600px away, so they are
 * in hand by the tap; if they are not, it waits for them, a second and a half
 * at most, and it never unrolls a scroll it has not got the pictures for —
 * past that it simply stands open, and the pictures come up under the words
 * when they arrive.
 *
 * READ OUT WHETHER OR NOT IT IS OPEN. The scroll is a group named with the
 * whole date, time and venue, and the button lies over it rather than being
 * it, so a screen reader has the date before the tap as well as after.
 *
 * LESS MOTION: it still waits for the tap, and then there are no rollers
 * travelling and no lines rising. The open scroll fades in over 300ms.
 *
 * THE WORDS NEVER LEAVE THE PAPER, AND NEVER GO BELOW 12PX. They are set
 * inside the strip's gold borders and sized off the scroll's own width, each
 * with a floor of 12px. When there is not room for them at that size, the
 * room is found, in this order, before any letter is made smaller:
 *
 *   1. The scroll is drawn wider. A flower frame narrows the card's column,
 *      and a scroll held to that column is a small one; so on such a card it
 *      keeps the width it has on any other (82% of the card) and runs out
 *      into the frame's margin, and to 88% if the words still do not fit.
 *   2. The venue wraps, to three lines at most, and the address to two.
 *   3. The gaps between the lines close up, to a third of their size.
 *
 * Only past all three is the whole block scaled down, and that is the one
 * case in which a letter can fall under 12px: it is there so that nothing can
 * ever run off the paper, and no card it has been checked on reaches it.
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** How long the rollers take to settle before they move. */
const SETTLE_MS = 150;
/** How long they take to roll apart. */
const UNROLL_MS = 1200;
/** Slow, heavy, and a smooth stop. */
const UNROLL_EASE = "cubic-bezier(0.16, 0.84, 0.3, 1)";
/** How far a roller leans at the start of its travel, in degrees. */
const ROLLER_LEAN = 16;
/** When the first line starts to come up, after the rollers start to part. */
const LINES_AFTER_MS = 260;
/** How far apart the lines come up, one step out from the centre at a time. */
const LINE_STAGGER_MS = 80;
/** How long a line takes to come up. */
const LINE_MS = 520;
/** The fade for a guest who asked for less motion, and for a scroll that could not unroll. */
const STILL_FADE_MS = 300;
/** The scroll's width on any card, as a share of the card's, and the most it may grow to under a flower frame. */
const WIDTH_SHARE = 0.82;
const WIDTH_SHARE_MOST = 0.88;
/** The gap between two lines, as a share of the scroll's width, and the least it may close up to. */
const LINE_GAP = 0.019;
const GAP_FLOOR = 0.34;
/** How far off the screen the date's section is when the pictures are sent for. */
const PRELOAD_MARGIN = "600px 0px";
/** The longest the unroll waits for its pictures. */
const ART_WAIT_MS = 1500;

/**
 * closed    the rollers together, as the server drew it
 * opening   the unroll, playing
 * open      the unroll, over: nothing is promoted to a layer any more
 * still     open without having unrolled: less motion, or pictures that came late
 */
type Phase = "closed" | "opening" | "open" | "still";

/** A length in the scroll's own units: a share of its width. */
function u(share: number): string {
  return `${(share * 100).toFixed(3)}cqw`;
}

/** A short gold rule with a diamond at its middle. */
function Rule({ color }: { color: string }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 8"
      className="block h-[2.4cqw] w-[19cqw]"
      style={{ color }}
    >
      <path d="M2 4 H24 M40 4 H62" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M32 0.8 L35.2 4 L32 7.2 L28.8 4 Z" fill="currentColor" />
      <circle cx="26.2" cy="4" r="0.9" fill="currentColor" />
      <circle cx="37.8" cy="4" r="0.9" fill="currentColor" />
    </svg>
  );
}

export default function RoyalScroll({
  art,
  inks,
  page,
  venueName,
  venueAddress,
  script,
  scriptFace,
  hint,
  openLabel,
  width,
}: {
  art: ScrollArt;
  inks: ScrollInks;
  page: CalendarPageText;
  /** Null where there is none, or where it is behind a scratch panel of its own. */
  venueName: string | null;
  venueAddress: string | null;
  /** The card's script, which decides the weekday's and month's face and spacing. */
  script: "latin" | "devanagari";
  /** The face a Devanagari weekday, month and time are set in. */
  scriptFace: string;
  /** "Tap to open", under the closed scroll, in the card's language. */
  hint: string;
  /** What the closed scroll is called as a button. */
  openLabel: string;
  /** How wide the scroll is drawn, as a CSS length. */
  width: string;
}): ReactElement {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  /* A card shown as a picture of itself has nobody to tap the scroll: it stands open. */
  const still = useCardStill();
  const stageRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>(still ? "still" : "closed");
  /* The pictures have been sent for, and have arrived and been decoded. */
  const [wanted, setWanted] = useState(still);
  const [ready, setReady] = useState(false);
  /* The guest has asked for it to open. Never unset: an opened scroll stays open. */
  const [tapped, setTapped] = useState(false);
  /* How far the words are brought down to fit the paper: the last resort. */
  const [fit, setFit] = useState(1);
  /* How far the gaps between the lines are closed up, before that. */
  const [gapScale, setGapScale] = useState(1);
  /*
    The scroll's width in px on a card whose flower frame leaves it a column
    narrower than a scroll should be; null on every other card, where the
    width it was handed stands.
  */
  const [grown, setGrown] = useState<number | null>(null);
  /* Whether the words overflowed at the first width, for the card's width it was measured at. */
  const widest = useRef<{ card: number; most: boolean }>({ card: 0, most: false });

  /* The pictures, from 600px away. */
  useEffect(() => {
    const stage = stageRef.current;

    if (stage === null || typeof IntersectionObserver !== "function") {
      setWanted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setWanted(true);
          observer.disconnect();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(stage);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!wanted) {
      return;
    }

    let live = true;

    void Promise.all(
      [art.roller, art.paper].map((src) => {
        const image = new Image();
        image.src = src;

        return typeof image.decode === "function"
          ? image.decode()
          : new Promise<void>((resolve, reject) => {
              image.onload = () => resolve();
              image.onerror = () => reject(new Error(src));
            });
      }),
    ).then(
      () => {
        if (live) {
          setReady(true);
        }
      },
      /* A picture that fails is a scroll that stands open without it; the words are what matter. */
      () => undefined,
    );

    return () => {
      live = false;
    };
  }, [wanted, art.roller, art.paper]);

  /* The one decision: unroll, or stand open. Made once, on the tap. */
  useEffect(() => {
    if (phase !== "closed" || !tapped) {
      return;
    }

    const lessMotion =
      reducedMotion ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia(REDUCED_MOTION_QUERY).matches);

    if (lessMotion) {
      setPhase("still");
      return;
    }

    if (ready) {
      setPhase("opening");
      return;
    }

    /* Not in hand yet: wait, and if they do not come, open without the unroll. */
    const timer = window.setTimeout(() => setPhase("still"), ART_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, tapped, ready, reducedMotion]);

  const open = (): void => {
    setTapped(true);
    /* The button goes with the tap; the date it opened is what is in focus after it. */
    stageRef.current?.focus({ preventScroll: true });
  };

  const handleKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  };

  /* The layers are let go once everything has landed. */
  useEffect(() => {
    if (phase !== "opening") {
      return;
    }

    const timer = window.setTimeout(
      () => setPhase("open"),
      SETTLE_MS + UNROLL_MS + LINES_AFTER_MS + LINE_STAGGER_MS * 5 + LINE_MS + 100,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  /* The words, measured against the paper's safe area. Never while anything is moving. */
  useEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;

    if (box === null || content === null || typeof ResizeObserver !== "function") {
      return;
    }

    const stage = stageRef.current;
    const section = stage?.closest("section") ?? null;
    const card = stage?.closest<HTMLElement>(".lifafa-card-content") ?? null;

    const measure = (): void => {
      const roomW = box.clientWidth;
      const roomH = box.clientHeight;

      if (roomW < 1 || roomH < 1 || content.offsetWidth < 1 || content.offsetHeight < 1) {
        return;
      }

      /*
        What the lines need with no gaps between them at all, and what the
        gaps come to at full size: the two are kept apart so the gaps can be
        closed up by exactly what is missing, in one step and without the
        measurement chasing its own result.
      */
      const stageW = stage?.clientWidth ?? 0;
      const gapNow = Number.parseFloat(getComputedStyle(content).rowGap) || 0;
      const gaps = Math.max(0, content.childElementCount - 1);
      const linesH = content.offsetHeight - gapNow * gaps;
      const fullGap = stageW * LINE_GAP;
      const over = linesH + fullGap * gaps - roomH;

      /*
        1. Wider. Only a card whose column is narrower than a scroll should be
        — a flower frame's — and never past 88% of the card.
      */
      if (section !== null && card !== null && stageW > 0) {
        const style = getComputedStyle(section);
        const column =
          section.clientWidth -
          Number.parseFloat(style.paddingLeft) -
          Number.parseFloat(style.paddingRight);
        const cardW = card.clientWidth;

        if (Math.abs(widest.current.card - cardW) > 1) {
          widest.current = { card: cardW, most: false };
        }

        if (column < cardW * WIDTH_SHARE - 1) {
          /* The words did not fit at the usual width: take the most. Never back, for this card width. */
          if (over > 0.5 && stageW >= cardW * WIDTH_SHARE - 1) {
            widest.current.most = true;
          }

          const next = Math.round(
            cardW * (widest.current.most ? WIDTH_SHARE_MOST : WIDTH_SHARE),
          );
          setGrown((current) => (current === next ? current : next));
        } else {
          setGrown(null);
        }
      }

      /* 2 is the lines' own wrapping. 3. The gaps, closed up by what is missing and no more. */
      const nextGap =
        gaps === 0 || fullGap <= 0
          ? 1
          : Math.min(1, Math.max(GAP_FLOOR, (roomH - linesH) / (fullGap * gaps)));
      setGapScale((current) => (Math.abs(current - nextGap) < 0.02 ? current : nextGap));

      /* And only then the block as a whole. */
      const next = Math.min(
        1,
        roomW / content.offsetWidth,
        roomH / (linesH + fullGap * nextGap * gaps),
      );
      setFit((current) => (Math.abs(current - next) < 0.01 ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(content);

    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) {
        measure();
      }
    });

    return () => {
      live = false;
      observer.disconnect();
    };
  }, []);

  const closed = phase === "closed";
  const moving = phase === "opening";
  /* Rolled up and not yet asked to open: the button, its hint and the shake. */
  const inviting = closed && !tapped;
  /* Open without the unroll: every part of it fades in together. */
  const fadeIn: CSSProperties =
    phase === "still"
      ? { animation: `lifafa-scroll-fade ${STILL_FADE_MS}ms ease-out both` }
      : {};
  const travel = `transform ${UNROLL_MS}ms ${UNROLL_EASE} ${SETTLE_MS}ms`;
  /* Only while it is playing: a layer held for a scroll that has finished is memory for nothing. */
  const promoted: CSSProperties = moving ? { willChange: "transform" } : {};
  const moved = (share: number, lean = 0): CSSProperties => ({
    transform: closed
      ? `translate3d(0, ${u(share)}, 0)${lean !== 0 ? ` rotateX(${lean}deg)` : ""}`
      : "translate3d(0, 0, 0)",
    transition: moving ? travel : undefined,
    ...promoted,
  });

  const devanagari = script === "devanagari";
  const side = (1 - SCROLL_PAPER_SHARE) / 2;
  const wordsInset = side + SCROLL_PAPER_SHARE * SCROLL_SAFE_INSET;
  const wordsWidth = 1 - wordsInset * 2;

  /*
    The lines, top to bottom. Each knows how many steps it is from the day's
    numeral, which is the middle of the sheet and the first to come up.
  */
  const lines: { key: string; node: ReactNode }[] = [
    {
      key: "weekday",
      node: (
        <p
          lang={devanagari ? "hi" : undefined}
          className={`whitespace-nowrap ${
            devanagari
              ? "text-[max(13px,4.6cqw)] leading-[1.5]"
              : "ps-[0.34em] text-[max(12px,3.5cqw)] leading-[1.5] tracking-[0.34em] uppercase"
          }`}
          style={{ color: inks.quiet, ...(devanagari ? { fontFamily: scriptFace } : null) }}
        >
          {page.weekday}
        </p>
      ),
    },
    {
      key: "month",
      node: (
        <p
          lang={devanagari ? "hi" : undefined}
          className={`whitespace-nowrap ${
            devanagari
              ? "text-[max(15px,5.8cqw)] leading-[1.45]"
              : "ps-[0.3em] text-[max(13px,4.5cqw)] leading-[1.4] font-medium tracking-[0.3em] uppercase"
          }`}
          style={{ color: inks.emphasis, ...(devanagari ? { fontFamily: scriptFace } : null) }}
        >
          {page.month}
        </p>
      ),
    },
    {
      key: "day",
      node: (
        <p
          className="text-[21cqw] leading-[0.98]"
          style={{
            color: inks.emphasis,
            fontFamily: "var(--card-heading)",
            fontWeight: 700,
            /* Lining figures: an old-style 3 or 9 hangs below the line, into the year under it. */
            fontVariantNumeric: "lining-nums tabular-nums",
          }}
        >
          {page.day}
        </p>
      ),
    },
    {
      key: "year",
      node: (
        <p
          className="ps-[0.2em] text-[max(12px,4.6cqw)] leading-[1.4] tracking-[0.2em] whitespace-nowrap"
          style={{ color: inks.quiet, fontVariantNumeric: "lining-nums" }}
        >
          {page.year}
        </p>
      ),
    },
    ...(page.time !== null
      ? [
          { key: "rule-time", node: <Rule color={inks.rule} /> },
          {
            key: "time",
            node: (
              <p
                lang={devanagari ? "hi" : undefined}
                className={`whitespace-nowrap ${
                  devanagari
                    ? "text-[max(13px,4.8cqw)] leading-[1.5]"
                    : "ps-[0.12em] text-[max(12px,4.8cqw)] leading-[1.4] tracking-[0.12em]"
                }`}
                style={{ color: inks.quiet, ...(devanagari ? { fontFamily: scriptFace } : null) }}
              >
                {page.time}
              </p>
            ),
          },
        ]
      : []),
    ...(venueName !== null || venueAddress !== null
      ? [{ key: "rule-venue", node: <Rule color={inks.rule} /> }]
      : []),
    ...(venueName !== null
      ? [
          {
            key: "venue",
            node: (
              <p
                className={`line-clamp-3 text-[max(14px,5.5cqw)] wrap-anywhere text-balance ${
                  devanagari ? "leading-[1.5]" : "leading-[1.22]"
                }`}
                style={{
                  color: inks.emphasis,
                  maxWidth: u(wordsWidth),
                  fontFamily: "var(--card-heading)",
                  fontWeight: "var(--card-heading-weight)" as unknown as number,
                }}
              >
                {venueName}
              </p>
            ),
          },
        ]
      : []),
    ...(venueAddress !== null
      ? [
          {
            key: "address",
            node: (
              <p
                className={`line-clamp-2 text-[max(12px,3.5cqw)] wrap-anywhere text-balance ${
                  devanagari ? "leading-[1.5]" : "leading-[1.35]"
                }`}
                style={{ color: inks.quiet, maxWidth: u(wordsWidth) }}
              >
                {venueAddress}
              </p>
            ),
          },
        ]
      : []),
  ];
  const centre = lines.findIndex((line) => line.key === "day");

  /* One sheet: the paper, and the words on it. Drawn behind each window; only the first is read out. */
  const sheet = (copy: "top" | "bottom"): ReactElement => (
    <div
      aria-hidden={copy === "bottom" ? true : undefined}
      className="absolute left-0"
      style={{
        top: copy === "top" ? u(-SCROLL_ROLLER_H / 2) : u(-SCROLL_H / 2),
        width: "100cqw",
        height: u(SCROLL_H),
      }}
    >
      {wanted ? (
        <img
          src={art.paper}
          alt=""
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            left: u(side),
            top: u(SCROLL_ROLLER_H / 2),
            width: u(SCROLL_PAPER_SHARE),
            height: u(SCROLL_PAPER_H),
            opacity: ready ? 1 : 0,
            transition: phase === "still" ? `opacity ${STILL_FADE_MS}ms ease-out` : undefined,
          }}
        />
      ) : null}

      <div
        ref={copy === "top" ? boxRef : undefined}
        className="absolute flex items-center justify-center"
        style={{
          left: u(wordsInset),
          width: u(wordsWidth),
          top: u(SCROLL_ROLLER_H + 0.035),
          bottom: u(SCROLL_ROLLER_H + 0.035),
        }}
      >
        <div
          ref={copy === "top" ? contentRef : undefined}
          className="flex w-fit min-w-full shrink-0 flex-col items-center text-center"
          style={{
            rowGap: u(LINE_GAP * gapScale),
            transform: fit < 1 ? `scale(${fit.toFixed(3)})` : undefined,
          }}
        >
          {lines.map((line, index) => {
            const steps = Math.abs(index - centre);

            return (
              <div
                key={line.key}
                className="flex max-w-full justify-center"
                style={
                  phase === "still"
                    ? { opacity: 1, transition: `opacity ${STILL_FADE_MS}ms ease-out` }
                    : {
                        opacity: closed ? 0 : 1,
                        transform: closed ? "translate3d(0, 2.4cqw, 0)" : "translate3d(0, 0, 0)",
                        transition: moving
                          ? `opacity ${LINE_MS}ms ease-out ${SETTLE_MS + LINES_AFTER_MS + steps * LINE_STAGGER_MS}ms, transform ${LINE_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1) ${SETTLE_MS + LINES_AFTER_MS + steps * LINE_STAGGER_MS}ms`
                          : undefined,
                      }
                }
              >
                {line.node}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const roller = (at: "top" | "bottom"): ReactElement => (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 w-full"
      style={{
        top: at === "top" ? 0 : u(SCROLL_H - SCROLL_ROLLER_H),
        height: u(SCROLL_ROLLER_H),
        ...moved(
          at === "top" ? SCROLL_TRAVEL : -SCROLL_TRAVEL,
          at === "top" ? ROLLER_LEAN : -ROLLER_LEAN,
        ),
        ...fadeIn,
      }}
    >
      {wanted ? (
        <img
          src={art.roller}
          alt=""
          decoding="async"
          draggable={false}
          className={`block h-full w-full select-none ${
            moving
              ? "animate-[lifafa-scroll-settle_150ms_ease-out_both]"
              : inviting
                ? "lifafa-scroll-invite"
                : ""
          }`}
          style={{
            opacity: ready ? 1 : 0,
            transition: phase === "still" ? `opacity ${STILL_FADE_MS}ms ease-out` : undefined,
          }}
        />
      ) : null}
    </div>
  );

  const windowHeight = SCROLL_H / 2 - SCROLL_ROLLER_H / 2;

  return (
    <div
      ref={stageRef}
      data-royal-scroll={phase}
      /* One date, read in order, whatever the two sheets draw. */
      role="group"
      aria-label={[page.weekday, page.day, page.month, page.year, page.time, venueName, venueAddress]
        .filter((part) => part !== null && part !== "")
        .join(", ")}
      data-fit={fit < 1 ? fit.toFixed(2) : undefined}
      /* Focusable only by script: where focus goes when the button over it is gone. */
      tabIndex={-1}
      /*
        Grown, it is wider than the column it is centred in and runs out
        evenly either side, into a flower frame's margin; the frame is the
        card's top layer, so where the two meet its flowers lie over the tips
        of the rollers.
      */
      className={`outline-none ${grown === null ? "relative max-w-full" : "relative shrink-0"}`}
      style={{
        width: grown === null ? width : `${grown}px`,
        aspectRatio: String(1 / SCROLL_H),
        containerType: "inline-size",
        /* In px: the scroll's own units are for what is inside it, not for itself. */
        perspective: "640px",
      }}
    >
      {/* The window over the top half, and the sheet standing still behind it. */}
      <div
        className="absolute inset-x-0 overflow-hidden"
        style={{
          top: u(SCROLL_ROLLER_H / 2),
          height: u(windowHeight),
          ...moved(SCROLL_TRAVEL),
          ...fadeIn,
        }}
      >
        <div className="absolute inset-0 overflow-hidden" style={moved(-SCROLL_TRAVEL)}>
          {sheet("top")}
        </div>
      </div>

      {/* And the one over the bottom half. */}
      <div
        className="absolute inset-x-0 overflow-hidden"
        style={{
          top: u(SCROLL_H / 2),
          height: u(windowHeight),
          ...moved(-SCROLL_TRAVEL),
          ...fadeIn,
        }}
      >
        <div className="absolute inset-0 overflow-hidden" style={moved(SCROLL_TRAVEL)}>
          {sheet("bottom")}
        </div>
      </div>

      {roller("top")}
      {roller("bottom")}

      {/*
        The hint, under the rollers where they lie together. In the card's own
        text colour, because there is no paper under it yet. It stays in the
        tree to fade out as the scroll opens, and the button's name is what a
        screen reader is given instead of it.
      */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 text-center text-[max(12px,3.6cqw)] tracking-[0.08em]"
        style={{
          top: u(SCROLL_H / 2 + SCROLL_ROLLER_H + 0.03),
          opacity: inviting ? 1 : 0,
          transition: `opacity ${STILL_FADE_MS}ms ease-out`,
        }}
      >
        <span className={inviting ? "lifafa-scroll-hint inline-block" : "inline-block"}>
          {hint}
        </span>
      </p>

      {/*
        The button: the whole of the space the open scroll will take, so it is
        far more than 44px either way and a thumb cannot miss it. Over the
        scroll rather than the scroll itself, so the group under it keeps its
        name, which is the date. Gone the moment it is used.
      */}
      {inviting ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={openLabel}
          onClick={open}
          onKeyDown={handleKey}
          className="absolute inset-0 z-10 cursor-pointer rounded-xl [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
        />
      ) : null}
    </div>
  );
}
