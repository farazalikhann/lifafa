"use client";

import type { ReactElement } from "react";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { hasTimeline, timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { functionIcon, scriptLeading, type DarwazaFonts } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import { useNear } from "@/templates/shahi-darwaza/useNear";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** One function: its gold icon by the thread, then its name, its day and time, and where. */
function EventCard({
  entry,
  language,
  fonts,
}: {
  entry: TimelineEntry;
  language: CardLanguage;
  fonts: DarwazaFonts;
}): ReactElement {
  const { ref, entered } = useEnter<HTMLLIElement>();
  const page = calendarPageText(entry.date, entry.time, language);
  const venue = entry.venueName.trim();
  const address = entry.venueAddress.trim();

  return (
    <li ref={ref} className={`${styles.eventRow} ${entered ? styles.revealIn : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={functionIcon(entry.label)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`${styles.reveal} ${styles.eventIcon}`}
      />
      <article className={`${styles.reveal} ${styles.eventCard}`} style={{ transitionDelay: "100ms" }}>
        <h3
          className="max-w-full text-[1.7rem] wrap-anywhere text-balance"
          style={{ ...fonts.names, lineHeight: scriptLeading(language), color: "#4a0f1a" }}
        >
          {entry.label.trim()}
        </h3>

        {page !== null ? (
          <p className="text-[0.95rem] leading-snug" style={fonts.heading}>
            {page.day} {page.month} {page.year}
            <span
              className={`block text-[0.74rem] ${language === "hi" ? "" : "tracking-[0.18em] uppercase"}`}
              style={{ color: "#8a5a1a" }}
            >
              {page.weekday}
              {page.time !== null && hasEventTime(entry.time) ? ` · ${page.time}` : ""}
            </span>
          </p>
        ) : null}

        {venue.length > 0 || address.length > 0 ? (
          <p className="mt-1 text-[0.88rem] leading-snug wrap-anywhere text-pretty" style={fonts.body}>
            {venue}
            {venue.length > 0 && address.length > 0 ? <br /> : null}
            {address.length > 0 ? <span style={{ color: "#6e3a3a" }}>{address}</span> : null}
          </p>
        ) : null}
      </article>
    </li>
  );
}

/**
 * Every function, earliest first, down a silk thread with a tassel at its
 * foot: the card's own `timelineEntries`, the main event among them.
 *
 * THE THREAD GROWS WITH THE SCROLL, down from its top, where the browser can
 * tie an animation to the scroll itself (animation-timeline: view(), run by
 * the browser off the main thread); elsewhere it grows once as the list
 * comes on screen. Its picture is cut so the tassel keeps its shape however
 * long the list is (`.thread`), and given only a screen ahead (useNear).
 *
 * Left out until the host has added a second function, as the shared card's
 * timeline is (hasTimeline): one event is not a running order.
 */
export default function ShahiDarwazaTimeline({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: DarwazaFonts;
}): ReactElement | null {
  const heading = useEnter<HTMLHeadingElement>();
  const list = useEnter<HTMLDivElement>();
  const near = useNear<HTMLDivElement>();

  if (!hasTimeline(draft)) {
    return null;
  }

  const entries = timelineEntries(draft, language);

  return (
    <section className={styles.section}>
      <h2
        ref={heading.ref}
        className={`${styles.heading} ${styles.reveal} ${heading.entered ? styles.revealIn : ""}`}
        style={fonts.heading}
      >
        {cardCopy(language).timeline.heading}
      </h2>

      <div
        ref={(element) => {
          list.ref.current = element;
          near.ref.current = element;
        }}
        className={`${styles.timeline} ${list.entered ? styles.timelineIn : ""}`}
      >
        <span aria-hidden="true" className={`${styles.thread} ${near.near ? styles.threadArt : ""}`} />
        <ol className="flex flex-col gap-5">
          {entries.map((entry) => (
            <EventCard key={entry.id} entry={entry} language={language} fonts={fonts} />
          ))}
        </ol>
      </div>
    </section>
  );
}
