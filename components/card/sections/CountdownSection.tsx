"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import Confetti from "@/components/card/Confetti";
import FlipClock, { type FlipUnit } from "@/components/card/FlipClock";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { hasCountdown } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  eventInstant,
  istDayKey,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import { mixHex } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Where "the confetti has been thrown" is remembered, per invitation, for the visit. */
function confettiKey(sessionKey: string): string {
  return `lifafa:countdown-confetti:${sessionKey}`;
}

/**
 * What the section has to say, once it knows what time it is.
 *
 * A discriminated union rather than a number of milliseconds, because "today"
 * and "has taken place" are not distances — they are answers to a calendar
 * question — and a caller handed a bare number would have to re-derive them.
 */
type Countdown =
  | {
      readonly kind: "counting";
      readonly days: number;
      readonly hours: number;
      readonly minutes: number;
      readonly seconds: number;
    }
  | { readonly kind: "today" }
  | { readonly kind: "passed" };

/**
 * Where the countdown stands, measured against an explicit `now`.
 *
 * `now` is a parameter rather than a `new Date()` inside, which is the whole
 * hydration story in one line: nothing can call this during render without
 * having gone and found a clock first, and the only thing that does is the
 * effect below.
 *
 * The day itself comes first, and is decided by the Indian calendar day: from
 * the morning of the celebration to midnight the card says "Today is the day"
 * rather than counting the last hours, and a reception that began an hour ago
 * is still today. After that day, it says thank you.
 */
function measure(target: Date, now: Date): Countdown {
  if (istDayKey(now) === istDayKey(target)) {
    return { kind: "today" };
  }

  const remaining = target.getTime() - now.getTime();

  if (remaining <= 0) {
    return { kind: "passed" };
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
 * The four units as the flip clock draws them. Days are at least two cards and
 * grow to three past 99, which every celebration anyone sends a card for fits.
 * Before the first tick every card shows a dash, so the server and the first
 * paint agree and nothing claims a number it has not measured.
 */
function unitsOf(
  countdown: Countdown | null,
  copy: CardCopy["countdown"],
): readonly FlipUnit[] {
  const pad = (value: number): string => String(value).padStart(2, "0");
  const counting = countdown !== null && countdown.kind === "counting" ? countdown : null;

  return [
    { id: "days", label: copy.days, digits: counting === null ? "––" : pad(counting.days) },
    { id: "hours", label: copy.hours, digits: counting === null ? "––" : pad(counting.hours) },
    { id: "minutes", label: copy.minutes, digits: counting === null ? "––" : pad(counting.minutes) },
    { id: "seconds", label: copy.seconds, digits: counting === null ? "––" : pad(counting.seconds) },
  ];
}

/** What a screen reader is told in place of the drawn cards. */
function spokenCountdown(units: readonly FlipUnit[]): string {
  return units
    .filter((unit) => !unit.digits.includes("–"))
    .map((unit) => `${Number(unit.digits)} ${unit.label}`)
    .join(", ");
}

/**
 * A live count down to the celebration, as a split-flap clock.
 *
 * Renders nothing at all when the host has not set a date — CardCanvas filters
 * the section out of the running order in that case, so its divider goes with
 * it. On the day it says "Today is the day", with a short burst of confetti
 * once a visit, and from the next day "Thank you for celebrating with us".
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
  scratch,
  dateScratch,
  sessionKey,
  language,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /** Set when the host chose to hide the countdown. Covers the clock only. */
  scratch: ScratchConfig | null;
  /** Set when the host chose to hide the date, which the clock would give away. */
  dateScratch: ScratchConfig | null;
  /** The invitation's code, for "confetti once a visit"; null in the editor's previews. */
  sessionKey: string | null;
  /** The language the heading, the units and the closing line are written in. */
  language: CardLanguage;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /** null until the first tick. Never seeded from the clock. */
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [confetti, setConfetti] = useState(false);

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
    Confetti, once a visit, the first time "Today is the day" is actually on
    screen and legible: in view, not behind a panel, and not for a guest who
    has asked for less motion.
  */
  const isToday = countdown !== null && countdown.kind === "today";

  useEffect(() => {
    if (!isToday || !isInView || isCovered || reducedMotion) {
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
  }, [isToday, isInView, isCovered, reducedMotion, sessionKey]);

  if (!hasCountdown(draft)) {
    return null;
  }

  const copy = cardCopy(language);
  const units = unitsOf(countdown, copy.countdown);
  const closing =
    countdown === null || countdown.kind === "counting"
      ? null
      : countdown.kind === "today"
        ? copy.countdown.today
        : copy.countdown.passed;

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  const counter =
    closing !== null ? (
      <div className={`relative ${reveal}`} style={lineDelay(1)}>
        <p
          className={`max-w-[18ch] text-[1.825rem] font-medium tracking-[0.02em] text-balance sm:text-[calc(2.125*var(--card-rem,1rem))] ${
            copy.script === "devanagari" ? "leading-[1.5]" : "leading-[1.2]"
          }`}
          style={{
            color: isToday ? theme.accent : theme.textPrimary,
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
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
        <FlipClock units={units} theme={theme} label={spokenCountdown(units)} />
      </div>
    );

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: `calc(1.25 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
      }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <p
          className="text-[calc(0.84*var(--card-rem,1rem))] tracking-[0.3em] uppercase"
          style={{ color: theme.textMuted }}
        >
          {copy.countdown.heading}
        </p>
      </div>

      {/*
        The clock, or the line that replaces it on the day and after. One slot
        either way, which is what lets a panel cover "the countdown" without
        having to know which of the two is in there today.
      */}
      {panel === null ? (
        counter
      ) : (
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

      <div className={reveal} style={lineDelay(2)}>
        <span
          aria-hidden="true"
          className="block h-px w-12"
          style={{ backgroundColor: theme.accent, opacity: 0.45 }}
        />
      </div>
    </section>
  );
}
