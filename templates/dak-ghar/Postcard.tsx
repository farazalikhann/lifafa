"use client";

import type { ReactElement } from "react";
import { directionsUrl, readableAddress } from "@/lib/cardFormat";
import { timelineEntries } from "@/lib/cardSections";
import { venueCity } from "@/lib/shareMessage";
import { ART } from "@/templates/dak-ghar/art";
import { PageHeading } from "@/templates/dak-ghar/Paper";
import Postmark, { postmarkDate } from "@/templates/dak-ghar/Postmark";
import styles from "@/templates/dak-ghar/dak.module.css";
import { DAK_FONTS, caps, dakCopy, leading } from "@/templates/dak-ghar/shared";
import { useReveal } from "@/templates/dak-ghar/useReveal";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

interface Place {
  name: string;
  address: string;
  map: string | null;
  date: string;
  labels: string[];
}

/** One venue: the postcard with its name on the address lines, then the address and the way there. */
function PostcardOf({ place, showLabels, language }: { place: Place; showLabels: boolean; language: CardLanguage }): ReactElement {
  const { ref, shown } = useReveal<HTMLDivElement>();
  const city = venueCity(place.address) ?? place.name;

  return (
    <div ref={ref} className={`${styles.reveal} ${shown ? styles.shown : ""} flex w-full flex-col items-center gap-4 text-center`}>
      {showLabels ? (
        <p className="text-sm" style={{ ...DAK_FONTS.sans, ...caps(language), fontWeight: 700, color: "var(--dg-red)" }}>
          {place.labels.join(" · ")}
        </p>
      ) : null}
      <div className={styles.postcard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.postcard} alt="" width={780} height={504} loading="lazy" decoding="async" draggable={false} className={styles.postcardArt} />
        <Postmark city={city} date={postmarkDate(place.date)} language={language} className={styles.postcardMark} />
        {place.name.length > 0 ? (
          <p className={`${styles.postcardName} wrap-anywhere`} style={{ ...DAK_FONTS.serif, lineHeight: leading(language, 1.2) }}>
            {place.name}
          </p>
        ) : null}
      </div>
      {place.address.length > 0 ? (
        <p className="max-w-[30ch] text-base wrap-anywhere text-balance" style={{ ...DAK_FONTS.sans, color: "var(--dg-ink)", lineHeight: leading(language, 1.5) }}>
          {place.address}
        </p>
      ) : null}
      {place.map !== null ? (
        <a href={place.map} target="_blank" rel="noopener noreferrer" className={styles.button} style={DAK_FONTS.sans}>
          {dakCopy(language).seeRoute}
        </a>
      ) : null}
    </div>
  );
}

/**
 * The venue, on a postcard of a lit courtyard: its name written on the card's
 * address lines, a postmark on its stamp box, and under it the address and
 * "See the route" (the card's own directions link). Every place the
 * functions are held, once each, with what is held there when there is more
 * than one.
 */
export default function DakGharPostcard({ draft, language }: { draft: EventDraft; language: CardLanguage }): ReactElement | null {
  const places = new Map<string, Place>();

  for (const entry of timelineEntries(draft, language)) {
    const name = entry.venueName.trim();
    const address = readableAddress(entry.venueAddress);

    if (name.length === 0 && address.length === 0) {
      continue;
    }

    const key = `${name.toLowerCase()}|${address.toLowerCase()}`;
    const place = places.get(key) ?? {
      name,
      address,
      map: directionsUrl(entry.venueName, entry.venueAddress, entry.mapsLink),
      date: entry.date,
      labels: [],
    };
    place.labels.push(entry.label.trim());
    places.set(key, place);
  }

  if (places.size === 0) {
    return null;
  }

  return (
    <section className={styles.page}>
      <div className="flex w-full max-w-[28rem] flex-col items-center gap-8">
        <PageHeading>{dakCopy(language).venue}</PageHeading>
        {[...places.values()].map((place) => (
          <PostcardOf key={`${place.name}|${place.address}`} place={place} showLabels={places.size > 1} language={language} />
        ))}
      </div>
    </section>
  );
}
