"use client";

import { useEffect, useState, type ReactElement } from "react";
import ScratchPanel, {
  type ScratchConfig,
} from "@/components/card/ScratchPanel";
import { useScratchReveal } from "@/components/card/ScratchReveal";
import {
  measure,
  spokenCountdown,
  unitsOf,
  type Countdown,
} from "@/components/card/sections/CountdownSection";
import { eventInstant } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import { scriptLeading, type EmeraldFonts } from "@/templates/emerald-shahi/shared";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardAudience, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The countdown, struck as four gold coins: days, hours, minutes, seconds.
 *
 * THE COUNTING IS THE CARD'S OWN. `measure` and `unitsOf` are the functions
 * the shared countdown runs (components/card/sections/CountdownSection.tsx):
 * the same instant, the same India-time day for "it has begun", the same
 * words under each figure. It ticks once a second and not at all while the
 * tab is hidden. Only the drawing is this template's.
 *
 * SCRATCH TO REVEAL, where the host has it on for the countdown: each coin is
 * then one of the card's own scratch panels, a canvas the size of that coin
 * and no larger. They share the card's one reveal, so the coins come clear
 * together, stay clear for the visit, and can be shown without scratching by
 * the button under them. In the editor's preview they are drawn open.
 */
export default function EmeraldShahiCountdown({
  draft,
  language,
  scratch,
  audience,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  /** Whether the host hides the countdown behind scratch panels. */
  scratch: boolean;
  audience: CardAudience;
  fonts: EmeraldFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const copy = cardCopy(language);
  const shared = useScratchReveal(scratch ? "countdown" : undefined);
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
  const closing =
    countdown === null || countdown.kind === "counting"
      ? null
      : countdown.kind === "begun"
        ? copy.countdown.begun
        : copy.countdown.passed;

  const panel: ScratchConfig = {
    accent: "#D8B26A",
    surface: "#0B3A27",
    label: "",
    phrases: { ...copy.scratch, short: "" },
    preCleared: audience === "host-preview",
    target: "countdown",
  };
  const covered = scratch && audience === "guest" && shared.revealed === null;

  return (
    <section
      ref={ref}
      className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-[calc(1.4*var(--es))] px-5 py-[calc(3.5*var(--es))] text-center"
    >
      <Slide as="h2" entered={entered} from="left">
        <span className={styles.caps} style={fonts.heading}>
          {copy.countdown.heading}
        </span>
      </Slide>

      {closing !== null ? (
        <Slide
          as="p"
          entered={entered}
          from="right"
          order={1}
          className={`${styles.script} text-balance`}
          style={{
            ...fonts.names,
            fontSize: "calc(2 * var(--es))",
            lineHeight: scriptLeading(language),
          }}
        >
          {closing}
        </Slide>
      ) : (
        <>
          <p className="sr-only" role="timer" aria-live="off">
            {covered ? copy.scratch.countdown : spokenCountdown(units)}
          </p>
          <div
            aria-hidden="true"
            className="grid w-full max-w-[22rem] grid-cols-4 gap-[calc(0.6*var(--es))]"
          >
            {units.map((unit, index) => {
              const figure = (
                <span
                  className={`${styles.coinFigure} text-[calc(1.55*var(--es))] leading-none`}
                  style={fonts.heading}
                >
                  {unit.digits}
                </span>
              );

              return (
                <Slide
                  key={unit.id}
                  entered={entered}
                  from={index < 2 ? "left" : "right"}
                  order={1 + index}
                  className="flex min-w-0 flex-col items-center gap-[calc(0.5*var(--es))]"
                >
                  <div className={styles.coin}>
                    {scratch ? (
                      <ScratchPanel
                        {...panel}
                        showRevealButton={false}
                        fit="box"
                        fill
                      >
                        <span className="flex aspect-square w-full items-center justify-center">
                          {figure}
                        </span>
                      </ScratchPanel>
                    ) : (
                      figure
                    )}
                  </div>
                  <span
                    className={
                      language === "hi"
                        ? "text-[calc(0.8*var(--es))] leading-[1.4]"
                        : "max-w-full overflow-hidden text-[calc(0.6*var(--es))] tracking-[0.14em] whitespace-nowrap uppercase"
                    }
                    style={{ ...fonts.heading, color: "var(--es-gold)" }}
                  >
                    {language === "hi" ? unit.label : (unit.shortLabel ?? unit.label)}
                  </span>
                </Slide>
              );
            })}
          </div>

          {covered ? (
            <div className="flex flex-col items-center gap-1">
              <p
                className="text-[calc(0.85*var(--es))]"
                style={{ ...fonts.body, color: "var(--es-ivory)" }}
              >
                {copy.scratch.countdown}
              </p>
              <button
                type="button"
                onClick={shared.reveal}
                className="min-h-11 rounded-full px-3 text-xs underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  ...fonts.body,
                  color: "var(--es-gold)",
                  outlineColor: "var(--es-gold)",
                }}
              >
                {copy.scratch.reveal}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
