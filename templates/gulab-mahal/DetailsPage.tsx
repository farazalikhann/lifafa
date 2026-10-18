import type { CSSProperties, ReactElement, ReactNode } from "react";
import { cardCopy } from "@/lib/cardLanguage";
import { telHref } from "@/lib/contacts";
import { ART } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import GulabPage from "@/templates/gulab-mahal/Page";
import { gulabCopy, scriptLeading, type GulabFonts } from "@/templates/gulab-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { EventContact } from "@/types/event";
import type { CustomSection } from "@/types/customSection";

/**
 * One card of letter paper: a script heading and what is under it.
 *
 * The paper is drawn round its words rather than the words squeezed onto a
 * picture of fixed size: its picture is cut into nine (`border-image`), the
 * roses of its top left corner and its rose-gold border kept as they are and
 * its plain middle stretched to the words, so a long note makes a longer
 * sheet and never runs past its edges. Its soft shadow is the paper's own,
 * stretched with it.
 */
function Paper({
  heading,
  order,
  fonts,
  language,
  children,
}: {
  heading: string;
  order: number;
  fonts: GulabFonts;
  language: CardLanguage;
  children: ReactNode;
}): ReactElement {
  return (
    <article
      className={`${styles.paperCard} ${styles.rise}`}
      style={{ "--gm-delay": `${order * 140}ms`, "--paper-tilt": `${order % 2 === 0 ? -1.2 : 1.1}deg` } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ART.shadow.letter} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className={styles.paperShadow2} />
      <div className={styles.paperSheet}>
        <h2
          className={`${styles.script} ${styles.paperHeading}`}
          style={{ ...fonts.names, lineHeight: scriptLeading(language) }}
        >
          {heading}
        </h2>
        <div className={styles.paperBody} style={fonts.body}>
          {children}
        </div>
      </div>
    </article>
  );
}

/**
 * Page 7: the details. Who to ring, the host's own sections and their note,
 * each on its own card of letter paper, one under another, a little askew,
 * in wine with script headings. A number is a link that rings it.
 *
 * Only drawn when it has something to say (Card.tsx decides, by the same
 * tests the shared card uses). Longer than a screen, the page is simply
 * taller: the guest scrolls on through it as through any page, and the swipe
 * after its foot lands on the next page, as the snapping allows a page taller
 * than the screen to be read all the way down.
 */
export default function GulabDetailsPage({
  contacts,
  custom,
  note,
  language,
  fonts,
}: {
  contacts: readonly EventContact[];
  custom: readonly CustomSection[];
  note: string | null;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement {
  const copy = cardCopy(language);
  const own = gulabCopy(language);
  let order = 0;

  return (
    <GulabPage label={own.pages.details} images={[ART.letterPaper, ART.shadow.letter]} variant={5} className={styles.detailsPage}>
      {contacts.length > 0 ? (
        <Paper heading={copy.contact.heading} order={order++} fonts={fonts} language={language}>
          <ul className={styles.contactList}>
            {contacts.map((contact) => {
              const href = telHref(contact.phone);

              return (
                <li key={contact.id} className={styles.contactRow}>
                  {contact.label.length > 0 ? <span className="wrap-anywhere">{contact.label}</span> : null}
                  {href !== null ? (
                    <a
                      href={href}
                      className={`${styles.satin} ${styles.contactCall}`}
                      aria-label={`${copy.contact.call} ${contact.label} ${contact.phone}`.replace(/\s+/g, " ").trim()}
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                        <path
                          d="M6.2 2.8 4.1 3.3C3.4 3.5 3 4.2 3.1 4.9c.7 6.1 5.8 11.2 11.9 11.9.7.1 1.4-.3 1.6-1l.5-2.1c.2-.6-.1-1.2-.7-1.5l-2.5-1.1c-.5-.2-1.1-.1-1.5.3l-.9 1c-1.9-1-3.4-2.5-4.4-4.4l1-.9c.4-.4.5-1 .3-1.5L7.7 3.5c-.3-.6-.9-.9-1.5-.7Z"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span>{contact.phone}</span>
                    </a>
                  ) : (
                    <span>{contact.phone}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </Paper>
      ) : null}

      {custom.map((section) => (
        <Paper key={section.id} heading={section.heading.trim()} order={order++} fonts={fonts} language={language}>
          {section.body.trim().length > 0 ? (
            <p className={`${styles.paperText} wrap-anywhere`}>{section.body.trim()}</p>
          ) : null}
        </Paper>
      ))}

      {note !== null ? (
        <Paper heading={own.noteHeading} order={order++} fonts={fonts} language={language}>
          <p className={`${styles.paperText} ${styles.paperNote} wrap-anywhere`} style={fonts.italic(language)}>
            {note}
          </p>
        </Paper>
      ) : null}
    </GulabPage>
  );
}
