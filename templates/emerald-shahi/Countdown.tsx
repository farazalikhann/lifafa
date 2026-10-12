"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import ScratchPanel, {
  type ScratchConfig,
} from "@/components/card/ScratchPanel";
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
import {
  emeraldCopy,
  scriptLeading,
  type EmeraldFonts,
} from "@/templates/emerald-shahi/shared";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardAudience, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** Where a visit's scratched coins are kept, per invitation. */
function coinsKey(persistKey: string): string {
  return `lifafa:emerald-coins:${persistKey}`;
}

function readCoins(persistKey: string | null): readonly string[] {
  if (persistKey === null) {
    return [];
  }

  try {
    const stored: unknown = JSON.parse(
      window.sessionStorage.getItem(coinsKey(persistKey)) ?? "[]",
    );

    return Array.isArray(stored)
      ? stored.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    /* Storage blocked or the entry unreadable: nothing scratched yet. */
    return [];
  }
}

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
 * its own scratch panel, the card's ScratchPanel with a canvas the size of
 * that coin and no larger, and each is scratched on its own. Which coins a
 * guest has cleared is kept for the visit under the invitation's code (the
 * session's storage, where the card's other scratch panels keep theirs), so a
 * reload shows the same coins open and the same ones still covered. The
 * button under them opens all four for a guest who would rather not scratch,
 * or cannot. In the editor's preview they are drawn open.
 */
export default function EmeraldShahiCountdown({
  draft,
  language,
  scratch,
  audience,
  persistKey,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  /** Whether the host hides the countdown behind scratch panels. */
  scratch: boolean;
  audience: CardAudience;
  /** The invitation's code, to remember the coins under; null in a preview, which remembers nothing. */
  persistKey: string | null;
  fonts: EmeraldFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const copy = cardCopy(language);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  /* The coins cleared so far. Read after the first paint, as storage is the browser's alone. */
  const [cleared, setCleared] = useState<readonly string[]>([]);

  useEffect(() => {
    setCleared((current) => [...new Set([...readCoins(persistKey), ...current])]);
  }, [persistKey]);

  const clear = useCallback(
    (ids: readonly string[]): void => {
      setCleared((current) => {
        const next = [...new Set([...current, ...ids])];

        if (next.length === current.length) {
          return current;
        }

        if (persistKey !== null) {
          try {
            window.sessionStorage.setItem(
              coinsKey(persistKey),
              JSON.stringify(next),
            );
          } catch {
            /* Not kept; the coin is still open for as long as the page is. */
          }
        }

        return next;
      });
    },
    [persistKey],
  );

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

  const scratching = scratch && audience === "guest";
  const covered = units.filter((unit) => !cleared.includes(unit.id));
  const anyCovered = scratching && covered.length > 0;

  /* No shared target: each coin is cleared by its own scratching and nobody else's. */
  const panel: Omit<ScratchConfig, "preCleared"> = {
    accent: "#D8B26A",
    surface: "#0B3A27",
    label: "",
    phrases: { ...copy.scratch, short: "" },
  };

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
            {anyCovered
              ? emeraldCopy(language).scratchEach
              : spokenCountdown(units)}
          </p>
          <div
            aria-hidden="true"
            className="grid w-full max-w-[22rem] grid-cols-4 gap-[calc(0.6*var(--es))]"
          >
            {units.map((unit, index) => {
              const open = !scratching || cleared.includes(unit.id);
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
                      /*
                        Keyed by whether it is open, so a coin found open in
                        storage, or opened by the button, is drawn open from
                        the start and not scratched away by a panel that
                        thought it was covered.
                      */
                      <ScratchPanel
                        key={open ? "open" : "covered"}
                        {...panel}
                        preCleared={open}
                        onCoveredChange={(isCovered) => {
                          if (!isCovered) {
                            clear([unit.id]);
                          }
                        }}
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

          {anyCovered ? (
            <div className="flex flex-col items-center gap-1">
              <p
                className="text-[calc(0.85*var(--es))]"
                style={{ ...fonts.body, color: "var(--es-ivory)" }}
              >
                {emeraldCopy(language).scratchEach}
              </p>
              <button
                type="button"
                onClick={() => clear(units.map((unit) => unit.id))}
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
