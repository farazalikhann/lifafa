"use client";

import type { CSSProperties, ReactElement } from "react";
import AddToCalendar from "@/components/card/AddToCalendar";
import type { CalendarInvite } from "@/lib/calendar";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import type { Theme } from "@/lib/themes";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { darwazaCopy, type DarwazaFonts } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * The wedding's month, as a page of a calendar: the weekdays, the days in
 * their weeks, and the day itself circled in a thin gold ring with a small
 * rose on it. Under it the weekday and the time, and the card's own "Add to
 * calendar" with its sheet, its links and its file.
 *
 * The month is read off the date as the host wrote it (YYYY-MM-DD), which is
 * the day in India: no clock and no time zone, so the server and the browser
 * draw the same page.
 *
 * Left out when the card has no date.
 */
export default function ShahiDarwazaCalendar({
  draft,
  language,
  occasionId,
  invite,
  theme,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  occasionId: OccasionId;
  invite: CalendarInvite;
  theme: Theme;
  fonts: DarwazaFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);
  const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(draft.eventDate);

  if (page === null || parts === null) {
    return null;
  }

  const year = Number(parts[1]);
  const month = Number(parts[2]) - 1;
  const day = Number(parts[3]);
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const length = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length }, (_, index) => index + 1),
  ];
  const copy = darwazaCopy(language);

  return (
    <section ref={ref} className={`${styles.section} ${entered ? styles.revealIn : ""}`}>
      <h2 className={`${styles.reveal} ${styles.heading}`} style={fonts.heading}>
        {cardCopy(language).calendar.heading}
      </h2>

      <div className={`${styles.reveal} ${styles.calendar}`} style={{ transitionDelay: "120ms" }}>
        <p className={styles.calendarMonth} style={fonts.names}>
          {page.month}
          <span className="ml-[0.3em]">{page.year}</span>
        </p>

        <div className={styles.calendarGrid} role="grid" aria-label={`${page.month} ${page.year}`}>
          {copy.weekdays.map((weekday, index) => (
            <span key={`w${index}`} aria-hidden="true" className={styles.calendarWeekday} style={fonts.heading}>
              {weekday}
            </span>
          ))}

          {cells.map((cell, index) =>
            cell === null ? (
              <span key={`b${index}`} aria-hidden="true" />
            ) : (
              <span
                key={cell}
                className={`${styles.calendarDay} ${cell === day ? styles.calendarTheDay : ""}`}
                style={fonts.heading}
                aria-current={cell === day ? "date" : undefined}
              >
                {cell}
                {cell === day ? (
                  <>
                    <span aria-hidden="true" className={styles.calendarRing} />
                    <SmallRose />
                  </>
                ) : null}
              </span>
            ),
          )}
        </div>

        <p
          className={`mt-4 text-[0.82rem] ${language === "hi" ? "" : "tracking-[0.18em] uppercase"}`}
          style={{ ...fonts.heading, color: "#8a5a1a" } as CSSProperties}
        >
          {page.weekday}
          {page.time !== null && hasEventTime(draft.eventTime) ? ` · ${page.time}` : ""}
        </p>
      </div>

      <div className={styles.reveal} style={{ transitionDelay: "260ms" }}>
        <AddToCalendar draft={draft} theme={theme} invite={invite} occasionId={occasionId} language={language} />
      </div>
    </section>
  );
}

/** A small rose on the ring: three petals round a bud and two leaves, drawn in code. */
function SmallRose(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.calendarRose}>
      <path d="M5 17c3-1 5 0 6 2-3 1-5 0-6-2Z" fill="#6f8a4e" />
      <path d="M19 17c-3-1-5 0-6 2 3 1 5 0 6-2Z" fill="#5d7a40" />
      <circle cx="12" cy="11" r="7" fill="#d88a96" />
      <path d="M6.5 11a5.5 5.5 0 0 1 11 0c-1.6-1.8-3.4-2.4-5.5-2.4S8.1 9.2 6.5 11Z" fill="#c26a79" />
      <circle cx="12" cy="11.5" r="3.4" fill="#b55466" />
      <path d="M10 11.2c.8-1.4 3.2-1.4 4 0-1.2-.5-2.8-.5-4 0Z" fill="#f0b8c0" />
    </svg>
  );
}
