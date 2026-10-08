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
import Confetti from "@/components/card/Confetti";
import CountdownTiles, { type TileUnit } from "@/components/card/CountdownTiles";
import FrameStage from "@/components/card/FrameStage";
import FramedScratch from "@/components/card/FramedScratch";
import FunctionIcon from "@/components/card/FunctionIcon";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useStillHidden } from "@/components/card/ScratchReveal";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import type { CalendarInvite } from "@/lib/calendar";
import {
  hasCountdown,
  timelineEntries,
  timelinePhases,
  type TimelineEntry,
} from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  calendarPageText,
  eventInstant,
  istDayKey,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { cardPx, cardRem } from "@/lib/cardScale";
import { functionIcon } from "@/lib/ceremonies";
import { mixHex } from "@/lib/contrast";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** How often the chips' "in N days" is brought up to date while the card is open. */
const CHIPS_REFRESH_MS = 60 * 1000;

/** A tap on the frame lets petals go at most this often. */
const BURST_THROTTLE_MS = 1000;
/** How long a burst is in the DOM: its animation (globals.css) and a little over. */
const BURST_MS = 1700;
const BURST_PIECES = 10;
/** The rose petals the petal layer throws (lib/petals.ts), reused as they are. */
const BURST_PETALS: readonly string[] = ["/decor/petal-a.webp", "/decor/petal-b.webp"];
const BURST_GOLD: readonly string[] = ["#E3B65A", "#F3D48A", "#C9973B"];

interface BurstPiece {
  readonly id: number;
  /** A petal's picture, or null for a gold sparkle. */
  readonly petal: string | null;
  readonly x: number;
  readonly up: number;
  readonly down: number;
  readonly spin: number;
  readonly size: number;
  readonly delay: number;
  readonly color: string;
}

/**
 * One tap's petals and sparkles. Built in the tap's handler, never during
 * render, which is why a random spread is fine here.
 */
function burstPieces(): BurstPiece[] {
  return Array.from({ length: BURST_PIECES }, (_, id) => {
    /* Three petals to every two sparkles. */
    const isPetal = id % 5 < 3;

    return {
      id,
      petal: isPetal ? BURST_PETALS[id % BURST_PETALS.length] : null,
      x: (Math.random() - 0.5) * 170,
      up: -(18 + Math.random() * 44),
      down: 70 + Math.random() * 70,
      spin: (Math.random() - 0.5) * 420,
      size: isPetal ? 15 + Math.random() * 8 : 9 + Math.random() * 6,
      delay: Math.random() * 110,
      color: BURST_GOLD[id % BURST_GOLD.length],
    };
  });
}

/** Whole days from one "YYYY-MM-DD" to another, worked in UTC so no zone moves a day. */
function daysBetween(fromKey: string, toKey: string): number {
  const at = (key: string): number => {
    const [year, month, day] = key.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };

  return Math.round((at(toKey) - at(fromKey)) / DAY);
}

/** Where "the confetti has been thrown" is remembered, per invitation, for the visit. */
function confettiKey(sessionKey: string): string {
  return `lifafa:countdown-confetti:${sessionKey}`;
}

/**
 * What the section has to say, once it knows what time it is.
 *
 * A discriminated union rather than a number of milliseconds, because "has
 * begun" and "has taken place" are not distances — the second is an answer to
 * a calendar question — and a caller handed a bare number would have to
 * re-derive them.
 */
type Countdown =
  | {
      readonly kind: "counting";
      readonly days: number;
      readonly hours: number;
      readonly minutes: number;
      readonly seconds: number;
    }
  | { readonly kind: "begun" }
  | { readonly kind: "passed" };

/**
 * Where the countdown stands, measured against an explicit `now`.
 *
 * `now` is a parameter rather than a `new Date()` inside, which is the whole
 * hydration story in one line: nothing can call this during render without
 * having gone and found a clock first, and the only thing that does is the
 * effect below.
 *
 * It counts right up to the moment the celebration starts, the last hours of
 * the day included. From then to the end of that Indian calendar day the card
 * says "The celebration has begun" — a reception that began an hour ago is
 * still going — and from the next day it says thank you.
 */
function measure(target: Date, now: Date): Countdown {
  const remaining = target.getTime() - now.getTime();

  if (remaining <= 0) {
    return istDayKey(now) === istDayKey(target)
      ? { kind: "begun" }
      : { kind: "passed" };
  }

  return {
    kind: "counting",
    days: Math.floor(remaining / DAY),
    hours: Math.floor(remaining / HOUR) % 24,
    minutes: Math.floor(remaining / MINUTE) % 60,
    seconds: Math.floor(remaining / SECOND) % 60,
  };
}

/**
 * The four units as the tiles draw them. Days are at least two digits and grow
 * to three past 99, which every celebration anyone sends a card for fits.
 * Before the first tick every tile shows dashes, so the server and the first
 * paint agree and nothing claims a number it has not measured.
 */
function unitsOf(
  countdown: Countdown | null,
  copy: CardCopy["countdown"],
): readonly TileUnit[] {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const counting = countdown !== null && countdown.kind === "counting" ? countdown : null;

  return [
    { id: "days", label: copy.days, shortLabel: copy.short.days, digits: counting === null ? "––" : pad(counting.days) },
    { id: "hours", label: copy.hours, shortLabel: copy.short.hours, digits: counting === null ? "––" : pad(counting.hours) },
    { id: "minutes", label: copy.minutes, shortLabel: copy.short.minutes, digits: counting === null ? "––" : pad(counting.minutes) },
    { id: "seconds", label: copy.seconds, shortLabel: copy.short.seconds, digits: counting === null ? "––" : pad(counting.seconds) },
  ];
}

/** What a screen reader is told in place of the drawn tiles. */
function spokenCountdown(units: readonly TileUnit[]): string {
  return units
    .filter((unit) => !unit.digits.includes("–"))
    .map((unit) => `${Number(unit.digits)} ${unit.label}`)
    .join(", ");
}

/**
 * A live count down to the celebration, as four tiles in a frame of roses.
 *
 * TOP TO BOTTOM: "Counting the Days" in the card's script face; the day it is
 * counting to, as "Saturday · 12 December 2026"; the frame and its four
 * tiles, whose digits turn over like a flip clock's; the line saying what it
 * counts down to; a chip for each function still to come, on a card with
 * more than one, with its painting and how many days off it is; and the
 * calendar button.
 *
 * A TAP ON THE FRAME lets go a few rose petals and gold sparkles from under
 * the finger, once a second at most, and never while a scratch panel is over
 * the clock, where a touch is a scratch.
 *
 * ALWAYS THE RECTANGLE. Four tiles in a row are wide and short, which is the
 * rectangle's shape and not the oval's: set in the oval they were squeezed
 * until their labels ran into each other. So the clock, and the line that
 * replaces it on the day and after, sit in the rectangle on every card,
 * whichever frame the host chose for their scratch panel.
 *
 * Renders nothing at all when the host has not set a date — CardCanvas filters
 * the section out of the running order in that case, so its divider goes with
 * it. From the moment it starts it says "Today is the day", with a
 * short burst of confetti once a visit, and from the next day "Thank you for
 * celebrating with us".
 *
 * THE CLOCK IS NEVER READ DURING RENDER. The server has no idea what time it
 * is where the guest is, and a browser that disagreed with it by a single
 * second would throw a hydration error. So the first paint shows dashes on
 * both sides of the wire, and the counting starts in an effect, after mount.
 * One interval drives the whole clock, and it stops while the tab is hidden
 * or the clock is covered.
 *
 * TWO PANELS CAN COVER IT. The host's own "countdown" panel, as before, and —
 * new — the date's: a countdown that says "80 days" beside a date the guest has
 * been asked to scratch for is the date given away. So with the date hidden,
 * the clock is too, under a patch that is one more way to reveal the date:
 * scratching it opens the date everywhere on the card, and scratching the
 * date anywhere opens this (ScratchReveal.tsx).
 */
export default function CountdownSection({
  draft,
  theme,
  minHeight,
  pad,
  padTop,
  scratch,
  dateScratch,
  sessionKey,
  language,
  isWedding,
  invite,
  occasionId,
  traditionId,
  calendarButton,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /** The inset above, deeper than `pad`: the heading clears the dissolve under the top ornaments. */
  padTop: number;
  /** Set when the host chose to hide the countdown. Covers the clock only. */
  scratch: ScratchConfig | null;
  /** Set when the host chose to hide the date, which the clock would give away. */
  dateScratch: ScratchConfig | null;
  /** The invitation's code, for "confetti once a visit"; null in the editor's previews. */
  sessionKey: string | null;
  /** The language the heading, the units and the closing line are written in. */
  language: CardLanguage;
  /** A wedding card's clock counts down to the vows, and says so under itself. */
  isWedding: boolean;
  /** The invitation the calendar entry points back at. */
  invite: CalendarInvite;
  /** For the calendar entry's title, which names the couple as the card does. */
  occasionId: OccasionId;
  /** The card's tradition, for the painting on each function's chip (lib/ceremonies.ts). */
  traditionId: TraditionId;
  /** Whether the calendar button is drawn here: not when "Save the date" follows with its own. */
  calendarButton: boolean;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /** null until the first tick. Never seeded from the clock. */
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [confetti, setConfetti] = useState(false);
  /** For the chips. null until mounted, so the server and the first paint agree: none. */
  const [now, setNow] = useState<Date | null>(null);
  const [burst, setBurst] = useState<{
    key: number;
    x: number;
    y: number;
    pieces: BurstPiece[];
  } | null>(null);
  const lastBurst = useRef(0);
  const burstTimer = useRef<number | null>(null);
  /* The date is behind a panel somewhere on the card and not yet scratched. */
  const dateHidden = useStillHidden("date");

  /* Whichever panel covers the clock: the countdown's own, or the date's. */
  const panel = scratch ?? dateScratch;

  /*
    Whether the clock is still behind a panel. Seeded from the props alone so
    the server and the first client paint agree; ScratchPanel corrects it
    through `onCoveredChange` on its first commit.
  */
  const [isCovered, setIsCovered] = useState<boolean>(
    panel !== null && !panel.preCleared,
  );

  /* Stable, so it is not a dependency that re-fires the panel's effect. */
  const handleCoveredChange = useCallback((covered: boolean): void => {
    setIsCovered(covered);
  }, []);

  /*
    A number rather than the Date, because `eventInstant` mints a fresh object
    on every render and an effect keyed on the object would tear down and
    rebuild its interval sixty times a minute.
  */
  const target = eventInstant(draft.eventDate, draft.eventTime);
  const targetTime = target === null ? null : target.getTime();

  /*
    The one interval, gated on the cover: a per second setState behind an
    opaque canvas is spent battery for nobody, and starting it on reveal means
    the first legible frame is already right.
  */
  useEffect(() => {
    if (targetTime === null || isCovered) {
      return;
    }

    const instant = new Date(targetTime);
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = (): void => {
      setCountdown(measure(instant, new Date()));
    };

    const start = (): void => {
      if (timer !== null) {
        return;
      }

      tick();
      timer = setInterval(tick, SECOND);
    };

    const stop = (): void => {
      if (timer === null) {
        return;
      }

      clearInterval(timer);
      timer = null;
    };

    const handleVisibility = (): void => {
      if (document.visibilityState === "hidden") {
        stop();
      } else {
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [targetTime, isCovered]);

  /*
    Confetti, once a visit, the first time "Today is the day" is
    actually on screen and legible: in view, not behind a panel, and not for a
    guest who has asked for less motion.
  */
  const hasBegun = countdown !== null && countdown.kind === "begun";

  useEffect(() => {
    if (!hasBegun || !isInView || isCovered || reducedMotion) {
      return;
    }

    try {
      if (sessionKey !== null) {
        const key = confettiKey(sessionKey);

        if (window.sessionStorage.getItem(key) === "1") {
          return;
        }

        window.sessionStorage.setItem(key, "1");
      }
    } catch {
      /* Storage blocked: the burst still happens, once for this page. */
    }

    setConfetti(true);
  }, [hasBegun, isInView, isCovered, reducedMotion, sessionKey]);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), CHIPS_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (burstTimer.current !== null) {
        window.clearTimeout(burstTimer.current);
      }
    },
    [],
  );

  if (!hasCountdown(draft)) {
    return null;
  }

  /*
    Petals from under the finger. One read of the frame's box per tap, in the
    handler; the pieces then move on the compositor and are gone from the DOM
    when they have fallen.
  */
  const handleFrameTap = (event: PointerEvent<HTMLDivElement>): void => {
    const at = Date.now();

    if (reducedMotion || isCovered || at - lastBurst.current < BURST_THROTTLE_MS) {
      return;
    }

    lastBurst.current = at;
    const box = event.currentTarget.getBoundingClientRect();

    setBurst({
      key: at,
      x: event.clientX - box.left,
      y: event.clientY - box.top,
      pieces: burstPieces(),
    });

    if (burstTimer.current !== null) {
      window.clearTimeout(burstTimer.current);
    }

    burstTimer.current = window.setTimeout(() => setBurst(null), BURST_MS);
  };

  const copy = cardCopy(language);
  const units = unitsOf(countdown, copy.countdown);
  const closing =
    countdown === null || countdown.kind === "counting"
      ? null
      : countdown.kind === "begun"
        ? copy.countdown.begun
        : copy.countdown.passed;

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;
  const isPassed = countdown !== null && countdown.kind === "passed";

  /* The day it counts to, held back while the date is still behind its panel. */
  const page = dateHidden
    ? null
    : calendarPageText(draft.eventDate, draft.eventTime, language);

  /*
    The functions still to come, in date order, on a card with more than one.
    The main event's own chip waits with whatever hides its day: the date's
    panel, or the clock's, whose answer "in 64 days" would be.
  */
  const entries = timelineEntries(draft, language);
  const phases = now === null ? null : timelinePhases(entries, now);
  const todayKey = now === null ? null : istDayKey(now);
  const chips: readonly { entry: TimelineEntry; days: number }[] =
    phases === null || todayKey === null || entries.length < 2 || isPassed
      ? []
      : entries
          .filter((entry) => {
            const phase = phases.get(entry.id);

            return (
              (phase === "next" || phase === "later") &&
              !(entry.id === "primary" && (dateHidden || isCovered))
            );
          })
          .map((entry) => ({
            entry,
            days: Math.max(0, daysBetween(todayKey, entry.date.trim())),
          }));

  const counter =
    closing !== null ? (
      <div className={`relative ${reveal}`} style={lineDelay(1)}>
        <p
          className={`max-w-[18ch] text-[1.825rem] font-medium tracking-[0.02em] text-balance sm:text-[calc(2.125*var(--card-rem,1rem))] ${
            copy.script === "devanagari" ? "leading-[1.5]" : "leading-[1.2]"
          }`}
          style={{
            color: hasBegun ? textRoles(theme).heading : theme.textPrimary,
            fontFamily: "var(--card-names)",
            fontWeight: "var(--card-names-weight)" as unknown as number,
          }}
        >
          {closing}
        </p>
        {confetti ? (
          <Confetti
            colors={[
              theme.accent,
              mixHex(theme.accent, "#FFFFFF", 0.45),
              theme.textPrimary,
              mixHex(theme.accent, theme.textMuted, 0.5),
            ]}
          />
        ) : null}
      </div>
    ) : (
      <div
        className={`w-full ${reveal}`}
        style={lineDelay(1)}
        /*
          A timer that never announces itself: `role="timer"` names it for a
          screen reader that navigates onto it, and "off" stops a live region
          re-reading four numbers every second.
        */
        role="timer"
        aria-live="off"
      >
        <CountdownTiles
          units={units}
          theme={theme}
          label={spokenCountdown(units)}
          hindi={language === "hi"}
        />
      </div>
    );

  return (
    <section
      ref={ref}
      /* As tall as its content on a screen wider than a phone: .lifafa-cd-section in globals.css. */
      className="lifafa-cd-section flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(padTop),
        paddingBottom: cardPx(pad),
        gap: `calc(1 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
      }}
    >
      {/* Gone once the day is over: there is nothing left to count. */}
      {isPassed ? null : (
        <div className={reveal} style={lineDelay(0)}>
          <h3
            className={`text-[calc(2*var(--card-rem,1rem)*var(--card-names-scale,1))] text-balance ${
              copy.script === "devanagari" ? "leading-[1.45]" : "leading-[1.15]"
            }`}
            style={{
              color: textRoles(theme).heading,
              fontFamily: "var(--card-names)",
              fontWeight: "var(--card-names-weight)" as unknown as number,
            }}
          >
            {copy.countdown.heading}
          </h3>
        </div>
      )}

      {page === null || isPassed ? null : (
        <div className={reveal} style={lineDelay(0)}>
          <p
            className="lifafa-reveal-in text-[calc(0.95*var(--card-rem,1rem))] tracking-[0.04em]"
            style={{ color: theme.textPrimary }}
          >
            {`${page.weekday} · ${page.day} ${page.month} ${page.year}`}
          </p>
        </div>
      )}

      <div
        className="relative flex max-w-full justify-center"
        onPointerDown={handleFrameTap}
      >

      {/*
        The clock, or the line that replaces it on the day and after. One slot
        either way, which is what lets a panel cover "the countdown" without
        having to know which of the two is in there today.
      */}
      {panel !== null && panel.frame !== undefined ? (
        /* The countdown's own panel: foil over the frame's opening. */
        <FramedScratch
          {...panel}
          frame="rect"
          onCoveredChange={handleCoveredChange}
        >
          {counter}
        </FramedScratch>
      ) : (
        <FrameStage frame="rect">
          {panel === null ? (
            counter
          ) : (
            /* The date's patch, which the clock would otherwise give away: the plain one, inside the frame. */
            <div className="w-full">
              <ScratchPanel
                {...panel}
                label={panel === dateScratch ? copy.scratch.hint : panel.label}
                fit={closing === null ? "box" : "ink"}
                fill={closing === null}
                onCoveredChange={handleCoveredChange}
              >
                {counter}
              </ScratchPanel>
            </div>
          )}
        </FrameStage>
      )}

        {burst === null ? null : (
          <span
            key={burst.key}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10"
          >
            {burst.pieces.map((piece) => (
              <span
                key={piece.id}
                className="lifafa-cd-piece"
                style={
                  {
                    left: burst.x,
                    top: burst.y,
                    width: piece.size,
                    height: piece.size,
                    color: piece.color,
                    animationDelay: `${piece.delay.toFixed(0)}ms`,
                    "--bx": `${piece.x.toFixed(0)}px`,
                    "--bup": `${piece.up.toFixed(0)}px`,
                    "--bdown": `${piece.down.toFixed(0)}px`,
                    "--bspin": `${piece.spin.toFixed(0)}deg`,
                  } as CSSProperties
                }
              >
                {piece.petal === null ? (
                  <svg viewBox="0 0 10 10" width="100%" height="100%">
                    <path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill="currentColor" />
                  </svg>
                ) : (
                  <img src={piece.petal} alt="" draggable={false} className="h-full w-full object-contain" />
                )}
              </span>
            ))}
          </span>
        )}
      </div>

      {/* What it is counting down to. Gone on the day and after, when the frame says it instead. */}
      {closing === null ? (
        <div className={reveal} style={lineDelay(2)}>
          <p
            className={`text-[calc(1*var(--card-rem,1rem))] ${
              copy.script === "devanagari" ? "leading-[1.5]" : "italic"
            }`}
            style={{ color: theme.textMuted, fontFamily: "var(--card-heading)" }}
          >
            {isWedding ? copy.countdown.untilVows : copy.countdown.until}
          </p>
        </div>
      ) : null}

      {chips.length > 0 ? (
        /*
          A step wider than the column, so three chips sit on a line on a
          phone and five take two. True at the moment it is read and no
          later, like the timeline's "Up next": left off the printed copy.
        */
        <ul
          data-timeline-status=""
          className={`-mx-3 flex flex-wrap items-stretch justify-center gap-2 ${reveal}`}
          style={lineDelay(3)}
        >
          {chips.map(({ entry, days }) => (
            <li
              key={entry.id}
              className="flex max-w-full items-center gap-1.5 rounded-full border py-1 pr-3 pl-1.5 text-left"
              style={{
                borderColor: `${theme.accent}66`,
                backgroundColor: mixHex(theme.surface, theme.accent, 0.05),
              }}
            >
              <FunctionIcon icon={functionIcon(entry.label, traditionId)} size={cardRem(1.75)} />
              <span className="flex min-w-0 flex-col">
                <span
                  className="max-w-[9rem] truncate text-[calc(0.8*var(--card-rem,1rem))] leading-[1.25] font-semibold"
                  style={{ color: theme.textPrimary }}
                >
                  {entry.label}
                </span>
                <span
                  className="text-[calc(0.7*var(--card-rem,1rem))] leading-[1.3] whitespace-nowrap"
                  style={{ color: theme.textMuted }}
                >
                  {days === 0
                    ? copy.countdown.today
                    : days === 1
                      ? copy.countdown.tomorrow
                      : copy.countdown.inDays(days)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {calendarButton && closing === null ? (
        <div className={`mt-1 ${reveal}`} style={lineDelay(4)}>
          <AddToCalendar
            draft={draft}
            theme={theme}
            invite={invite}
            occasionId={occasionId}
            language={language}
          />
        </div>
      ) : null}
    </section>
  );
}
