"use client";

import { useRef, type CSSProperties, type ReactElement } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy, cardLanguage } from "@/lib/cardLanguage";
import {
  KANDEEL_ASPECT,
  LANTERNS,
  THANKS_GLINTS,
  VENUE_ASPECT,
  VENUE_SKY,
} from "@/templates/sheesh-mahal/art";
import { useCoupleFit, type CoupleFit } from "@/templates/sheesh-mahal/fit";
import Foil from "@/templates/sheesh-mahal/Foil";
import Glints from "@/templates/sheesh-mahal/Glints";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import { useRoomArt } from "@/templates/sheesh-mahal/picture";
import { usePageRest } from "@/templates/sheesh-mahal/rest";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { scriptLeading, sheeshCopy, sheeshFonts } from "@/templates/sheesh-mahal/shared";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/* The smallest lantern and the largest, for how bright each is: a far one is dimmer. */
const SMALLEST = Math.min(...LANTERNS.map((lantern) => lantern.size));
const LARGEST = Math.max(...LANTERNS.map((lantern) => lantern.size));

/**
 * Page 9: thank you, over the lake palace at night (venue-night.webp, page
 * 6's picture), with kandeels rising into the sky.
 *
 * IN THE SKY, the top third, never over the palace (VENUE_SKY): "Thank you"
 * large in gold foil, with the light across it as it arrives and every eight
 * seconds (Foil), the card's own thank-you line in ivory, and the couple in a
 * smaller gold script.
 *
 * THE LANTERNS: a dozen kandeels (eight on a narrow phone; LANTERNS in
 * art.ts) rising slowly from below the lake to above the sky, each at its
 * own pace, 14 to 26 seconds a rise, and swaying gently as it goes, each
 * with a small warm glow that flickers. Smaller ones are farther, and
 * dimmer. Spread in time and across so the sky is never empty or crowded.
 * They rise behind the words, and as each comes up into the sky it dims, so
 * the words always read over them. A transform and an opacity each, the
 * stylesheet's loops; they are drawn only while the page is at rest and fade
 * in then, and are held off the screen and in a hidden tab (Pager.tsx), so
 * nothing of them is part of a swipe. Under reduced motion they hang still
 * at their places in the night.
 *
 * Once the page has come to rest (rest.ts), once: the words fade up one by
 * one, and then the mirror glints on the palace flash together, softly.
 *
 * On the guest's page it follows the reply, as the card's own closing note
 * does; in a preview, which has no reply form, it ends the card.
 */
export default function SheeshClosing({
  draft,
  config,
}: {
  draft: EventDraft;
  config: CardConfig;
}): ReactElement {
  const art = useRoomArt();
  const language = cardLanguage(config.language);
  const fonts = sheeshFonts(config.style.fontPairId);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const thanks = sheeshCopy(language).pages.thanks;
  const rootRef = useRef<HTMLDivElement>(null);
  const parts = useRef<CoupleFit[]>([{ name: null, box: null, words: null }]);

  /* The words as large as the sky lets them be, and smaller for a long line of names. */
  useCoupleFit(parts, `${thanks}|${coverNameLine(names)}|${language}|${config.style.fontPairId}`);

  usePageRest(rootRef, {
    onRest: () => rootRef.current?.closest("[data-sm-room]")?.setAttribute("data-ty-in", ""),
  });

  return (
    <SheeshPage
      label={thanks}
      images={art === null ? [] : [art.venueNight, art.kandeel]}
      className={styles.palette}
      ground={
        <div className={styles.vnScene} style={{ "--vn-aspect": String(VENUE_ASPECT) } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art?.venueNight} alt="" loading="lazy" decoding="async" draggable={false} className={styles.vnArt} />
          <Glints glints={THANKS_GLINTS} listen={false} flashes className={styles.tyGlints} />
        </div>
      }
    >
      <div ref={rootRef} className={styles.thanks} style={{ "--vn-sky": String(VENUE_SKY) } as CSSProperties}>
        <div aria-hidden="true" className={styles.tyLanterns}>
          {LANTERNS.map((lantern, index) => {
            const near = (lantern.size - SMALLEST) / (LARGEST - SMALLEST);

            return (
              <span
                key={index}
                className={`${styles.tyLantern} ${index >= 8 ? styles.tyLanternExtra : ""}`}
                style={
                  {
                    left: `calc(${(lantern.x * 100).toFixed(1)}% - ${lantern.size / 2}px)`,
                    width: `${lantern.size}px`,
                    "--ty-h": `${(lantern.size / KANDEEL_ASPECT).toFixed(1)}px`,
                    "--ty-rise": `${lantern.rise}s`,
                    "--ty-at": `${(-lantern.at * lantern.rise).toFixed(2)}s`,
                    "--ty-sway": `${lantern.sway}s`,
                    "--ty-o": (0.5 + near * 0.45).toFixed(2),
                    /* Where it hangs when nothing moves: up the rise by as much as `at`. */
                    "--ty-still": lantern.at.toFixed(2),
                  } as CSSProperties
                }
              >
                <span className={styles.tySway}>
                  <span className={styles.tyGlow} style={{ "--ty-flicker": `${(2.4 + (index % 5) * 0.37).toFixed(2)}s` } as CSSProperties} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={art?.kandeel} alt="" loading="lazy" decoding="async" draggable={false} className={styles.tyArt} />
                </span>
              </span>
            );
          })}
        </div>

        <div
          ref={(element) => {
            parts.current[0].box = element;
          }}
          className={styles.tySky}
        >
          <div
            ref={(element) => {
              parts.current[0].words = element;
            }}
            className={styles.tyWords}
          >
          <h2
            className={`${styles.tyHeading} ${styles.tyLine}`}
            style={{ ...fonts.names, lineHeight: scriptLeading(language), "--sm-delay": "150ms" } as CSSProperties}
          >
            <Foil text={thanks} />
          </h2>
          <p
            className={`${styles.tyText} ${styles.onNight} ${styles.tyLine} text-balance`}
            style={{ ...fonts.body, "--sm-delay": "420ms" } as CSSProperties}
          >
            {cardCopy(language).thankYou}
          </p>
          {names.kind === "line" && names.isPlaceholder ? null : (
            <p
              className={`${styles.tyNames} ${styles.tyLine} text-balance`}
              style={{ ...fonts.names, lineHeight: scriptLeading(language), "--sm-delay": "690ms" } as CSSProperties}
            >
              {coverNameLine(names)}
            </p>
          )}
          </div>
        </div>
      </div>
    </SheeshPage>
  );
}
