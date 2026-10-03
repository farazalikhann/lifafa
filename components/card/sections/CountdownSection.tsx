"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import Confetti from "@/components/card/Confetti";
import CountdownTiles, { type TileUnit } from "@/components/card/CountdownTiles";
import FrameStage from "@/components/card/FrameStage";
import FramedScratch from "@/components/card/FramedScratch";
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
import { textRoles, type Theme } from "@/lib/themes";
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
 * ALWAYS THE RECTANGLE. Four tiles in a row are wide and short, which is the
 * rectangle's shape and not the oval's: set in the oval they were squeezed
 * until their labels ran into each other. So the clock, and the line that
 * replaces it on the day and after, sit in the rectangle on every card,
 * whichever frame the host chose for their scratch panel.
 *
 * Renders nothing at all when the host has not set a date — CardCanvas filters
 * the section out of the running order in that case, so its divider goes with
 * it. From the moment it starts it says "The celebration has begun", with a
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
  scratch,
  dateScratch,
  sessionKey,
  language,
  isWedding,
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
  /** A wedding card's clock counts down to the vows, and says so under itself. */
  isWedding: boolean;
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
    Confetti, once a visit, the first time "The celebration has begun" is
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

  if (!hasCountdown(draft)) {
    return null;
  }

  const copy = cardCopy(language);
  const units = unitsOf(countdown, copy.countdown);
  const closing =
    countdown === null || countdown.kind === "counting"
      ? null
      : countdown.kind === "begun"
        ? copy.countdown.begun
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
            color: hasBegun ? textRoles(theme).heading : theme.textPrimary,
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
    </section>
  );
}
