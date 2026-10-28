"use client";

import type { ReactElement, ReactNode } from "react";
import AddToCalendar from "@/components/card/AddToCalendar";
import type { CalendarInvite } from "@/lib/calendar";
import { calendarPageText, hasEventTime } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { coupleOf, familyBlocks } from "@/lib/cardSections";
import { contactsOf, telHref } from "@/lib/contacts";
import type { Theme } from "@/lib/themes";
import { ART } from "@/templates/dak-ghar/art";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, caps, leading, replyCardTheme } from "@/templates/dak-ghar/shared";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";
import type { CustomSection } from "@/types/customSection";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/** A page's heading: the serif, a short red rule under it. */
export function PageHeading({ children }: { children: ReactNode }): ReactElement {
  return (
    <div className="flex flex-col items-center gap-3">
      <h2 className={`${styles.heading} max-w-full wrap-anywhere`} style={DAK_FONTS.serif}>
        {children}
      </h2>
      <span aria-hidden="true" className={styles.rule} />
    </div>
  );
}

/**
 * A sheet of cream writing paper with a thin postal border, rising in once
 * when it comes on screen: what the couple, the date, the numbers and the
 * host's own sections are written on.
 */
export function PaperCard({
  heading,
  children,
  before,
  after,
}: {
  heading: string | null;
  children: ReactNode;
  /** Drawn between the heading and the words, told whether the card has come on screen. */
  before?: (shown: boolean) => ReactNode;
  /** Drawn after the card, outside it, told the same. */
  after?: (shown: boolean) => ReactNode;
}): ReactElement {
  const { ref, shown } = useReveal<HTMLElement>();

  return (
    <section ref={ref} className={styles.page}>
      <div className={`${styles.reveal} ${styles.paperCard} ${shown ? styles.shown : ""}`}>
        {heading !== null ? <PageHeading>{heading}</PageHeading> : null}
        {before?.(shown)}
        {children}
      </div>
      {after?.(shown)}
    </section>
  );
}

/**
 * The groom and the bride above the couple's names, painted (23, 24): as the
 * section comes into view he walks in from the left and she from the right,
 * and they stop close together, facing each other. Tied to the scroll where
 * the browser runs scroll timelines (a CSS view timeline, on the compositor),
 * a one-time reveal where it does not, still under reduced motion. Only for a
 * card that names a couple.
 */
function CoupleFigures({ shown }: { shown: boolean }): ReactElement {
  return (
    <div aria-hidden="true" className={`${styles.coupleFigures} ${shown ? styles.shown : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.groom} alt="" width={142} height={520} loading="lazy" decoding="async" draggable={false} className={`${styles.figure} ${styles.groom}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.bride} alt="" width={334} height={520} loading="lazy" decoding="async" draggable={false} className={`${styles.figure} ${styles.bride}`} />
    </div>
  );
}

/** The couple, each with their parents and their town. */
export function DakGharCouple({
  draft,
  occasionId,
  language,
}: {
  draft: EventDraft;
  occasionId: OccasionId;
  language: CardLanguage;
}): ReactElement {
  const copy = cardCopy(language).family;
  const couple = coupleOf(draft, occasionId);
  const people = couple ?? familyBlocks(draft);

  return (
    <PaperCard heading={copy.heading} before={couple !== null ? (shown) => <CoupleFigures shown={shown} /> : undefined}>
      <div className="flex w-full flex-col items-center gap-6">
        {people.map((person, index) => (
          <div key={person.key} className="flex max-w-full flex-col items-center gap-1 text-center">
            {index > 0 ? (
              <span aria-hidden="true" className="mb-3 text-[1.5rem] leading-none" style={{ ...DAK_FONTS.serif, color: "var(--dg-red)" }}>
                &amp;
              </span>
            ) : null}
            {person.name !== null ? (
              <p className="max-w-full text-[1.75rem] wrap-anywhere text-balance" style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.15) }}>
                {person.name}
              </p>
            ) : null}
            {person.parents !== null ? (
              <p className="max-w-full text-base wrap-anywhere text-balance" style={{ ...DAK_FONTS.sans, color: "var(--dg-ink-muted)", lineHeight: leading(language, 1.5) }}>
                {person.key === "one" ? copy.sonOf : copy.daughterOf} {person.parents}
              </p>
            ) : null}
            {person.city !== null ? (
              <p className="text-base" style={{ ...DAK_FONTS.sans, color: "var(--dg-ink-muted)", lineHeight: leading(language, 1.5) }}>
                {person.city}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </PaperCard>
  );
}

/**
 * Save the Date: the day large inside a ring of ink like a postmark's, the
 * weekday, month and time round it, and the card's own Add to Calendar.
 */
export function DakGharSaveDate({
  draft,
  language,
  occasionId,
  invite,
  theme,
}: {
  draft: EventDraft;
  language: CardLanguage;
  occasionId: OccasionId;
  invite: CalendarInvite;
  theme: Theme;
}): ReactElement | null {
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);

  if (page === null) {
    return null;
  }

  const copy = cardCopy(language).calendar;

  return (
    <PaperCard heading={copy.heading}>
      <div
        role="img"
        aria-label={copy.pageLabel(page.weekday, page.day, page.month, page.year)}
        className={styles.dateRing}
      >
        <span className="text-base" style={{ ...DAK_FONTS.sans, ...caps(language), fontWeight: 700, color: "var(--dg-red)" }}>
          {page.weekday}
        </span>
        <span className="text-[4rem] leading-none" style={DAK_FONTS.serif}>
          {page.day}
        </span>
        <span className="text-base" style={{ ...DAK_FONTS.sans, fontWeight: 600, lineHeight: leading(language, 1.3) }}>
          {page.month} {page.year}
        </span>
      </div>
      {page.time !== null && hasEventTime(draft.eventTime) ? (
        <p className="text-[1.375rem]" style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.3) }}>
          {page.time}
        </p>
      ) : null}
      <AddToCalendar draft={draft} theme={replyCardTheme(theme)} invite={invite} occasionId={occasionId} language={language} />
    </PaperCard>
  );
}

/** Who to ring: each name, and the number as a link to call it. */
export function DakGharContacts({ draft, language }: { draft: EventDraft; language: CardLanguage }): ReactElement | null {
  const contacts = contactsOf(draft);
  const copy = cardCopy(language).contact;

  if (contacts.length === 0) {
    return null;
  }

  return (
    <PaperCard heading={copy.heading}>
      <ul className="flex w-full flex-col items-center gap-4">
        {contacts.map((contact) => (
          <li key={contact.id} className="flex max-w-full flex-col items-center">
            {contact.label.length > 0 ? (
              <span className="max-w-full text-base wrap-anywhere" style={{ ...DAK_FONTS.sans, color: "var(--dg-ink-muted)" }}>
                {contact.label}
              </span>
            ) : null}
            <a
              href={telHref(contact.phone) ?? undefined}
              aria-label={`${copy.call} ${contact.label} ${contact.phone}`.replace(/\s+/g, " ")}
              dir="ltr"
              className={styles.phone}
              style={DAK_FONTS.serif}
            >
              {contact.phone}
            </a>
          </li>
        ))}
      </ul>
    </PaperCard>
  );
}

/** A section the host wrote: its heading and its words, as typed. */
export function DakGharCustom({ section }: { section: CustomSection }): ReactElement {
  const heading = section.heading.trim();
  const body = section.body.trim();

  return (
    <PaperCard heading={heading.length > 0 ? heading : null}>
      {body.length > 0 ? (
        <p className="max-w-[34ch] text-base leading-relaxed whitespace-pre-line wrap-anywhere text-pretty" style={{ ...DAK_FONTS.sans, color: "var(--dg-ink)" }}>
          {body}
        </p>
      ) : null}
    </PaperCard>
  );
}
