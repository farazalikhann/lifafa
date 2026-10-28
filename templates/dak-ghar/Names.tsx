"use client";

import { useLayoutEffect, useRef, type CSSProperties, type ReactElement } from "react";
import { preload } from "react-dom";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf } from "@/components/invite/covers/initials";
import { coverNameLine, formatWhen, placeholderOpacity, resolveCoverNames } from "@/lib/cardFormat";
import { playEffectSound } from "@/lib/effectSound";
import { dateRevealOf } from "@/lib/royalScroll";
import { ART } from "@/templates/dak-ghar/art";
import Drift from "@/templates/dak-ghar/Drift";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, caps, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { SOUND } from "@/templates/dak-ghar/sounds";
import { useFitInside, useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The first page: the names on a sheet of letter paper, a crimson wax seal at
 * its top centre with the couple's initials pressed into it (Devanagari on a
 * Hindi card, a small flower when nobody is named), the writing desk
 * (inkwell, pen and a bundle of letters) at its foot, both clear of the words.
 * Behind it a few airmail envelopes drift slowly across the paper (Drift).
 *
 * The words stay inside the paper's border, 12% to 88% each way (art.ts), and
 * are sized to fit there by useFitInside, so a long pair of names, or Hindi,
 * shrinks and never reaches the paisleys.
 *
 * ONE ENTRANCE, as the cover lets the card go: the whole letter, seal and desk
 * with it, is thrown onto the table in one piece, up from below, turned -8
 * degrees and at 0.85, to rest at -1.5 degrees with a soft settle, to
 * dg-paper-whoosh; then its lines fade up in turn. One CSS animation, its
 * sound started 60ms ahead of it. Under reduced motion it simply fades in.
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

  /* The letter's landing, heard as it is thrown (its animation waits SOUND_LEAD_MS for this). */
  useLayoutEffect(() => {
    if (shown) {
      playEffectSound(SOUND.whoosh);
    }
  }, [shown]);

  const initials = names.kind === "pair" ? `${initialOf(names.first)} & ${initialOf(names.second)}` : "";

  /* After the letter has landed (about 1s), the lines in turn. */
  const line = (order: number): CSSProperties => ({ "--dg-delay": `${900 + order * 120}ms` }) as CSSProperties;
  const nameStyle: CSSProperties = {
    ...DAK_FONTS.serif,
    fontSize: "2.5em",
    lineHeight: leading(language, 1.08),
    color: "var(--dg-ink)",
  };

  return (
    <section ref={ref} className={`${styles.page} ${styles.namesPage}`} style={{ minHeight }}>
      <Drift active={shown} />
      <div className={`${styles.letter} ${shown ? styles.shown : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.letter} alt="" draggable={false} className={styles.letterArt} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.desk} alt="" draggable={false} className={styles.letterDesk} />
        <div aria-hidden="true" className={styles.letterSeal}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.waxSeal} alt="" width={260} height={264} draggable={false} className="block h-auto w-full select-none" />
          <span className={styles.sealMark}>
            {initials.length > 0 ? (
              <span className={styles.sealInitials} style={DAK_FONTS.serif}>
                {initials}
              </span>
            ) : (
              <GoldFlower hi="#c9584d" body="#7a1a14" lo="#4e0d09" className="w-[46%]" />
            )}
          </span>
        </div>

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
