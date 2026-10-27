"use client";

import { useRef, type CSSProperties, type ReactElement } from "react";
import { preload } from "react-dom";
import { coverNameLine, formatWhen, placeholderOpacity, resolveCoverNames } from "@/lib/cardFormat";
import { dateRevealOf } from "@/lib/royalScroll";
import { ART } from "@/templates/dak-ghar/art";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, caps, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { useFitInside, useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The first page: the names on a sheet of letter paper, with the writing desk
 * (inkwell, pen and a bundle of letters) at its foot and a garland on its top
 * corner, both clear of the words.
 *
 * The words stay inside the paper's border, 12% to 88% each way (art.ts), and
 * are sized to fit there by useFitInside, so a long pair of names, or Hindi,
 * shrinks and never reaches the paisleys. One entrance as the cover lets the
 * card go: the paper rises and the lines fade up in turn.
 *
 * The date is left off a card whose host hides it behind a scratch panel.
 */
export default function DakGharNames({
  draft,
  config,
  language,
  minHeight,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  minHeight: string;
}): ReactElement {
  /* Seen as the slip lifts away: asked for early, though the cover does not wait on it. */
  preload(ART.letter, { as: "image" });
  preload(ART.paper, { as: "image" });

  const { ref, shown } = useReveal<HTMLElement>();
  const boxRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const own = dakCopy(language);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const title = draft.eventTitle.trim();
  const reveal = dateRevealOf(config.dateReveal, config.scratchTarget);
  const dateHidden = config.scratchTarget === "date" || reveal === "scratch" || reveal === "tear";
  const when = dateHidden ? null : formatWhen(draft.eventDate, draft.eventTime, language);

  useFitInside(boxRef, wordsRef, `${title}|${coverNameLine(names)}|${when}|${language}`);

  const line = (order: number): CSSProperties => ({ "--dg-delay": `${250 + order * 130}ms` }) as CSSProperties;
  const nameStyle: CSSProperties = {
    ...DAK_FONTS.serif,
    fontSize: "2.5em",
    lineHeight: leading(language, 1.08),
    color: "var(--dg-ink)",
  };

  return (
    <section ref={ref} className={`${styles.page} ${styles.namesPage}`} style={{ minHeight }}>
      <div className={`${styles.letter} ${shown ? styles.shown : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.letter} alt="" draggable={false} className={styles.letterArt} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.garland} alt="" draggable={false} className={styles.letterGarland} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.desk} alt="" draggable={false} className={styles.letterDesk} />

        <div ref={boxRef} className={styles.letterBox}>
          <div ref={wordsRef} className="flex w-full flex-col items-center text-center" style={{ gap: "0.7em" }}>
            <p className={styles.line} style={{ ...line(0), ...DAK_FONTS.sans, fontSize: "1em", color: "var(--dg-ink-muted)", lineHeight: leading(language, 1.4) }}>
              {own.invitationLine}
            </p>

            {title.length > 0 ? (
              <p
                className={`${styles.line} max-w-full wrap-anywhere text-balance`}
                style={{ ...line(1), ...DAK_FONTS.sans, ...caps(language), fontWeight: 700, fontSize: language === "hi" ? "1em" : "0.8em", color: "var(--dg-red)", lineHeight: leading(language, 1.4) }}
              >
                {title}
              </p>
            ) : null}

            {names.kind === "pair" ? (
              <div className="flex max-w-full flex-col items-center">
                <p className={`${styles.line} max-w-full wrap-anywhere text-balance`} style={{ ...line(2), ...nameStyle }}>
                  {names.first}
                </p>
                <p className={styles.line} style={{ ...line(3), ...DAK_FONTS.serif, fontSize: "1.4em", color: "var(--dg-red)", lineHeight: 1.3 }}>
                  &amp;
                </p>
                <p className={`${styles.line} max-w-full wrap-anywhere text-balance`} style={{ ...line(4), ...nameStyle }}>
                  {names.second}
                </p>
              </div>
            ) : (
              <p className={`${styles.line} max-w-full wrap-anywhere text-balance`} style={{ ...line(2), ...nameStyle }}>
                <span style={{ opacity: names.isPlaceholder ? placeholderOpacity(true, "primary") : 1 }}>{names.text}</span>
              </p>
            )}

            <span aria-hidden="true" className={`${styles.line} ${styles.rule}`} style={line(5)} />

            {when !== null ? (
              <p className={`${styles.line} text-balance`} style={{ ...line(6), ...DAK_FONTS.serif, fontSize: "1.3em", color: "var(--dg-ink)", lineHeight: leading(language, 1.3) }}>
                {when}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
