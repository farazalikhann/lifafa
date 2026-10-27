import type { CSSProperties, ReactElement, ReactNode } from "react";
import {
  calendarPageText,
  coverNameLine,
  formatWhen,
  hasEventTime,
  readableAddress,
  resolveCoverNames,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import {
  coupleOf,
  familyBlocks,
  hasCustomContent,
  hasFamily,
  hasMessage,
  timelineEntries,
} from "@/lib/cardSections";
import { contactsOf, hasContacts } from "@/lib/contacts";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, caps, dakCopy, leading } from "@/templates/dak-ghar/shared";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";

function Section({ heading, language, children }: { heading: string; language: CardLanguage; children: ReactNode }): ReactElement {
  return (
    <section className={styles.printSection}>
      <h2 className={styles.printHeading} style={{ ...DAK_FONTS.sans, ...caps(language) }}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

/**
 * The printed copy: the card on cream paper, kind to ink.
 *
 * NO PICTURES. No courtyard, no letter paper, no stamps, postcard or clock,
 * and nothing that moves: the words alone, in sepia with the post box's red
 * for small capitals and rules, in the card's two faces (Cormorant Garamond
 * and Manrope, Noto Serif Devanagari behind both). The functions and the
 * venues are printed whole.
 *
 * ONE SHEET'S SECTIONS. The printed copy hands each sheet only its own
 * sections (lib/printCard.ts), and they are set here in the host's order,
 * as the card sets them. The countdown is never printed. The column carries
 * the name the print fit measures and zooms to its sheet.
 */
export default function DakGharPrintCopy({
  draft,
  config,
  language,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
}): ReactElement {
  const copy = cardCopy(language);
  const own = dakCopy(language);
  const serif = (size: string, latin = 1.15): CSSProperties => ({ ...DAK_FONTS.serif, fontSize: size, lineHeight: leading(language, latin) });
  const entries = timelineEntries(draft, language);

  const part = (block: CardBlock): ReactElement | null => {
    if (block.kind === "custom") {
      if (!hasCustomContent(block.section)) {
        return null;
      }

      return (
        <Section key={block.section.id} heading={block.section.heading.trim()} language={language}>
          {block.section.body.trim().length > 0 ? (
            <p className={`${styles.printSmall} ${styles.printPre}`} style={DAK_FONTS.sans}>
              {block.section.body.trim()}
            </p>
          ) : null}
        </Section>
      );
    }

    if (!block.enabled) {
      return null;
    }

    switch (block.id) {
      case "cover": {
        const names = resolveCoverNames(draft, config.occasionId, language);
        const title = draft.eventTitle.trim();
        const when = formatWhen(draft.eventDate, draft.eventTime, language);

        return (
          <section key="names" className={styles.printSection}>
            <p className={styles.printSmall} style={DAK_FONTS.sans}>
              {own.invitationLine}
            </p>
            {title.length > 0 ? (
              <p className={styles.printHeading} style={{ ...DAK_FONTS.sans, ...caps(language) }}>
                {title}
              </p>
            ) : null}
            {names.kind === "pair" ? (
              <>
                <p className={styles.printNames} style={serif("2.6rem", 1.1)}>
                  {names.first}
                </p>
                <p className={styles.printAnd} style={serif("1.5rem")}>
                  &amp;
                </p>
                <p className={styles.printNames} style={serif("2.6rem", 1.1)}>
                  {names.second}
                </p>
              </>
            ) : (
              <p className={styles.printNames} style={serif("2.6rem", 1.1)}>
                {coverNameLine(names)}
              </p>
            )}
            {when !== null ? (
              <p className={styles.printText} style={serif("1.25rem", 1.35)}>
                {when}
              </p>
            ) : null}
          </section>
        );
      }

      case "details": {
        const page = calendarPageText(draft.eventDate, draft.eventTime, language);

        return page === null ? null : (
          <Section key="date" heading={copy.calendar.heading} language={language}>
            <p className={styles.printSmall} style={{ ...DAK_FONTS.sans, ...caps(language) }}>
              {page.weekday}
            </p>
            <p className={styles.printDay} style={serif("3rem", 1)}>
              {page.day}
            </p>
            <p className={styles.printText} style={serif("1.15rem")}>
              {page.month} {page.year}
            </p>
            {page.time !== null && hasEventTime(draft.eventTime) ? (
              <p className={styles.printSmall} style={DAK_FONTS.sans}>
                {page.time}
              </p>
            ) : null}
          </Section>
        );
      }

      case "family": {
        if (!hasFamily(draft, config.occasionId)) {
          return null;
        }

        const people = coupleOf(draft, config.occasionId) ?? familyBlocks(draft);

        return (
          <Section key="couple" heading={copy.family.heading} language={language}>
            {people.map((person) => (
              <div key={person.key} className={styles.printPerson}>
                {person.name !== null ? (
                  <p className={styles.printPersonName} style={serif("1.8rem")}>
                    {person.name}
                  </p>
                ) : null}
                {person.parents !== null ? (
                  <p className={styles.printSmall} style={DAK_FONTS.sans}>
                    {person.key === "one" ? copy.family.sonOf : copy.family.daughterOf} {person.parents}
                  </p>
                ) : null}
                {person.city !== null ? (
                  <p className={styles.printSmall} style={DAK_FONTS.sans}>
                    {person.city}
                  </p>
                ) : null}
              </div>
            ))}
          </Section>
        );
      }

      case "timeline":
        return entries.length === 0 ? null : (
          <Section key="functions" heading={own.functions} language={language}>
            {entries.map((entry) => {
              const page = calendarPageText(entry.date, entry.time, language);

              return (
                <div key={entry.id} className={styles.printPerson}>
                  <p className={styles.printPersonName} style={serif("1.6rem")}>
                    {entry.label.trim()}
                  </p>
                  {page !== null ? (
                    <p className={styles.printSmall} style={DAK_FONTS.sans}>
                      {page.weekday}, {page.day} {page.month} {page.year}
                      {page.time !== null && hasEventTime(entry.time) ? `, ${page.time}` : ""}
                    </p>
                  ) : null}
                  {entry.venueName.trim().length > 0 ? (
                    <p className={styles.printSmall} style={DAK_FONTS.sans}>
                      {entry.venueName.trim()}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </Section>
        );

      case "venue": {
        /* Every place the functions are held, once each, with what is held there. */
        const places = new Map<string, { name: string; address: string; labels: string[] }>();

        for (const entry of entries) {
          const name = entry.venueName.trim();
          const address = readableAddress(entry.venueAddress);

          if (name.length === 0 && address.length === 0) {
            continue;
          }

          const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
          const place = places.get(key) ?? { name, address, labels: [] };
          place.labels.push(entry.label.trim());
          places.set(key, place);
        }

        return places.size === 0 ? null : (
          <Section key="venue" heading={own.venue} language={language}>
            {[...places.values()].map((place) => (
              <div key={`${place.name}|${place.address}`} className={styles.printPerson}>
                {places.size > 1 ? (
                  <p className={styles.printLabel} style={{ ...DAK_FONTS.sans, ...caps(language) }}>
                    {place.labels.join(" · ")}
                  </p>
                ) : null}
                {place.name.length > 0 ? (
                  <p className={styles.printText} style={serif("1.3rem")}>
                    {place.name}
                  </p>
                ) : null}
                {place.address.length > 0 ? (
                  <p className={styles.printSmall} style={DAK_FONTS.sans}>
                    {place.address}
                  </p>
                ) : null}
              </div>
            ))}
          </Section>
        );
      }

      case "contact":
        return !hasContacts(draft) ? null : (
          <Section key="contacts" heading={copy.contact.heading} language={language}>
            {contactsOf(draft).map((contact) => (
              <p key={contact.id} className={styles.printText} style={DAK_FONTS.sans}>
                {contact.label.length > 0 ? `${contact.label}: ` : ""}
                <span dir="ltr">{contact.phone}</span>
              </p>
            ))}
          </Section>
        );

      case "message":
        return !hasMessage(draft) ? null : (
          <Section key="note" heading={own.telegram} language={language}>
            <p className={`${styles.printSmall} ${styles.printPre}`} style={DAK_FONTS.sans}>
              {draft.message.trim()}
            </p>
          </Section>
        );

      case "countdown":
        return null;
    }
  };

  const parts = config.blocks.map(part).filter((drawn): drawn is ReactElement => drawn !== null);

  return (
    <div lang={language} className={`${styles.root} ${styles.printCopy}`}>
      <div className={`lifafa-card-content z-10 ${styles.printColumn}`}>
        {parts.map((drawn, index) => (
          <div key={drawn.key ?? index} className={styles.printPart}>
            {index > 0 ? <span aria-hidden="true" className={styles.printRule} /> : null}
            {drawn}
          </div>
        ))}
      </div>
    </div>
  );
}
