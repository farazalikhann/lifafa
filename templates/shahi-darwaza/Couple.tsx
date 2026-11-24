"use client";

import type { ReactElement } from "react";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { coupleOf } from "@/lib/cardSections";
import { ART } from "@/templates/shahi-darwaza/art";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { scriptLeading, type DarwazaFonts } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The couple: a carved marble jharokha hung with roses, the couple's
 * initials in its window, and their names and home towns under it.
 *
 * NO PHOTOGRAPH: a card has no field for one, so the window always holds the
 * monogram. The window is measured off arch-frame.webp (720 by 988): its
 * opening is x 232 to 495 and y 300 to 710 (`.archWindow`).
 *
 * Left out when nobody is named. A rose in its top right corner, one of the
 * card's three.
 */
export default function ShahiDarwazaCouple({
  draft,
  config,
  language,
  fonts,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  fonts: DarwazaFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const names = resolveCoverNames(draft, config.occasionId, language);

  if (names.kind === "line" && names.isPlaceholder) {
    return null;
  }

  const couple = coupleOf(draft, config.occasionId);
  const initials: readonly string[] =
    names.kind === "pair"
      ? [initialOf(names.first), initialOf(names.second)]
      : [initialsOf(names.text)];

  return (
    <section
      ref={ref}
      className={`${styles.section} ${styles.coupleSection} ${entered ? styles.revealIn : ""}`}
    >
      <span aria-hidden="true" className={`${styles.rose} ${styles.roseTopRight}`} />

      <h2 className={`${styles.reveal} ${styles.heading}`} style={fonts.heading}>
        {cardCopy(language).family.heading}
      </h2>

      <div className={`${styles.reveal} ${styles.arch}`} style={{ transitionDelay: "120ms" }}>
        <span aria-hidden="true" className={styles.archFill} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.archFrame}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="absolute inset-0 h-full w-full max-w-none"
        />
        <div className={styles.archWindow}>
          <span className={styles.monogram} style={{ ...fonts.names, lineHeight: scriptLeading(language) }}>
            <span>{initials[0]}</span>
            {initials.length > 1 ? (
              <>
                <span className={styles.monogramAnd} style={fonts.heading}>
                  &amp;
                </span>
                <span>{initials[1]}</span>
              </>
            ) : null}
          </span>
        </div>
      </div>

      {couple !== null ? (
        <div className={`${styles.reveal} flex flex-col items-center gap-1`} style={{ transitionDelay: "260ms" }}>
          {couple.map((person, index) => (
            <div key={person.key} className="flex flex-col items-center">
              {index === 1 ? (
                <span className="my-1 text-[1.1rem]" style={{ ...fonts.heading, color: "#8a5a1a" }}>
                  &amp;
                </span>
              ) : null}
              <p
                className="max-w-full text-[2rem] wrap-anywhere text-balance"
                style={{ ...fonts.names, lineHeight: scriptLeading(language), color: "#4a0f1a" }}
              >
                {person.name}
              </p>
              {person.city !== null ? (
                <p
                  className={`text-[0.78rem] ${language === "hi" ? "" : "tracking-[0.2em] uppercase"}`}
                  style={{ ...fonts.heading, color: "#8a5a1a" }}
                >
                  {person.city}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p
          className={`${styles.reveal} max-w-full text-[2rem] wrap-anywhere text-balance`}
          style={{ ...fonts.names, lineHeight: scriptLeading(language), color: "#4a0f1a", transitionDelay: "260ms" }}
        >
          {names.kind === "pair" ? `${names.first} & ${names.second}` : names.text}
        </p>
      )}
    </section>
  );
}
