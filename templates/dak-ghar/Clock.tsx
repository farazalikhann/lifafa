"use client";

import { useEffect, useState, type CSSProperties, type ReactElement } from "react";
import { measure, spokenCountdown, unitsOf, type Countdown } from "@/components/card/sections/CountdownSection";
import { eventInstant } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { ART } from "@/templates/dak-ghar/art";
import { PageHeading } from "@/templates/dak-ghar/Paper";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, caps, leading } from "@/templates/dak-ghar/shared";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** The hands' angles, for the hour the celebration starts: "19:30" is half past seven. 10:10 without a time. */
function handAngles(eventTime: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})/.exec(eventTime.trim());
  const hour = match === null ? 10 : Number(match[1]) % 12;
  const minute = match === null ? 10 : Number(match[2]);

  return { hour: hour * 30 + minute * 0.5, minute: minute * 6 };
}

/**
 * The countdown, on a brass clock: its hands drawn in code and set to the
 * hour the celebration starts (they sweep round to it once, as the clock
 * comes on screen), and under it the days, hours and minutes still to go.
 *
 * THE COUNTING IS THE CARD'S OWN (`measure` and `unitsOf` from the shared
 * countdown): the same instant, the same "it has begun". Measured every
 * fifteen seconds, which is plenty with no seconds shown, and not at all
 * while the tab is hidden.
 */
export default function DakGharClock({ draft, language }: { draft: EventDraft; language: CardLanguage }): ReactElement | null {
  const { ref, shown } = useReveal<HTMLElement>();
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
        timer = setInterval(tick, 15000);
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

  const angles = handAngles(draft.eventTime);
  const units = unitsOf(countdown, copy.countdown).filter((unit) => unit.id !== "seconds");
  const closing =
    countdown === null || countdown.kind === "counting"
      ? null
      : countdown.kind === "begun"
        ? copy.countdown.begun
        : copy.countdown.passed;

  return (
    <section ref={ref} className={styles.page}>
      <div className={`${styles.reveal} ${shown ? styles.shown : ""} flex w-full max-w-[26rem] flex-col items-center gap-7`}>
        <PageHeading>{copy.countdown.heading}</PageHeading>

        <div className={`${styles.clock} ${shown ? styles.clockShown : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.clock} alt="" width={460} height={495} loading="lazy" decoding="async" draggable={false} className="block h-auto w-full" />
          <span aria-hidden="true" className={`${styles.hand} ${styles.hourHand}`} style={{ "--dg-angle": `${angles.hour}deg` } as CSSProperties}>
            <span />
          </span>
          <span aria-hidden="true" className={`${styles.hand} ${styles.minuteHand}`} style={{ "--dg-angle": `${angles.minute}deg` } as CSSProperties}>
            <span />
          </span>
          <span aria-hidden="true" className={styles.pin} />
        </div>

        {closing !== null ? (
          <p className="text-[1.75rem] text-balance" style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.25) }}>
            {closing}
          </p>
        ) : (
          <>
            <p className="sr-only" role="timer" aria-live="off">
              {spokenCountdown(units)}
            </p>
            <div aria-hidden="true" className={styles.tiles}>
              {units.map((unit) => (
                <div key={unit.id} className={styles.tile}>
                  <span className="text-[2.5rem] leading-none tabular-nums" style={DAK_FONTS.serif}>
                    {unit.digits}
                  </span>
                  <span className="text-sm" style={{ ...DAK_FONTS.sans, ...caps(language), fontWeight: 700, color: "var(--dg-ink-muted)" }}>
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
