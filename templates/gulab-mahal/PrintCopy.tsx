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
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { gulabCopy, scriptLeading, type GulabFonts } from "@/templates/gulab-mahal/shared";
import type { CardConfig, CardLanguage, CardSectionId } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** A thin rose-gold rule with its small diamond, between one section and the next. */
function Rule(): ReactElement {
  return (
    <span aria-hidden="true" className={styles.divider} style={{ fontSize: "0.9rem" }}>
      <span className={styles.dividerMark} />
    </span>
  );
}

function Section({ heading, fonts, children }: { heading: string; fonts: GulabFonts; children: ReactNode }): ReactElement {
  return (
    <section className={styles.printSection}>
      <h2 className={`${styles.caps} ${styles.printHeading}`} style={fonts.heading}>
        {heading}
      </h2>
      {children}
    </section>
  );
}

/**
 * The printed copy: the card on ivory paper, kind to ink.
 *
 * NO PICTURES. No velvet, no cameo, no scroll, no tags, no cards, no petals
 * and nothing that moves: the words alone, in wine with rose-gold small
 * capitals and rules, in the card's own faces, as a page of a letter would
 * set them. The pages that are a stack or tabs on the phone (the functions,
 * the venues) are printed whole.
 *
 * ONE SHEET'S SECTIONS. The printed copy gives each sheet only its own
 * sections (lib/printCard.ts, in this template's own grouping: `printLayout`
 * in config.ts), and they are set here in the card's reading order: the
 * names, the date, the couple, the functions, the venue, who to ring, the
 * host's sections and their note. The column carries the name the print fit
 * measures and zooms to its sheet.
 */
export default function GulabPrintCopy({
  draft,
  config,
  language,
  fonts,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement {
  const copy = cardCopy(language);
  const own = gulabCopy(language);
  const has = (id: CardSectionId): boolean =>
    config.blocks.some((block) => block.kind !== "custom" && block.id === id && block.enabled);
  const script: CSSProperties = { ...fonts.names, lineHeight: scriptLeading(language) };
  const parts: ReactElement[] = [];

  if (has("cover")) {
    const names = resolveCoverNames(draft, config.occasionId, language);
    const title = draft.eventTitle.trim();
    const when = formatWhen(draft.eventDate, "", language);

    parts.push(
      <section key="names" className={styles.printSection}>
        {title.length > 0 ? (
          <p className={`${styles.caps} ${styles.printHeading}`} style={fonts.heading}>
            {title}
          </p>
        ) : null}
        <p className={styles.printLine} style={fonts.italic(language)}>
          {copy.coverInvite.line}
        </p>
        {names.kind === "pair" ? (
          <>
            <p className={styles.printNames} style={script}>
              {names.first}
            </p>
            <p className={styles.printAnd} style={fonts.names}>
              &amp;
            </p>
            <p className={styles.printNames} style={script}>
              {names.second}
            </p>
          </>
        ) : (
          <p className={styles.printNames} style={script}>
            {coverNameLine(names)}
          </p>
        )}
        {when !== null ? (
          <p className={styles.printText} style={fonts.heading}>
            {when}
          </p>
        ) : null}
      </section>,
    );
  }

  if (has("details")) {
    const page = calendarPageText(draft.eventDate, draft.eventTime, language);

    if (page !== null) {
      parts.push(
        <Section key="date" heading={copy.calendar.heading} fonts={fonts}>
          <p className={styles.printText} style={fonts.heading}>
            {page.weekday}
          </p>
          <p className={styles.printDay} style={script}>
            {page.day}
          </p>
          <p className={styles.printText} style={fonts.heading}>
            {page.month} {page.year}
          </p>
          {page.time !== null && hasEventTime(draft.eventTime) ? (
            <p className={styles.printSmall} style={fonts.body}>
              {page.time}
            </p>
          ) : null}
        </Section>,
      );
    }
  }

  if (has("family") && hasFamily(draft, config.occasionId)) {
    const people = coupleOf(draft, config.occasionId) ?? familyBlocks(draft);

    parts.push(
      <Section key="couple" heading={copy.family.heading} fonts={fonts}>
        {people.map((person) => (
          <div key={person.key} className={styles.printPerson}>
            {person.name !== null ? (
              <p className={styles.printPersonName} style={script}>
                {person.name}
              </p>
            ) : null}
            {person.parents !== null ? (
              <p className={styles.printSmall} style={fonts.body}>
                {person.key === "one" ? copy.family.sonOf : copy.family.daughterOf} {person.parents}
              </p>
            ) : null}
            {person.city !== null ? (
              <p className={styles.printSmall} style={fonts.italic(language)}>
                {person.city}
              </p>
            ) : null}
          </div>
        ))}
      </Section>,
    );
  }

  const entries = timelineEntries(draft, language);

  if (has("timeline") && entries.length > 0) {
    parts.push(
      <Section key="functions" heading={copy.timeline.heading} fonts={fonts}>
        {entries.map((entry, index) => {
          const page = calendarPageText(entry.date, entry.time, language);

          return (
            <div key={entry.id} className={styles.printPerson}>
              <p className={`${styles.caps} ${styles.printNumber}`} style={fonts.heading}>
                {own.number(index + 1)}
              </p>
              <p className={styles.printPersonName} style={script}>
                {entry.label.trim()}
              </p>
              {page !== null ? (
                <p className={styles.printSmall} style={fonts.heading}>
                  {page.weekday}, {page.day} {page.month} {page.year}
                  {page.time !== null && hasEventTime(entry.time) ? ` · ${page.time}` : ""}
                </p>
              ) : null}
              {entry.venueName.trim().length > 0 ? (
                <p className={styles.printSmall} style={fonts.italic(language)}>
                  {entry.venueName.trim()}
                </p>
              ) : null}
            </div>
          );
        })}
      </Section>,
    );
  }

  if (has("venue")) {
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

    if (places.size > 0) {
      parts.push(
        <Section key="venue" heading={own.venueHeading} fonts={fonts}>
          {[...places.values()].map((place) => (
            <div key={`${place.name}|${place.address}`} className={styles.printPerson}>
              {places.size > 1 ? (
                <p className={`${styles.caps} ${styles.printNumber}`} style={fonts.heading}>
                  {place.labels.join(" · ")}
                </p>
              ) : null}
              {place.name.length > 0 ? (
                <p className={styles.printText} style={fonts.heading}>
                  {place.name}
                </p>
              ) : null}
              {place.address.length > 0 ? (
                <p className={styles.printSmall} style={fonts.body}>
                  {place.address}
                </p>
              ) : null}
            </div>
          ))}
        </Section>,
      );
    }
  }

  if (has("contact") && hasContacts(draft)) {
    parts.push(
      <Section key="contacts" heading={copy.contact.heading} fonts={fonts}>
        {contactsOf(draft).map((contact) => (
          <p key={contact.id} className={styles.printText} style={fonts.body}>
            {contact.label.length > 0 ? `${contact.label}: ` : ""}
            {contact.phone}
          </p>
        ))}
      </Section>,
    );
  }

  for (const block of config.blocks) {
    if (block.kind === "custom" && hasCustomContent(block.section)) {
      parts.push(
        <Section key={block.section.id} heading={block.section.heading.trim()} fonts={fonts}>
          {block.section.body.trim().length > 0 ? (
            <p className={`${styles.printSmall} ${styles.paperText}`} style={fonts.body}>
              {block.section.body.trim()}
            </p>
          ) : null}
        </Section>,
      );
    }
  }

  if (has("message") && hasMessage(draft)) {
    parts.push(
      <Section key="note" heading={own.noteHeading} fonts={fonts}>
        <p className={`${styles.printSmall} ${styles.paperText}`} style={fonts.italic(language)}>
          {draft.message.trim()}
        </p>
      </Section>,
    );
  }

  return (
    <div lang={language} className={`${styles.palette} ${styles.printCopy}`}>
      <div className={`lifafa-card-content z-10 ${styles.printColumn}`}>
        {parts.map((part, index) => (
          <div key={part.key ?? index} className={styles.printPart}>
            {index > 0 ? <Rule /> : null}
            {part}
          </div>
        ))}
      </div>
    </div>
  );
}
