"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useInView } from "@/hooks/useInView";
import { hasCountdown } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  eventInstant,
  istDayKey,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

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
 * The state of the card between the first paint and the first tick.
 *
 * Rendered as its own thing rather than as a zeroed countdown, so nothing on
 * screen ever claims a number it has not measured. The units keep their real
 * boxes, so the tick that replaces them changes the digits and not the layout.
 */
const PENDING = "––";

interface Unit {
  readonly label: string;
  /** null before the first tick — see PENDING. */
  readonly value: number | null;
  /**
   * Digit slots the number is held to, in `ch`.
   *
   * The reason the reveal does not move anything. A unit that sized itself to
   * its content would be one width holding the placeholder and another holding
   * the number that replaces it, and on a scratched countdown those two arrive
   * in consecutive frames — the row would visibly jump the moment the cover
   * came off. Hours, minutes and seconds are always two digits; days are given
   * three, which covers every event anyone would send an invitation for.
   */
  readonly slots: number;
}

/**
 * Where the countdown stands, measured against an explicit `now`.
 *
 * `now` is a parameter rather than a `new Date()` inside, which is the whole
 * hydration story in one line: nothing can call this during render without
 * having gone and found a clock first, and the only thing that does is the
 * effect below.
 *
 * The four states are checked in the order a guest meets them. The last two
 * are decided by the Indian calendar day rather than by the remaining
 * milliseconds, because they are calendar questions: a reception that began an
 * hour ago is still happening today, and the card should say so until the day
 * itself is over rather than announcing it in the past tense while the guests
 * are still on the dance floor.
 */
function measure(target: Date, now: Date): Countdown {
  const remaining = target.getTime() - now.getTime();

  if (remaining > 0) {
    return {
      kind: "counting",
      days: Math.floor(remaining / DAY),
      hours: Math.floor(remaining / HOUR) % 24,
      minutes: Math.floor(remaining / MINUTE) % 60,
      seconds: Math.floor(remaining / SECOND) % 60,
    };
  }

  return istDayKey(now) === istDayKey(target)
    ? { kind: "today" }
    : { kind: "passed" };
}

/**
 * The units on show. Days are dropped inside the last day, because a row that
 * reads "0 days" spends a quarter of the line saying nothing — and the three
 * that remain are the ones a guest is actually watching by then.
 */
function unitsOf(countdown: Countdown | null): readonly Unit[] {
  if (countdown === null) {
    return [
      { label: "Days", value: null, slots: 3 },
      { label: "Hours", value: null, slots: 2 },
      { label: "Minutes", value: null, slots: 2 },
      { label: "Seconds", value: null, slots: 2 },
    ];
  }

  if (countdown.kind !== "counting") {
    return [];
  }

  const inner: readonly Unit[] = [
    { label: "Hours", value: countdown.hours, slots: 2 },
    { label: "Minutes", value: countdown.minutes, slots: 2 },
    { label: "Seconds", value: countdown.seconds, slots: 2 },
  ];

  return countdown.days > 0
    ? [{ label: "Days", value: countdown.days, slots: 3 }, ...inner]
    : inner;
}

/** Two digits everywhere except days, which can legitimately run to three. */
function digits(unit: Unit): string {
  if (unit.value === null) {
    return PENDING;
  }

  return unit.label === "Days"
    ? String(unit.value)
    : String(unit.value).padStart(2, "0");
}

/**
 * The line shown once there is nothing left to count. Rendered in the card's
 * display font, the same weight the details section gives its date.
 */
function closingLine(countdown: Countdown): string | null {
  switch (countdown.kind) {
    case "today":
      return "Today.";
    case "passed":
      return "This celebration has taken place.";
    case "counting":
      return null;
  }
}

/**
 * A live count down to the celebration.
 *
 * Renders nothing at all when the host has not set a date — CardCanvas filters
 * the section out of the running order in that case, so its divider goes with
 * it, exactly as MessageSection behaves for an unwritten note. Both sides ask
 * `hasCountdown`, so neither can leave a divider stranded beside nothing.
 *
 * THE CLOCK IS NEVER READ DURING RENDER. The server has no idea what time it
 * is where the guest is, and a browser that disagreed with it by a single
 * second would throw a hydration error on a card whose whole job is to be
 * opened on a phone. So the first paint shows a placeholder that is identical
 * on both sides of the wire, and the counting starts in an effect, after mount,
 * where only the browser is watching.
 */
export default function CountdownSection({
  draft,
  theme,
  minHeight,
  pad,
  scratch,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /**
   * Set when the host chose to hide the countdown. Covers the units only — the
   * heading above them and the calendar links below stay in plain sight, so the
   * card still says what is behind the patch.
   */
  scratch: ScratchConfig | null;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  /** null until the first tick. Never seeded from the clock. */
  const [countdown, setCountdown] = useState<Countdown | null>(null);

  /*
    Whether the units are still behind a panel.

    Seeded from the props alone so the server and the first client paint agree:
    a panel that is present and not pre-cleared is covering something. Reduced
    motion can make that wrong, but only the browser knows, and ScratchPanel
    corrects it through `onCoveredChange` on its first commit.
  */
  const [isCovered, setIsCovered] = useState<boolean>(
    scratch !== null && !scratch.preCleared,
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
    The interval is gated on the cover, not merely on the date.

    A per second setState behind an opaque canvas is spent battery for nobody,
    and the number it leaves in the DOM is stale by exactly as long as the
    guest took to scratch — so the first thing they would see on reveal is the
    wrong time, corrected a second later. Starting on reveal instead means the
    `tick()` inside `start()` runs while the canvas is still fading, and the
    first legible frame is already right.
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

      /*
        Measured before the interval is armed, not a second after it. This is
        also what makes waking up correct: a phone that slept through the night
        with the tab open has a count frozen at whatever it was when the screen
        went off, and this line replaces it in the same frame the guest looks
        at it rather than after one more tick.
      */
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

    /*
      A hidden tab is a tab nobody is reading, and a once-a-second setState on
      one is pure battery. Browsers throttle background timers, but they
      throttle rather than stop them, and a throttled tick still re-renders.
    */
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

  if (!hasCountdown(draft)) {
    return null;
  }

  const units = unitsOf(countdown);
  const closing = countdown === null ? null : closingLine(countdown);

  /* Three units get the room the fourth gave up. */
  const numberSize =
    units.length === 3
      ? "text-[2.75rem] sm:text-[3.25rem]"
      : "text-[2rem] sm:text-[2.5rem]";

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  const counter =
    closing !== null ? (
      <div className={reveal} style={lineDelay(1)}>
        <p
          className="max-w-[18ch] text-[1.825rem] leading-[1.2] font-medium tracking-[0.02em] text-balance sm:text-[2.125rem]"
          style={{
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
        >
          {closing}
        </p>
      </div>
    ) : (
      <div
        className={`flex items-start justify-center gap-5 sm:gap-7 ${reveal}`}
        style={lineDelay(1)}
        /*
          A timer that never announces itself. `role="timer"` names the row
          for a screen reader that navigates onto it, and the explicit "off"
          is the point: a live region re-read every second — four numbers,
          sixty times a minute — would make the rest of the card unreachable.
          The date itself is stated in full by the details section, so
          nothing here is the only copy of anything.
        */
        role="timer"
        aria-live="off"
      >
        {units.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center gap-1">
            <span
              className={`block text-center leading-none font-medium tabular-nums ${numberSize}`}
              style={{
                /* Tabular figures make a `ch` exactly one digit wide. */
                minWidth: `${unit.slots}ch`,
                color: theme.accent,
                fontFamily: "var(--card-heading)",
                fontWeight: "var(--card-heading-weight)" as unknown as number,
              }}
            >
              {digits(unit)}
            </span>
            <span
              className="text-[0.6875rem] tracking-[0.2em] uppercase sm:text-xs"
              style={{ color: theme.textMuted }}
            >
              {unit.label}
            </span>
          </div>
        ))}
      </div>
    );

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: pad,
        paddingBottom: pad,
        gap: `calc(1.25rem * var(--card-gap-scale, 1))`,
      }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <p
          className="text-[0.84rem] tracking-[0.3em] uppercase"
          style={{ color: theme.textMuted }}
        >
          The countdown
        </p>
      </div>

      {/*
        The units, or the line that replaces them once there is nothing left to
        count. One slot either way, which is what lets the panel cover "the
        numbers" without having to know which of the two is in there today.
      */}
      {scratch === null ? (
        counter
      ) : (
        <ScratchPanel {...scratch} onCoveredChange={handleCoveredChange}>
          {counter}
        </ScratchPanel>
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
