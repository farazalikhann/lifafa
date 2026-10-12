"use client";

import type { ReactElement, ReactNode } from "react";
import { cardCopy } from "@/lib/cardLanguage";
import { contactsOf, telHref } from "@/lib/contacts";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import type { EmeraldFonts } from "@/templates/emerald-shahi/shared";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardLanguage } from "@/types/card";
import type { CustomSection } from "@/types/customSection";
import type { EventDraft } from "@/types/event";

/**
 * The card's three plain-spoken sections, each as an emerald card under a thin
 * gold line, the couple's cards without a figure: who to ring, a section the
 * host wrote themselves, and the host's note.
 *
 * What goes in each is read exactly as the shared card reads it: the numbers
 * through `contactsOf` and `telHref`, a host's section as its heading and its
 * body, the note as the draft's message. A section with nothing to say is
 * left out by the card before any of these is drawn.
 */

function Card({
  heading,
  fonts,
  from,
  children,
}: {
  heading: string | null;
  fonts: EmeraldFonts;
  from: "left" | "right";
  children: ReactNode;
}): ReactElement {
  const { ref, entered } = useEnter<HTMLElement>();

  return (
    <section
      ref={ref}
      className="mx-auto w-full max-w-[26rem] px-5 py-[calc(1.6*var(--es))]"
    >
      <Slide
        entered={entered}
        from={from}
        className={`${styles.panel} flex flex-col items-center gap-[calc(0.9*var(--es))] px-[calc(1.3*var(--es))] py-[calc(1.6*var(--es))] text-center`}
      >
        {heading !== null ? (
          <h2 className={`${styles.caps} max-w-full wrap-anywhere`} style={fonts.heading}>
            {heading}
          </h2>
        ) : null}
        {children}
      </Slide>
    </section>
  );
}

export function EmeraldShahiContacts({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: EmeraldFonts;
}): ReactElement | null {
  const contacts = contactsOf(draft);
  const copy = cardCopy(language).contact;

  if (contacts.length === 0) {
    return null;
  }

  return (
    <Card heading={copy.heading} fonts={fonts} from="left">
      <ul className="flex w-full flex-col items-center gap-[calc(0.8*var(--es))]">
        {contacts.map((contact) => (
          <li key={contact.id} className="flex max-w-full flex-col items-center">
            {contact.label.length > 0 ? (
              <span
                className="max-w-full text-[calc(0.9*var(--es))] wrap-anywhere"
                style={{ ...fonts.body, color: "var(--es-ivory)" }}
              >
                {contact.label}
              </span>
            ) : null}
            <a
              href={telHref(contact.phone) ?? undefined}
              aria-label={`${copy.call} ${contact.label} ${contact.phone}`.replace(
                /\s+/g,
                " ",
              )}
              dir="ltr"
              className="inline-flex min-h-11 items-center px-3 text-[calc(1.25*var(--es))] whitespace-nowrap underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                ...fonts.heading,
                color: "var(--es-gold-bright)",
                outlineColor: "var(--es-gold)",
              }}
            >
              {contact.phone}
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function EmeraldShahiCustom({
  section,
  fonts,
}: {
  section: CustomSection;
  fonts: EmeraldFonts;
}): ReactElement {
  const heading = section.heading.trim();
  const body = section.body.trim();

  return (
    <Card heading={heading.length > 0 ? heading : null} fonts={fonts} from="right">
      {body.length > 0 ? (
        <p
          className="max-w-[32ch] text-[calc(0.98*var(--es))] leading-relaxed whitespace-pre-line wrap-anywhere text-pretty"
          style={{ ...fonts.body, color: "var(--es-ivory)" }}
        >
          {body}
        </p>
      ) : null}
    </Card>
  );
}

export function EmeraldShahiNote({
  draft,
  fonts,
}: {
  draft: EventDraft;
  fonts: EmeraldFonts;
}): ReactElement {
  return (
    <Card heading={null} fonts={fonts} from="left">
      <p
        className="max-w-[32ch] text-[calc(1.02*var(--es))] leading-relaxed whitespace-pre-line italic wrap-anywhere text-pretty"
        style={{ ...fonts.body, color: "var(--es-ivory)" }}
      >
        {draft.message.trim()}
      </p>
    </Card>
  );
}
