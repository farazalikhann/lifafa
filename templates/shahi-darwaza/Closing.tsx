"use client";

import type { ReactElement } from "react";
import { resolveCoverNames } from "@/lib/cardFormat";
import { cardLanguage } from "@/lib/cardLanguage";
import { ART } from "@/templates/shahi-darwaza/art";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { darwazaCopy, darwazaFonts, scriptLeading } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The card's last words, over the courtyard at night: a garland across the
 * top, "With love", and the couple's names in gold script.
 *
 * On the guest's page this follows the reply form; in a preview, which has
 * no form, it ends the card. It sets its own type from the card's font pair,
 * since on the guest's page it is drawn outside the card.
 */
export default function ShahiDarwazaClosing({
  draft,
  config,
}: {
  draft: EventDraft;
  config: CardConfig;
}): ReactElement {
  const { ref, entered } = useEnter<HTMLElement>();
  const language = cardLanguage(config.language);
  const fonts = darwazaFonts(config.style.fontPairId);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const named = names.kind === "pair" || !names.isPlaceholder;

  return (
    <section ref={ref} lang={language} className={`${styles.night} ${styles.closingNight} ${entered ? styles.revealIn : ""}`}>
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ART.garland}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={styles.closingGarland}
      />

      <div className={styles.nightWords}>
        <p className={`${styles.reveal} ${styles.nightHeading}`} style={{ ...fonts.names, lineHeight: scriptLeading(language) }}>
          {darwazaCopy(language).withLove}
        </p>
        {named ? (
          <p
            className={`${styles.reveal} flex max-w-full flex-col items-center text-[2.1rem] wrap-anywhere text-balance`}
            style={{ ...fonts.names, lineHeight: scriptLeading(language), color: "#f2d896", transitionDelay: "180ms" }}
          >
            {names.kind === "pair" ? (
              <>
                <span>{names.first}</span>
                <span style={{ ...fonts.heading, fontSize: "0.5em", lineHeight: 1.2 }}>&amp;</span>
                <span>{names.second}</span>
              </>
            ) : (
              names.text
            )}
          </p>
        ) : null}
      </div>
    </section>
  );
}
