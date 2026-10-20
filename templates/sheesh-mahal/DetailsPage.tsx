"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cardCopy } from "@/lib/cardLanguage";
import { telHref } from "@/lib/contacts";
import { DETAILS_GLINTS } from "@/templates/sheesh-mahal/art";
import Farmaan from "@/templates/sheesh-mahal/Farmaan";
import Glints from "@/templates/sheesh-mahal/Glints";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import { useRoomArt } from "@/templates/sheesh-mahal/picture";
import { usePageRest } from "@/templates/sheesh-mahal/rest";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { scriptLeading, sheeshCopy, whenIdle, type SheeshFonts } from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { CustomSection } from "@/types/customSection";
import type { EventContact } from "@/types/event";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** "Rohit (groom's brother)": the name, and the relation in its brackets where the host wrote one. */
function splitLabel(label: string): { name: string; relation: string | null } {
  const match = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(label);

  return match === null || match[1].length === 0
    ? { name: label, relation: null }
    : { name: match[1], relation: match[2].trim() };
}

/** A thin gold rule with its small diamond, between one group and the next. */
function Rule(): ReactElement {
  return (
    <span aria-hidden="true" className={styles.fmRule}>
      <span className={styles.ruleMark} />
    </span>
  );
}

/** A group on the paper: its heading in gold script, and what is under it. */
function Group({
  heading,
  fonts,
  language,
  children,
}: {
  heading: string;
  fonts: SheeshFonts;
  language: CardLanguage;
  children: ReactNode;
}): ReactElement {
  return (
    <section className={styles.dtGroup}>
      <h3 className={styles.fmHeading} style={{ ...fonts.names, lineHeight: scriptLeading(language) }}>
        {heading}
      </h3>
      {children}
    </section>
  );
}

/**
 * Page 7: the details, on a farmaan.
 *
 * The ground is the palace wall under a heavy wash of the night (a still
 * gradient), with a few slow glints down its edges. "Details" in small spaced
 * capitals at the top, and under it the farmaan, about 88% of the room's
 * width (Farmaan.tsx). On its paper, in deep indigo with gold script
 * headings and thin gold rules between them: who to ring (each name, their
 * relation where the host wrote one in brackets, and the number as a small
 * ivory satin pill that rings it), the host's own sections and their note.
 * The card decides what is here, by the same tests the shared card uses
 * (Card.tsx); with nothing to say, there is no page 7.
 *
 * THE FARMAAN UNROLLS when the page has come to rest (rest.ts), once: the
 * top rod stays, the paper and the bottom rod come down together, and the
 * words are uncovered from the top, in 1.1s. Under reduced motion it is open
 * from the start and fades in.
 *
 * LONGER THAN THE ROOM, the page is a flow page, as page 8 is: its room is
 * in the page and scrolls with it, so all of it can be read. Measured from
 * the farmaan's own height before the first paint, and again at an idle
 * moment if that changes (the fonts arriving); never while a page moves.
 */
export default function SheeshDetailsPage({
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
  fonts: SheeshFonts;
}): ReactElement {
  const art = useRoomArt();
  const copy = cardCopy(language);
  const own = sheeshCopy(language);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [flow, setFlow] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  usePageRest(rootRef, { onRest: () => setOpen(true) });

  const key = `${contacts.map((contact) => `${contact.label}|${contact.phone}`).join(",")}|${custom
    .map((section) => `${section.heading}|${section.body}`)
    .join(",")}|${note ?? ""}|${language}`;

  /* Whether it all fits in a room a screen tall, or the page must be taller. */
  useLayoutEffect(() => {
    const root = rootRef.current;
    const scroll = scrollRef.current;
    const page = root?.closest<HTMLElement>("[data-sm-page]") ?? null;

    if (root === null || scroll === null || page === null) {
      return;
    }

    let cancelIdle: (() => void) | null = null;
    const measure = (): void => {
      /* A page set aside undrawn while far away (Pager.tsx) measures nothing: left as it is until it is drawn. */
      if (scroll.offsetHeight === 0) {
        return;
      }

      const style = getComputedStyle(page);
      const screen = page.classList.contains(styles.pageFlow) ? parseFloat(style.minHeight) : page.clientHeight;
      const foot = parseFloat(getComputedStyle(root).paddingBottom) || 0;
      const needed = scroll.offsetTop + scroll.offsetHeight + foot;

      setFlow(screen > 0 && needed > screen + 1);
    };
    const remeasure = (): void => {
      cancelIdle?.();
      cancelIdle = whenIdle(measure);
    };

    measure();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(remeasure) : null;
    observer?.observe(scroll);
    void document.fonts?.ready.then(remeasure);

    return () => {
      cancelIdle?.();
      observer?.disconnect();
    };
  }, [key]);

  const groups: ReactElement[] = [];

  if (contacts.length > 0) {
    groups.push(
      <Group key="contacts" heading={copy.contact.heading} fonts={fonts} language={language}>
        <ul className={styles.dtContacts}>
          {contacts.map((contact) => {
            const href = telHref(contact.phone);
            const { name, relation } = splitLabel(contact.label);

            return (
              <li key={contact.id} className={styles.dtContact}>
                {name.length > 0 ? (
                  <span className={styles.dtName} style={fonts.heading}>
                    {name}
                  </span>
                ) : null}
                {relation !== null ? (
                  <span className={styles.dtRelation} style={fonts.body}>
                    {relation}
                  </span>
                ) : null}
                {href !== null ? (
                  <a
                    href={href}
                    className={styles.dtCall}
                    aria-label={`${copy.contact.call} ${contact.label} ${contact.phone}`.replace(/\s+/g, " ").trim()}
                    style={fonts.heading}
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
                  <span style={fonts.heading}>{contact.phone}</span>
                )}
              </li>
            );
          })}
        </ul>
      </Group>,
    );
  }

  for (const section of custom) {
    groups.push(
      <Group key={section.id} heading={section.heading.trim()} fonts={fonts} language={language}>
        {section.body.trim().length > 0 ? (
          <p className={styles.dtText} style={fonts.body}>
            {section.body.trim()}
          </p>
        ) : null}
      </Group>,
    );
  }

  if (note !== null) {
    groups.push(
      <Group key="note" heading={own.noteHeading} fonts={fonts} language={language}>
        <p className={`${styles.dtText} ${styles.dtNote}`} style={fonts.body}>
          {note}
        </p>
      </Group>,
    );
  }

  return (
    <SheeshPage
      label={own.pages.details}
      images={art === null ? [] : [art.wall, art.farmaan]}
      flow={flow}
      className={styles.detailsPage}
      ground={
        <div aria-hidden="true" className={styles.dtGround}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art?.wall} alt="" loading="lazy" decoding="async" draggable={false} className={styles.dtWall} />
        </div>
      }
      overlay={<Glints glints={DETAILS_GLINTS} listen followPage className={styles.glintsSlow} />}
    >
      <div
        ref={rootRef}
        className={`${styles.details} ${flow ? styles.detailsFlow : ""} ${open || reducedMotion ? styles.detailsIn : ""}`}
      >
        <h2 className={`${styles.dtHeading} ${styles.caps}`} style={fonts.heading}>
          {own.pages.details}
        </h2>
        <div ref={scrollRef} className={styles.dtScroll} style={{ "--fm-wide": "88cqw" } as CSSProperties}>
          <Farmaan open={open || reducedMotion}>
            {groups.map((group, index) => (
              <div key={group.key ?? index} className={styles.dtPart}>
                {index > 0 ? <Rule /> : null}
                {group}
              </div>
            ))}
          </Farmaan>
        </div>
      </div>
    </SheeshPage>
  );
}
