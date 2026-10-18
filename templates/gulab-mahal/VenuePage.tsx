"use client";

import { useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { directionsUrl, readableAddress } from "@/lib/cardFormat";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import { ART, ARCH_ASPECT, ARCH_PANEL, ARCH_WORDS } from "@/templates/gulab-mahal/art";
import { Shadow } from "@/templates/gulab-mahal/Decor";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import GulabPage from "@/templates/gulab-mahal/Page";
import { gulabCopy, scriptLeading, type GulabFonts } from "@/templates/gulab-mahal/shared";
import { useFitInside } from "@/templates/gulab-mahal/useFitInside";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

const pc = (share: number): string => `${(share * 100).toFixed(1)}%`;

const hasVenue = (entry: TimelineEntry): boolean =>
  entry.venueName.trim().length > 0 || entry.venueAddress.trim().length > 0;

/* Two functions at the same place are one venue: by its name and address, as a guest would read them. */
const placeOf = (entry: TimelineEntry): string =>
  `${entry.venueName.trim().toLowerCase()}|${readableAddress(entry.venueAddress).toLowerCase()}`;

/**
 * Page 6: the venue, inside a rose-gold garden arch.
 *
 * The arch is as large as the page's height allows, with room for the page
 * dots and the language switch, on a soft shadow of its own outline. Behind
 * its posts, filling its opening, a soft ivory panel, a little see-through,
 * so the arch's roses stay in front of it; on the panel, in wine, "Venue" in
 * the script, the place, its address, and View on map, a satin button to the
 * card's own directions (the host's pin where they gave one, a search for the
 * place otherwise). The words keep to the opening's clear part (ARCH_WORDS,
 * measured off the picture) and step down to fit it.
 *
 * WHEN THE FUNCTIONS ARE IN DIFFERENT PLACES, a satin tab for each above the
 * arch, by the function's name, switching the panel's words with a quick
 * fade. All in one place, one panel and no tabs.
 *
 * The entrance: the arch rises and settles, then the words come up in turn.
 * Under reduced motion they only fade.
 */
export default function GulabVenuePage({
  draft,
  language,
  fonts,
  children,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: GulabFonts;
  /** The weather over the day, where the card has it, under the arch. */
  children?: ReactNode;
}): ReactElement | null {
  const own = gulabCopy(language);
  const entries = timelineEntries(draft, language).filter(hasVenue);
  const places = new Set(entries.map(placeOf));
  const tabbed = places.size > 1;
  const [openId, setOpenId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);

  const open = entries.find((entry) => entry.id === openId) ?? entries[0];
  const name = open?.venueName.trim() ?? "";
  const address = open === undefined ? "" : readableAddress(open.venueAddress);
  const map = open === undefined ? null : directionsUrl(open.venueName, open.venueAddress, open.mapsLink);

  useFitInside(boxRef, wordsRef, `${open?.id ?? ""}|${name}|${address}|${language}`);

  if (open === undefined) {
    return null;
  }

  return (
    <GulabPage
      label={own.pages.venue}
      images={[ART.venueArch, ART.shadow.arch]}
      variant={4}
    >
      {tabbed ? (
        <div role="tablist" aria-label={own.pages.venue} className={`${styles.venueTabs} ${styles.lineUp}`}>
          {entries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={entry.id === open.id}
              className={`${styles.satin} ${styles.venueTab}`}
              data-on={entry.id === open.id ? "" : undefined}
              style={fonts.heading}
              onClick={() => setOpenId(entry.id)}
            >
              {entry.label.trim()}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={`${styles.arch} ${styles.rise}`}
        style={{ "--arch-aspect": String(ARCH_ASPECT), "--tabs-room": tabbed ? "1" : "0" } as CSSProperties}
      >
        <Shadow src={ART.shadow.arch} aspect={ARCH_ASPECT} drop={0.02} />

        {/* The panel, behind the arch's posts: a soft ivory, a little see-through. */}
        <span
          aria-hidden="true"
          className={styles.archPanel}
          style={{
            top: pc(ARCH_PANEL.top),
            bottom: pc(ARCH_PANEL.bottom),
            left: pc(ARCH_PANEL.side),
            right: pc(ARCH_PANEL.side),
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.venueArch}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={styles.archArt}
        />

        <div
          ref={boxRef}
          className={styles.archBox}
          style={{
            top: pc(ARCH_WORDS.top),
            bottom: pc(ARCH_WORDS.bottom),
            left: pc(ARCH_WORDS.side),
            right: pc(ARCH_WORDS.side),
          }}
        >
          {/* Keyed by the function, so a new tab's words come in with a quick fade. */}
          <div key={open.id} ref={wordsRef} role={tabbed ? "tabpanel" : undefined} className={styles.archWords}>
            <h2
              className={`${styles.script} ${styles.lineUp} ${styles.archHeading}`}
              style={{ ...fonts.names, lineHeight: scriptLeading(language), "--gm-delay": "450ms" } as CSSProperties}
            >
              {own.venueHeading}
            </h2>
            <span
              aria-hidden="true"
              className={`${styles.divider} ${styles.lineUp}`}
              style={{ fontSize: "0.8em", "--gm-delay": "560ms" } as CSSProperties}
            >
              <span className={styles.dividerMark} />
            </span>
            {name.length > 0 ? (
              <p
                className={`${styles.lineUp} ${styles.archName} wrap-anywhere text-balance`}
                style={{ ...fonts.heading, "--gm-delay": "670ms" } as CSSProperties}
              >
                {name}
              </p>
            ) : null}
            {address.length > 0 ? (
              <p
                className={`${styles.lineUp} ${styles.archAddress} wrap-anywhere text-balance`}
                style={{ ...fonts.body, "--gm-delay": "780ms" } as CSSProperties}
              >
                {address}
              </p>
            ) : null}
            {map !== null ? (
              <a
                href={map}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.satin} ${styles.archMap} ${styles.lineUp}`}
                style={{ ...fonts.heading, "--gm-delay": "890ms" } as CSSProperties}
              >
                {own.viewOnMap}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {children}
    </GulabPage>
  );
}
