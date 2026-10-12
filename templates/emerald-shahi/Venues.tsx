"use client";

import { useState, type ReactElement } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { directionsUrl, readableAddress } from "@/lib/cardFormat";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import {
  STAGE_ART,
  emeraldCopy,
  stageFor,
  type EmeraldFonts,
  type Stage,
} from "@/templates/emerald-shahi/shared";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

const hasVenue = (entry: TimelineEntry): boolean =>
  entry.venueName.trim().length > 0 || entry.venueAddress.trim().length > 0;

/** A venue's name, its address and the way to it. */
function VenueWords({
  entry,
  language,
  fonts,
}: {
  entry: TimelineEntry;
  language: CardLanguage;
  fonts: EmeraldFonts;
}): ReactElement {
  const name = entry.venueName.trim();
  const address = readableAddress(entry.venueAddress);
  /* The card's own link: the host's pin where they gave one, a search for the place otherwise. */
  const map = directionsUrl(entry.venueName, entry.venueAddress, entry.mapsLink);

  return (
    <>
      {name.length > 0 ? (
        <p
          className={`${styles.caps} max-w-full wrap-anywhere text-balance`}
          style={{ ...fonts.heading, fontSize: "calc(0.9 * var(--es))", lineHeight: 1.7 }}
        >
          {name}
        </p>
      ) : null}
      {address.length > 0 ? (
        <p
          className="max-w-[30ch] text-[calc(0.86*var(--es))] leading-snug wrap-anywhere text-balance"
          style={{ ...fonts.body, color: "var(--es-ivory)" }}
        >
          {address}
        </p>
      ) : null}
      {map !== null ? (
        <a
          href={map}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.goldButton} mt-1`}
          style={fonts.body}
        >
          {emeraldCopy(language).viewOnMap}
        </a>
      ) : null}
    </>
  );
}

/**
 * Where each function is held: a row of tabs, one a function, and under them
 * the stage for the open one, its venue in spaced capitals and "View on map".
 *
 * THE STAGE IS CHOSEN BY THE FUNCTION'S NAME (see stageFor): the marigold one
 * for a haldi or a mehndi, the lit one for a sangeet, a reception or a walima,
 * the ivory one for anything else. The pictures are stacked and the open tab's
 * is the one shown; changing tab crossfades them. A picture is only loaded
 * once a tab that uses it has been opened, so a guest who never leaves the
 * first tab downloads one stage and not three.
 *
 * The tab row scrolls sideways inside itself when there are more functions
 * than fit, and is left out altogether when there is one.
 *
 * On paper there is nothing to tap: every venue is printed, one under
 * another, without the pictures.
 */
export default function EmeraldShahiVenues({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: EmeraldFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const still = useCardStill();
  const entries = timelineEntries(draft, language).filter(hasVenue);
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<readonly Stage[]>([]);

  if (entries.length === 0) {
    return null;
  }

  const open = entries.find((entry) => entry.id === openId) ?? entries[0];
  const openStage = stageFor(open.label);
  /* The stages a tab has shown so far, the open one always among them. */
  const stages = seen.includes(openStage) ? seen : [...seen, openStage];
  const copy = emeraldCopy(language);

  const select = (entry: TimelineEntry): void => {
    const stage = stageFor(entry.label);

    setOpenId(entry.id);
    setSeen((previous) =>
      previous.includes(stage) ? previous : [...previous, stage],
    );
  };

  return (
    <section
      ref={ref}
      className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-[calc(1.2*var(--es))] py-[calc(3.5*var(--es))] text-center"
    >
      <Slide as="h2" entered={entered} from="left" className="px-5">
        <span className={styles.caps} style={fonts.heading}>
          {copy.venues}
        </span>
      </Slide>

      {still ? (
        <div className="flex w-full flex-col items-center gap-[calc(1.4*var(--es))] px-5">
          {entries.map((entry) => (
            <div key={entry.id} className="flex w-full flex-col items-center gap-1">
              <p
                className="text-[calc(1.5*var(--es))]"
                style={{ ...fonts.names, color: "var(--es-gold-bright)" }}
              >
                {entry.label.trim()}
              </p>
              <VenueWords entry={entry} language={language} fonts={fonts} />
            </div>
          ))}
        </div>
      ) : (
        <>
          {entries.length > 1 ? (
            <Slide entered={entered} from="right" order={1} className="w-full">
              <div
                role="tablist"
                aria-label={copy.venues}
                className="lifafa-no-scrollbar flex w-full gap-2 overflow-x-auto px-5"
              >
                {entries.map((entry) => {
                  const active = entry.id === open.id;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => select(entry)}
                      className={`${styles.tab} ${active ? styles.tabActive : ""} text-[calc(0.84*var(--es))] font-medium focus-visible:outline-2 focus-visible:outline-offset-2`}
                      style={{ ...fonts.body, outlineColor: "var(--es-gold)" }}
                    >
                      {entry.label.trim()}
                    </button>
                  );
                })}
              </div>
            </Slide>
          ) : null}

          <Slide
            entered={entered}
            from="left"
            order={2}
            className="relative aspect-square w-[min(82%,20rem)]"
          >
            {stages.map((stage) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={stage}
                src={STAGE_ART[stage]}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className={`${styles.stage} ${stage === openStage ? styles.stageShown : ""}`}
              />
            ))}
          </Slide>

          <Slide
            entered={entered}
            from="right"
            order={3}
            className="flex w-full flex-col items-center gap-[calc(0.6*var(--es))] px-5"
            /* Announced when the tab changes, since the words under the tabs are what changed. */
          >
            <div
              role="tabpanel"
              aria-live="polite"
              className="flex w-full flex-col items-center gap-[calc(0.6*var(--es))]"
            >
              <VenueWords entry={open} language={language} fonts={fonts} />
            </div>
          </Slide>
        </>
      )}
    </section>
  );
}
