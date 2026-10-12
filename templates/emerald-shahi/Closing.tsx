"use client";

import type { ReactElement } from "react";
import { resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy, cardLanguage } from "@/lib/cardLanguage";
import { coupleOf } from "@/lib/cardSections";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import {
  emeraldCopy,
  emeraldFonts,
  scriptLeading,
} from "@/templates/emerald-shahi/shared";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The card's last words: "Thank you" in gold script, the card's own line of
 * thanks, the couple's names, and under them the two families where the host
 * has named the parents.
 *
 * On the guest's page this follows the reply form, where the shared card puts
 * its own closing note; in a preview, which has no form, it ends the card.
 * It sets its own type from the card's font pair, since on the guest's page
 * it is drawn outside the card and inherits nothing from it.
 */
export default function EmeraldShahiClosing({
  draft,
  config,
  fluid = true,
}: {
  draft: EventDraft;
  config: CardConfig;
  /**
   * Whether it is set larger from 768px, as the guest's card is. On for the
   * guest's page, where the page places it; a preview says what its card is.
   */
  fluid?: boolean;
}): ReactElement {
  const { ref, entered } = useEnter<HTMLElement>();
  const language = cardLanguage(config.language);
  const fonts = emeraldFonts(config.style.fontPairId);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const families = (coupleOf(draft, config.occasionId) ?? [])
    .map((person) => person.parents)
    .filter((parents): parents is string => parents !== null);

  return (
    <section
      ref={ref}
      lang={language}
      className={`${styles.root} ${fluid ? styles.fluid : ""} mx-auto flex w-full max-w-[26rem] flex-col items-center gap-[calc(1*var(--es))] px-6 pt-[calc(3.5*var(--es))] pb-[calc(3*var(--es))] text-center`}
      style={{ overflowX: "clip" }}
    >
      <Slide
        as="h2"
        entered={entered}
        from="left"
        className={styles.script}
        style={{
          ...fonts.names,
          fontSize: "calc(2.6 * var(--es))",
          lineHeight: scriptLeading(language),
        }}
      >
        {emeraldCopy(language).thankYou}
      </Slide>

      <Slide
        as="p"
        entered={entered}
        from="right"
        order={1}
        className="max-w-[30ch] text-[calc(0.98*var(--es))] leading-relaxed text-pretty"
        style={{ ...fonts.body, color: "var(--es-ivory)" }}
      >
        {cardCopy(language).thankYou}
      </Slide>

      {names.kind === "pair" || !names.isPlaceholder ? (
        <Slide
          as="p"
          entered={entered}
          from="left"
          order={2}
          className={`${styles.script} max-w-full wrap-anywhere text-balance`}
          style={{
            ...fonts.names,
            fontSize: "calc(1.7 * var(--es))",
            lineHeight: scriptLeading(language),
          }}
        >
          {names.kind === "pair"
            ? `${names.first} & ${names.second}`
            : names.text}
        </Slide>
      ) : null}

      {families.length > 0 ? (
        <Slide
          entered={entered}
          from="right"
          order={3}
          className="flex flex-col items-center gap-1"
        >
          {families.map((parents) => (
            <p
              key={parents}
              className="max-w-[32ch] text-[calc(0.84*var(--es))] leading-snug wrap-anywhere text-balance"
              style={{ ...fonts.body, color: "var(--es-gold)" }}
            >
              {parents}
            </p>
          ))}
        </Slide>
      ) : null}
    </section>
  );
}
