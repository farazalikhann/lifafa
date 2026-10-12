"use client";

import type { CSSProperties, ReactElement } from "react";
import {
  formatWhen,
  placeholderOpacity,
  resolveCoverNames,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { dateRevealOf } from "@/lib/royalScroll";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The first screen: "You are invited", the couple's names in gold script, what
 * the day is and when.
 *
 * A floral sits in the top right corner and the same one, turned round, in
 * the bottom left; each is half the screen wide and hangs a little off it. The
 * words are kept out of both by the hero's own padding (see `.hero` in the
 * stylesheet), which is as deep as a floral is tall, so no name however long
 * can run under a flower: the screen grows instead.
 *
 * The date is left off a card whose host has hidden it behind a scratch panel
 * or a strip of paper, which would otherwise be given away here.
 */
export default function EmeraldShahiHero({
  draft,
  config,
  language,
  minHeight,
  namesFont,
  headingFont,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  minHeight: string;
  namesFont: CSSProperties;
  headingFont: CSSProperties;
}): ReactElement {
  const { ref, entered } = useEnter<HTMLElement>();
  const copy = cardCopy(language);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const title = draft.eventTitle.trim();

  const reveal = dateRevealOf(config.dateReveal, config.scratchTarget);
  const dateHidden =
    config.scratchTarget === "date" || reveal === "scratch" || reveal === "tear";
  const when = dateHidden ? null : formatWhen(draft.eventDate, "", language);

  const script: CSSProperties = {
    ...namesFont,
    fontSize: "calc(2.7 * var(--es))",
    lineHeight: language === "hi" ? 1.5 : 1.2,
  };

  return (
    <section
      ref={ref}
      className={`${styles.hero} flex-col items-center justify-center px-6 text-center`}
      style={{ minHeight }}
    >
      <span aria-hidden="true" className={`${styles.floral} ${styles.floralTop}`} />
      <span aria-hidden="true" className={`${styles.floral} ${styles.floralFoot}`} />

      <div className="relative flex w-full max-w-[26rem] flex-col items-center gap-[calc(1.1*var(--es))]">
        <Slide as="p" entered={entered} from="left">
          <span className={styles.caps} style={headingFont}>
            {copy.coverInvite.heading}
          </span>
        </Slide>

        {names.kind === "pair" ? (
          <div className="flex max-w-full flex-col items-center">
            <Slide
              as="p"
              entered={entered}
              from="right"
              order={1}
              className={`${styles.script} max-w-full wrap-anywhere`}
              style={script}
            >
              {names.first}
            </Slide>
            <Slide as="p" entered={entered} from="left" order={2} className="my-1">
              <span className={styles.caps} style={headingFont}>
                {names.joiner}
              </span>
            </Slide>
            <Slide
              as="p"
              entered={entered}
              from="right"
              order={3}
              className={`${styles.script} max-w-full wrap-anywhere`}
              style={script}
            >
              {names.second}
            </Slide>
          </div>
        ) : (
          <Slide
            as="p"
            entered={entered}
            from="right"
            order={1}
            className={`${styles.script} max-w-full wrap-anywhere text-balance`}
            style={script}
          >
            {/* The editor's "Your names", fainter than a name; never seen by a guest. */}
            <span
              style={{
                opacity: placeholderOpacity(names.isPlaceholder, "primary"),
              }}
            >
              {names.text}
            </span>
          </Slide>
        )}

        {title.length > 0 ? (
          <Slide as="p" entered={entered} from="left" order={4}>
            <span className={styles.caps} style={headingFont}>
              {title}
            </span>
          </Slide>
        ) : null}

        {when !== null ? (
          <Slide
            as="p"
            entered={entered}
            from="right"
            order={5}
            className="text-[calc(1.05*var(--es))] text-balance"
            style={{ ...headingFont, color: "var(--es-ivory)" }}
          >
            {when}
          </Slide>
        ) : null}
      </div>
    </section>
  );
}
