"use client";

import type { ReactElement } from "react";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import { STAMP_ART, STAMP_ASPECT, stampFor } from "@/templates/dak-ghar/art";
import { PageHeading } from "@/templates/dak-ghar/Paper";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, leading } from "@/templates/dak-ghar/shared";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** One function: its postage stamp, and beside it what, when and where. */
function StampCard({ entry, index, language }: { entry: TimelineEntry; index: number; language: CardLanguage }): ReactElement {
  const { ref, shown } = useReveal<HTMLElement>();
  const kind = stampFor(entry.label);
  const page = calendarPageText(entry.date, entry.time, language);
  const venue = entry.venueName.trim();

  return (
    <article
      ref={ref}
      className={`${styles.reveal} ${styles.stampCard} ${index % 2 === 1 ? styles.stampCardFlip : ""} ${shown ? styles.shown : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={STAMP_ART[kind]}
        alt=""
        width={480}
        height={Math.round(480 / STAMP_ASPECT[kind])}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={styles.stampArt}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="max-w-full text-[1.625rem] wrap-anywhere text-balance" style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.1) }}>
          {entry.label.trim()}
        </h3>
        {page !== null ? (
          <>
            <p className="text-base" style={{ ...DAK_FONTS.sans, fontWeight: 600, lineHeight: leading(language, 1.4) }}>
              {page.weekday}, {page.day} {page.month} {page.year}
            </p>
            {page.time !== null && hasEventTime(entry.time) ? (
              <p className="text-base" style={{ ...DAK_FONTS.sans, color: "var(--dg-red)", fontWeight: 600, lineHeight: leading(language, 1.4) }}>
                {page.time}
              </p>
            ) : null}
          </>
        ) : null}
        {venue.length > 0 ? (
          <p className="mt-1 max-w-full text-base wrap-anywhere text-pretty" style={{ ...DAK_FONTS.sans, color: "var(--dg-ink-muted)", lineHeight: leading(language, 1.45) }}>
            {venue}
          </p>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Every function, in date order, each on the postage stamp that matches it
 * (haldi, mehendi, sangeet, the wedding; the palace by the lake for a
 * reception or anything else), the stamps on alternate sides down the page.
 * The list is the card's own `timelineEntries`.
 */
export default function DakGharStamps({ draft, language }: { draft: EventDraft; language: CardLanguage }): ReactElement | null {
  const entries = timelineEntries(draft, language);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className="flex w-full max-w-[28rem] flex-col items-center gap-7">
        <PageHeading>{cardCopy(language).timeline.heading}</PageHeading>
        {entries.map((entry, index) => (
          <StampCard key={entry.id} entry={entry} index={index} language={language} />
        ))}
      </div>
    </section>
  );
}
