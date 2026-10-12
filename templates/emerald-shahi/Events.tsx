"use client";

import type { ReactElement } from "react";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import {
  emeraldCopy,
  scriptLeading,
  type EmeraldFonts,
} from "@/templates/emerald-shahi/shared";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** One function, on its own sheet of parchment. */
function EventCard({
  entry,
  number,
  language,
  fonts,
}: {
  entry: TimelineEntry;
  number: number;
  language: CardLanguage;
  fonts: EmeraldFonts;
}): ReactElement {
  const { ref, entered } = useEnter<HTMLDivElement>();
  const page = calendarPageText(entry.date, entry.time, language);
  const venue = entry.venueName.trim();

  return (
    <div ref={ref} className="w-full">
      {/* Odd from the left, even from the right, down the page. */}
      <Slide
        as="article"
        entered={entered}
        from={number % 2 === 1 ? "left" : "right"}
        className={styles.eventCard}
      >
        <div className={styles.eventBody}>
          <p
            className={`${styles.eventNumber} text-[4.2cqw] tracking-[0.2em] uppercase`}
            style={fonts.heading}
          >
            {emeraldCopy(language).number(number)}
          </p>

          <h3
            className="max-w-full text-[10cqw] wrap-anywhere text-balance"
            style={{ ...fonts.names, lineHeight: scriptLeading(language) }}
          >
            {entry.label.trim()}
          </h3>

          {page !== null ? (
            <>
              <p className="text-[5.4cqw] leading-snug" style={fonts.heading}>
                {page.day} {page.month} {page.year}
              </p>
              <p
                className={`${styles.onPaperGold} text-[3.8cqw] ${
                  language === "hi" ? "" : "tracking-[0.22em] uppercase"
                }`}
                style={fonts.heading}
              >
                {page.weekday}
                {page.time !== null && hasEventTime(entry.time)
                  ? ` · ${page.time}`
                  : ""}
              </p>
            </>
          ) : null}

          {venue.length > 0 ? (
            <p
              className="mt-[1cqw] max-w-full text-[4.2cqw] leading-snug wrap-anywhere text-balance"
              style={fonts.body}
            >
              {venue}
            </p>
          ) : null}
        </div>
      </Slide>
    </div>
  );
}

/**
 * Every function, in date order, one parchment card each: "No. 1", what it is
 * called in script, its date, its weekday and time, and where.
 *
 * The list is the card's own `timelineEntries`: the main event and every
 * function the host added, sorted the way the shared timeline sorts them. A
 * card with only its main event has the one card.
 */
export default function EmeraldShahiEvents({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: EmeraldFonts;
}): ReactElement | null {
  const heading = useEnter<HTMLDivElement>();
  const entries = timelineEntries(draft, language);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-[24rem] flex-col items-center gap-[calc(1.6*var(--es))] px-5 py-[calc(3.5*var(--es))]">
      <div ref={heading.ref} className="w-full text-center">
        <Slide as="h2" entered={heading.entered} from="left">
          <span className={styles.caps} style={fonts.heading}>
            {cardCopy(language).timeline.heading}
          </span>
        </Slide>
      </div>

      {entries.map((entry, index) => (
        <EventCard
          key={entry.id}
          entry={entry}
          number={index + 1}
          language={language}
          fonts={fonts}
        />
      ))}
    </section>
  );
}
