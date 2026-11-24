"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { measure, type Countdown } from "@/components/card/sections/CountdownSection";
import { eventInstant } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { ART } from "@/templates/shahi-darwaza/art";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import type { DarwazaFonts } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The countdown, over the courtyard at night: days, hours, minutes and
 * seconds in the calm sky at the head of the picture.
 *
 * Counted by the card's own `measure`, once a second, and only while it is
 * on screen and the tab is in front: the clock stops when the guest scrolls
 * past or leaves, and catches up at once when they come back. Before its
 * first count, which is only ever in the browser, every figure is a dash, so
 * the server's page and the first paint agree.
 *
 * Left out when the card has no date to count to.
 */
export default function ShahiDarwazaCountdown({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: DarwazaFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const [now, setNow] = useState<Countdown | null>(null);
  const target = eventInstant(draft.eventDate, draft.eventTime);
  const targetMs = target?.getTime() ?? null;
  const visible = useRef<boolean>(false);

  useEffect(() => {
    const element = ref.current;

    if (targetMs === null || element === null) {
      return;
    }

    let timer: number | null = null;
    const tick = (): void => setNow(measure(new Date(targetMs), new Date()));
    const stop = (): void => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
    const run = (): void => {
      stop();

      if (visible.current && document.visibilityState === "visible") {
        tick();
        timer = window.setInterval(tick, 1000);
      }
    };

    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            visible.current = entries.some((entry) => entry.isIntersecting);
            run();
          })
        : null;

    if (observer === null) {
      visible.current = true;
      run();
    } else {
      observer.observe(element);
    }

    document.addEventListener("visibilitychange", run);

    return () => {
      stop();
      observer?.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, [ref, targetMs]);

  if (targetMs === null) {
    return null;
  }

  const copy = cardCopy(language).countdown;
  const units: readonly { label: string; value: string }[] = [
    { label: copy.days, value: now?.kind === "counting" ? String(now.days).padStart(2, "0") : "--" },
    { label: copy.hours, value: now?.kind === "counting" ? String(now.hours).padStart(2, "0") : "--" },
    { label: copy.minutes, value: now?.kind === "counting" ? String(now.minutes).padStart(2, "0") : "--" },
    { label: copy.seconds, value: now?.kind === "counting" ? String(now.seconds).padStart(2, "0") : "--" },
  ];

  return (
    <section ref={ref} className={`${styles.night} ${entered ? styles.revealIn : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ART.nightCourtyard}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={styles.nightPicture}
      />
      <span aria-hidden="true" className={styles.nightScrim} />

      <div className={styles.nightWords}>
        <h2 className={`${styles.reveal} ${styles.nightHeading}`} style={fonts.names}>
          {copy.heading}
        </h2>

        {now !== null && now.kind !== "counting" ? (
          <p className={`${styles.reveal} text-[1.1rem]`} style={{ ...fonts.heading, transitionDelay: "120ms" }}>
            {now.kind === "begun" ? copy.begun : copy.passed}
          </p>
        ) : (
          <div
            className={`${styles.reveal} ${styles.countdownRow}`}
            style={{ transitionDelay: "120ms" }}
            role="timer"
            aria-live="off"
          >
            {units.map((unit) => (
              <div key={unit.label} className={styles.countdownUnit}>
                <span className={styles.countdownValue} style={fonts.heading}>
                  {unit.value}
                </span>
                <span className={styles.countdownLabel} style={fonts.body}>
                  {unit.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
