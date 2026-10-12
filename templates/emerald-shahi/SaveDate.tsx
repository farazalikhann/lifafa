"use client";

import type { ReactElement } from "react";
import AddToCalendar from "@/components/card/AddToCalendar";
import type { CalendarInvite } from "@/lib/calendar";
import { calendarPageText, formatDateAndTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import type { Theme } from "@/lib/themes";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import { scriptLeading, type EmeraldFonts } from "@/templates/emerald-shahi/shared";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * "Save the Date": the calendar page for the day, in emerald and gold, with
 * the day itself ringed by a thin gold heart; the full date and time under
 * it; and the card's own Add to Calendar button.
 *
 * The page's words are the card's own `calendarPageText` (the month, the
 * year, the day and the weekday, in the card's language and India's time),
 * and the button is the card's own AddToCalendar with its sheet, its links
 * and its file: it draws itself from the theme it is handed, which here is
 * this card's emerald and gold.
 */
export default function EmeraldShahiSaveDate({
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
  fonts: EmeraldFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);

  if (page === null) {
    return null;
  }

  const copy = cardCopy(language).calendar;
  const when = formatDateAndTime(draft.eventDate, draft.eventTime, language);

  return (
    <section
      ref={ref}
      className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-[calc(1.1*var(--es))] px-5 py-[calc(3.5*var(--es))] text-center"
    >
      <Slide
        as="h2"
        entered={entered}
        from="left"
        className={styles.script}
        style={{
          ...fonts.names,
          fontSize: "calc(2.1 * var(--es))",
          lineHeight: scriptLeading(language),
        }}
      >
        {copy.heading}
      </Slide>

      <Slide entered={entered} from="right" order={1}>
        <div
          role="img"
          aria-label={copy.pageLabel(page.weekday, page.day, page.month, page.year)}
          className={`${styles.panel} flex w-[calc(12.5*var(--es))] flex-col items-center overflow-hidden`}
        >
          <p
            className="w-full py-[calc(0.55*var(--es))] text-[calc(0.72*var(--es))] font-semibold"
            style={{
              ...fonts.heading,
              backgroundColor: "var(--es-gold)",
              color: "var(--es-emerald-deep)",
              letterSpacing: language === "hi" ? undefined : "0.2em",
              textTransform: language === "hi" ? undefined : "uppercase",
            }}
          >
            {page.month} {page.year}
          </p>

          {/* The day, inside a heart drawn as one thin gold line. */}
          <div className="relative flex aspect-square w-[72%] items-center justify-center">
            <svg
              viewBox="0 0 100 100"
              aria-hidden="true"
              focusable="false"
              className="absolute inset-0 h-full w-full"
            >
              <path
                d="M50 86 C22 66 9 49 9 33 C9 20 19 11 30 11 C39 11 46 16 50 24 C54 16 61 11 70 11 C81 11 91 20 91 33 C91 49 78 66 50 86 Z"
                fill="none"
                stroke="var(--es-gold)"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="relative -mt-[6%] text-[calc(3.1*var(--es))] leading-none tabular-nums"
              style={{ ...fonts.heading, color: "var(--es-ivory)" }}
            >
              {page.day}
            </span>
          </div>

          <p
            className="pb-[calc(0.9*var(--es))] text-[calc(0.8*var(--es))]"
            style={{
              ...fonts.heading,
              color: "var(--es-gold)",
              letterSpacing: language === "hi" ? undefined : "0.18em",
              textTransform: language === "hi" ? undefined : "uppercase",
            }}
          >
            {page.weekday}
          </p>
        </div>
      </Slide>

      {when !== null ? (
        <Slide
          as="p"
          entered={entered}
          from="left"
          order={2}
          className="text-[calc(1.05*var(--es))] text-balance"
          style={{ ...fonts.heading, color: "var(--es-ivory)" }}
        >
          {when}
        </Slide>
      ) : null}

      <Slide entered={entered} from="right" order={3}>
        <AddToCalendar
          draft={draft}
          theme={theme}
          invite={invite}
          occasionId={occasionId}
          language={language}
        />
      </Slide>
    </section>
  );
}
