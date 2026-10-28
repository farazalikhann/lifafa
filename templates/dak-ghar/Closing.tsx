"use client";

import type { CSSProperties, ReactElement } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardLanguage } from "@/lib/cardLanguage";
import { ART } from "@/templates/dak-ghar/art";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The card's last words, after the reply form (or at the card's foot where
 * there is no form): the host's own note where they wrote one is already a
 * telegram, so this is only "With love" and who from, under a bundle of
 * love letters tied with a rose (30), which fades and rises in a little
 * ahead of the words.
 */
export default function DakGharClosing({ draft, config }: { draft: EventDraft; config: CardConfig }): ReactElement {
  const language = cardLanguage(config.language);
  const { ref, shown } = useReveal<HTMLElement>();
  const names = resolveCoverNames(draft, config.occasionId, language);

  return (
    <section ref={ref} lang={language} className={`${styles.root} ${styles.page} pb-16`}>
      <div className={`${shown ? styles.shown : ""} flex flex-col items-center gap-3 text-center`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.letters} alt="" aria-hidden="true" width={340} height={272} loading="lazy" decoding="async" draggable={false} className={styles.closingLetters} />
        <p className={`${styles.line} text-[1.25rem]`} style={{ ...DAK_FONTS.sans, fontWeight: 500, color: "var(--dg-ink-muted)", "--dg-delay": "350ms" } as CSSProperties}>
          {dakCopy(language).thanks}
        </p>
        {names.kind === "pair" || !names.isPlaceholder ? (
          <p className={`${styles.line} max-w-[20ch] text-[2rem] wrap-anywhere text-balance`} style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.15), "--dg-delay": "500ms" } as CSSProperties}>
            {coverNameLine(names)}
          </p>
        ) : null}
      </div>
    </section>
  );
}
