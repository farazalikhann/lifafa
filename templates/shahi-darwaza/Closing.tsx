"use client";

import type { CSSProperties, ReactElement } from "react";
import { resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy, cardLanguage } from "@/lib/cardLanguage";
import { coupleOf } from "@/lib/cardSections";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { darwazaFonts, scriptLeading } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The card's last words: the card's own line of thanks, the couple's names
 * in gold script, and under them the two families where the host has named
 * the parents (less any Lifafa set to be left out, `hideClosingParents`).
 *
 * On the guest's page this follows the reply form; in a preview, which has
 * no form, it ends the card. It sets its own type from the card's font
 * pair, since on the guest's page it is drawn outside the card.
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
  const hidden = config.hideClosingParents ?? [];
  const families = (coupleOf(draft, config.occasionId) ?? []).flatMap((person) =>
    person.parents === null || hidden.includes(person.key)
      ? []
      : [{ key: person.key, parents: person.parents }],
  );
  const step = (order: number): CSSProperties =>
    ({ "--sd-delay": `${order * 160}ms` }) as CSSProperties;

  return (
    <section
      ref={ref}
      lang={language}
      className={`${styles.root} ${styles.closing} ${entered ? styles.heroIn : ""} mx-auto flex w-full max-w-[26rem] flex-col items-center gap-4 px-6 pt-14 pb-12 text-center`}
    >
      <span aria-hidden="true" className={`${styles.heroLine} ${styles.garland}`} style={step(0)} />

      <p
        className={`${styles.heroLine} max-w-[30ch] text-[0.98rem] leading-relaxed text-pretty`}
        style={{ ...step(1), ...fonts.body }}
      >
        {cardCopy(language).thankYou}
      </p>

      {names.kind === "pair" || !names.isPlaceholder ? (
        <p
          className={`${styles.heroLine} max-w-full wrap-anywhere text-balance`}
          style={{
            ...step(2),
            ...fonts.names,
            fontSize: "1.9rem",
            lineHeight: scriptLeading(language),
            color: "#e8c77f",
          }}
        >
          {names.kind === "pair" ? `${names.first} & ${names.second}` : names.text}
        </p>
      ) : null}

      {families.length > 0 ? (
        <div className={`${styles.heroLine} flex flex-col items-center gap-1`} style={step(3)}>
          {families.map(({ key, parents }) => (
            <p
              key={key}
              data-closing-parents={key}
              className="max-w-[32ch] text-[0.86rem] leading-snug wrap-anywhere text-balance"
              style={{ ...fonts.body, color: "#d9b36c" }}
            >
              {parents}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
