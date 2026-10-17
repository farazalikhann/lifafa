import type { CSSProperties, ReactElement, ReactNode } from "react";
import { formatWhen } from "@/lib/cardFormat";
import { timelineEntries } from "@/lib/cardSections";
import { ART } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import GulabPage from "@/templates/gulab-mahal/Page";
import { gulabCopy, type GulabFonts } from "@/templates/gulab-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * Pages 3 to 7 as they stand for now: each page's place in the stack, its
 * heading and the picture it will be drawn on, with the little it says
 * already. Their own drawings replace these one by one; the paging, the
 * entrances and the preloading are already theirs.
 */

export function GulabSheet({
  title,
  art,
  fonts,
  children,
}: {
  title: string;
  art?: string;
  fonts: GulabFonts;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className={`${styles.sheet} ${styles.rise}`}>
      <h2
        className={styles.script}
        style={{ ...fonts.names, fontSize: "2.25rem", lineHeight: 1.3 }}
      >
        {title}
      </h2>
      <span aria-hidden="true" className={styles.divider} style={{ fontSize: "1rem" }}>
        <span className={styles.dividerMark} />
      </span>
      {art !== undefined ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={`${styles.sheetArt} ${styles.lineUp}`}
          style={{ "--gm-delay": "350ms" } as CSSProperties}
        />
      ) : null}
      {children !== undefined ? (
        <div
          className={`${styles.lineUp} flex flex-col items-center gap-2 text-[0.95rem] leading-relaxed`}
          style={{ ...fonts.body, "--gm-delay": "450ms" } as CSSProperties}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function GulabDatePage({
  draft,
  language,
  dateHidden,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  dateHidden: boolean;
  fonts: GulabFonts;
}): ReactElement {
  const title = gulabCopy(language).pages.date;

  return (
    <GulabPage label={title} images={[ART.scrollRoll]}>
      <GulabSheet title={title} art={ART.scrollRoll} fonts={fonts}>
        {dateHidden ? null : <p>{formatWhen(draft.eventDate, draft.eventTime, language)}</p>}
      </GulabSheet>
    </GulabPage>
  );
}

export function GulabCouplePage({
  language,
  fonts,
}: {
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement {
  const title = gulabCopy(language).pages.couple;

  return (
    <GulabPage label={title} images={[ART.coupleTag]}>
      <GulabSheet title={title} art={ART.coupleTag} fonts={fonts} />
    </GulabPage>
  );
}

export function GulabFunctionsPage({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement {
  const title = gulabCopy(language).pages.functions;
  const entries = timelineEntries(draft, language);

  return (
    <GulabPage label={title} images={[ART.eventCard]}>
      <GulabSheet title={title} art={ART.eventCard} fonts={fonts}>
        {entries.map((entry, index) => (
          <p key={index}>{entry.label}</p>
        ))}
      </GulabSheet>
    </GulabPage>
  );
}

export function GulabVenuePage({
  draft,
  language,
  fonts,
  children,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: GulabFonts;
  /** The weather over the day, where the card has it. */
  children?: ReactNode;
}): ReactElement {
  const title = gulabCopy(language).pages.venue;

  return (
    <GulabPage label={title}>
      <GulabSheet title={title} fonts={fonts}>
        <p>{draft.venueName}</p>
        <p className="opacity-80">{draft.venueAddress}</p>
      </GulabSheet>
      {children}
    </GulabPage>
  );
}

export function GulabDetailsPage({
  language,
  fonts,
  children,
}: {
  language: CardLanguage;
  fonts: GulabFonts;
  children: ReactNode;
}): ReactElement {
  const title = gulabCopy(language).pages.details;

  return (
    <GulabPage label={title}>
      <GulabSheet title={title} fonts={fonts}>
        {children}
      </GulabSheet>
    </GulabPage>
  );
}
