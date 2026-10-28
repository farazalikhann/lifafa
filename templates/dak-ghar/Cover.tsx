"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { calendarPageText } from "@/lib/cardFormat";
import { cardLanguage } from "@/lib/cardLanguage";
import { playEffectSound } from "@/lib/effectSound";
import { venueCity } from "@/lib/shareMessage";
import { ART, DATE_SLIP } from "@/templates/dak-ghar/art";
import { LIFT_MS, PRINT_AT, STAMP_AT, TAPPABLE_AT } from "@/templates/dak-ghar/coverTiming";
import Postmark, { postmarkDate } from "@/templates/dak-ghar/Postmark";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, caps, leading } from "@/templates/dak-ghar/shared";
import { SOUND, SOUND_LEAD_MS } from "@/templates/dak-ghar/sounds";
import { useTabHidden } from "@/templates/dak-ghar/useTabHidden";
import type { TemplateCoverProps } from "@/templates/types";
import type { CardLanguage } from "@/types/card";

/* Ten petals in all, the last four left off under 400px (see `.petal` in the stylesheet). */
const PETALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The slip's three panels, read off the event in the card's language. */
function slipWords(
  draft: TemplateCoverProps["draft"],
  language: CardLanguage,
): { day: string; month: string; year: string; weekday: string; time: string | null; city: string } | null {
  if (draft === undefined) {
    return null;
  }

  const page = calendarPageText(draft.eventDate, draft.eventTime, language);

  if (page === null) {
    return null;
  }

  const city = venueCity(draft.venueAddress) ?? draft.venueName.trim();
  return { ...page, city };
}

/**
 * Dak Ghar's opening: a red pillar post box in a haveli courtyard at golden
 * hour, which a tap sets printing.
 *
 * THE DRAWING ONLY. The tap, the tick, the guard against a second tap, the
 * wait for the pictures (each decoded before the tap is allowed), the loader,
 * Skip, the sound and what a guest who asked for less motion gets are all
 * CoverShell's: this is handed a phase and draws it.
 *
 * CLOSED: the courtyard, bougainvillea at the top swaying two degrees, a few
 * petals falling (drawn in code), a pigeon gliding across every ten seconds,
 * and the post box in the lower middle with the couple's initials on its
 * brass plate (Devanagari on a Hindi card; a small flower when nobody is
 * named). "Tap to open" under it.
 *
 * OPENING, 2.95 seconds (coverTiming.ts), transforms and opacity only, every
 * part a CSS animation started on the tap:
 *
 *   120 to 1100   the date slip (22-date-slip, a tall strip of three panels)
 *                 prints up out of the slot in three short steps, at about the
 *                 slot's width, inside a box clipped at the slot's lip
 *   1150 to 1570  it rises to the middle of the screen at its reading size
 *                 (laid out at that size and scaled down before, so its words
 *                 are sharp when it gets there); the clip is let go first
 *   1600 to 1900  a round ink postmark presses onto it and settles
 *   1900 to 2350  the slip holds: the date, the day and time, the city
 *   2350 to 2950  the slip lifts toward the guest and fades, the courtyard
 *                 fades, and the card, let go under it at 2350, shows through
 *
 * The tap's sound plays in the tap (config.ts); the slip printing and the
 * postmark are scheduled on the audio clock as the opening starts, each a
 * little ahead of its moment, and called off by a skip.
 *
 * A tap on the slip while it holds lifts it at once (the shell is retimed to
 * match). Idle loops stop while the tab is hidden. Under reduced motion the
 * shell keeps this closed and still (no petals, no pigeon, no sway, no sound)
 * and crossfades it in 300ms.
 */
export default function DakGharCover({
  phase,
  reducedMotion,
  colors,
  pair,
  title,
  prompt,
  retime,
  draft,
  config,
}: TemplateCoverProps): ReactElement {
  const opening = phase !== "closed";
  const language = cardLanguage(config?.language ?? (/[ऀ-ॿ]/.test(prompt) ? "hi" : "en"));
  const words = slipWords(draft, language);
  const hidden = useTabHidden();
  const [tappable, setTappable] = useState(false);
  const [lifted, setLifted] = useState(false);
  const liftedRef = useRef(false);

  const initials =
    pair !== undefined ? `${initialOf(pair[0])} & ${initialOf(pair[1])}` : initialsOf(title);

  /*
    The slip's two sounds, on the audio clock from the frame the opening
    starts: before it paints, so the ear is not a frame behind the eye.
    Called off if the cover goes first (a skip).
  */
  useLayoutEffect(() => {
    if (phase !== "opening" || reducedMotion) {
      return;
    }

    const cancels = [
      playEffectSound(SOUND.slip, PRINT_AT - SOUND_LEAD_MS),
      playEffectSound(SOUND.stamp, STAMP_AT - SOUND_LEAD_MS),
    ];

    return () => {
      for (const cancel of cancels) {
        cancel();
      }
    };
  }, [phase, reducedMotion]);

  /* Once the postmark has landed, the slip itself is a way on. */
  useEffect(() => {
    if (phase !== "opening") {
      return;
    }

    const timer = window.setTimeout(() => setTappable(true), TAPPABLE_AT);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const liftNow = (): void => {
    if (liftedRef.current || phase !== "opening") {
      return;
    }

    liftedRef.current = true;
    setLifted(true);
    /* The rest of the open from now: the card let go at once, under the lift. */
    retime({ durationMs: LIFT_MS, revealAt: 0, sound: "keep" });
  };

  const stateClass = `${opening ? styles.opening : ""} ${lifted ? styles.liftedNow : ""} ${
    reducedMotion ? styles.still : ""
  } ${hidden ? styles.paused : ""}`;

  const slipText: CSSProperties = { color: "#2A1E14" };

  const strip = DATE_SLIP === "strip";

  /*
    On the strip, its three framed panels (measured off date-slip.webp, see
    `.stripTop` and on): the date at the head, the day and time, the city.
  */
  const stripPanels =
    words === null ? (
      <div className={`${styles.stripPanel} ${styles.stripTop}`}>
        <span className={`${styles.stripWeekday} text-balance wrap-anywhere`} style={{ ...DAK_FONTS.serif, ...slipText, lineHeight: leading(language, 1.15) }}>
          {title ?? ""}
        </span>
      </div>
    ) : (
      <>
        <div className={`${styles.stripPanel} ${styles.stripTop}`}>
          <span className={styles.stripDay} style={{ ...DAK_FONTS.serif, ...slipText }}>
            {words.day}
          </span>
          <span className={styles.stripMonth} style={{ ...DAK_FONTS.sans, ...slipText, ...caps(language), fontWeight: 700, lineHeight: leading(language, 1.2) }}>
            {words.month}
          </span>
          <span className={styles.stripYear} style={{ ...DAK_FONTS.sans, ...slipText, fontWeight: 600, lineHeight: leading(language, 1.2) }}>
            {words.year}
          </span>
        </div>
        <div className={`${styles.stripPanel} ${styles.stripMiddle}`}>
          <span className={`${styles.stripWeekday} wrap-anywhere`} style={{ ...DAK_FONTS.serif, ...slipText, lineHeight: leading(language, 1.1) }}>
            {words.weekday}
          </span>
          {words.time !== null ? (
            <span className={styles.stripTime} style={{ ...DAK_FONTS.sans, ...slipText, fontWeight: 600, lineHeight: leading(language, 1.25) }}>
              {words.time}
            </span>
          ) : null}
        </div>
        <div className={`${styles.stripPanel} ${styles.stripBottom}`}>
          <span className={`${styles.stripCity} text-balance wrap-anywhere`} style={{ ...DAK_FONTS.serif, ...slipText, lineHeight: leading(language, 1.1) }}>
            {words.city}
          </span>
        </div>
      </>
    );

  /* No date yet (a card still being written): the slip carries its title alone. */
  const panels =
    words === null ? (
      <div className={`${styles.slipPanel} ${styles.slipPanelMiddle}`}>
        <span className={`${styles.slipMid} text-balance`} style={{ ...DAK_FONTS.serif, ...slipText }}>
          {title ?? ""}
        </span>
      </div>
    ) : (
      <>
        <div className={styles.slipPanel}>
          <span
            className={styles.slipDay}
            style={{ ...DAK_FONTS.serif, ...slipText }}
          >
            {words.day}
          </span>
          <span className="flex flex-col items-start" style={{ ...DAK_FONTS.sans, ...slipText }}>
            <span className={styles.slipSmall} style={{ ...caps(language), fontWeight: 700, lineHeight: leading(language, 1.2) }}>
              {words.month}
            </span>
            <span className={styles.slipSmall} style={{ fontWeight: 600, lineHeight: leading(language, 1.2) }}>
              {words.year}
            </span>
          </span>
        </div>
        <div className={`${styles.slipPanel} flex-col`}>
          <span className={styles.slipMid} style={{ ...DAK_FONTS.serif, ...slipText, lineHeight: leading(language, 1.1) }}>
            {words.weekday}
          </span>
          {words.time !== null ? (
            <span className={styles.slipSmall} style={{ ...DAK_FONTS.sans, ...slipText, fontWeight: 600, lineHeight: leading(language, 1.25) }}>
              {words.time}
            </span>
          ) : null}
        </div>
        <div className={styles.slipPanel}>
          <span
            className={`${styles.slipCity} text-balance wrap-anywhere`}
            style={{ ...DAK_FONTS.serif, ...slipText, lineHeight: leading(language, 1.1) }}
          >
            {words.city}
          </span>
        </div>
      </>
    );

  return (
    <div
      aria-hidden="true"
      lang={language}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${styles.cover} ${strip ? styles.coverStrip : ""} ${stateClass}`}
    >
      {/* Everything but the slip: it fades as the slip lifts. */}
      <div className={styles.stage} style={{ backgroundColor: colors.ground }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.scene} alt="" draggable={false} className={styles.scene} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.pigeon} alt="" draggable={false} className={`${styles.pigeon} ${styles.loop}`} />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.bougainvillea} alt="" draggable={false} className={`${styles.vines} ${styles.loop}`} />

        {/* A soft cream light at the head, over the flowers, so "You are invited" reads there. */}
        <div className={styles.headLight} />

        {PETALS.map((index) => (
          <span key={index} className={`${styles.petal} ${styles.loop}`} data-petal={index}>
            <span className={`${styles.petalShape} ${styles.loop}`} />
          </span>
        ))}

        <div className={styles.box}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.postBox} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
          <div className={styles.plate}>
            {initials.length > 0 ? (
              <span className={styles.engraved} style={DAK_FONTS.serif}>
                {initials}
              </span>
            ) : (
              <GoldFlower hi="#d8b25a" body="#8a6420" lo="#5a3e10" className="w-[22%]" />
            )}
          </div>
        </div>

        <p className={styles.hint} style={{ ...DAK_FONTS.sans, ...caps(language) }}>
          {prompt}
        </p>
      </div>

      {/*
        The slip, over the post box, in a box whose foot is the slot's lip
        and which reaches far above and to each side: it shows only what has
        come out of the slot, and leaves room for the lift.
      */}
      {/* Mounted from the start, held below the slot, so the tap only has to start it moving. */}
      {!reducedMotion ? (
        <div className={`${styles.box} ${styles.slipLayer}`}>
          <div className={styles.slipClip}>
            <div className={styles.slipSlot}>
              <div className={styles.slipGrow}>
                <div className={styles.slipLift}>
                  <div
                    className={`${styles.slip} ${strip ? styles.slipStrip : ""}`}
                    onClick={tappable ? liftNow : undefined}
                    style={{ pointerEvents: tappable && !lifted ? "auto" : "none", cursor: tappable ? "pointer" : undefined }}
                  >
                    {strip ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ART.dateSlip} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" />
                        {stripPanels}
                      </>
                    ) : (
                      <>
                        {[0, 1, 2].map((ticket) => (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img key={ticket} src={ART.telegramSmall} alt="" draggable={false} className={styles.ticket} />
                        ))}
                        <div className={styles.slipPanels}>{panels}</div>
                      </>
                    )}
                    {words !== null ? (
                      <div className={styles.postmark}>
                        <Postmark city={words.city} date={postmarkDate(draft?.eventDate ?? "")} language={language} className={styles.postmarkArt} />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
