"use client";

import type { ReactElement } from "react";
import { directionsUrl } from "@/lib/cardFormat";
import { ART } from "@/templates/shahi-darwaza/art";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { darwazaCopy, type DarwazaFonts } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The venue: a card with the lit palace on it, and under it the venue's
 * name, its address and "Open in Maps", which goes where the card's own
 * directions go (directionsUrl: the host's Maps link or pin first, then the
 * words).
 *
 * Left out when the host has named no venue and given no address. A rose on
 * the card's lower left corner, one of the card's three.
 */
export default function ShahiDarwazaVenue({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: DarwazaFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const name = draft.venueName.trim();
  const address = draft.venueAddress.trim();

  if (name.length === 0 && address.length === 0) {
    return null;
  }

  const maps = directionsUrl(draft.venueName, draft.venueAddress, draft.venueMapsLink);
  const copy = darwazaCopy(language);

  return (
    <section ref={ref} className={`${styles.section} ${entered ? styles.revealIn : ""}`}>
      <h2 className={`${styles.reveal} ${styles.heading}`} style={fonts.heading}>
        {copy.venue}
      </h2>

      <article className={`${styles.reveal} ${styles.venueCard}`} style={{ transitionDelay: "120ms" }}>
        <span aria-hidden="true" className={`${styles.rose} ${styles.roseBottomLeft}`} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.venuePalace}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className={styles.venuePicture}
        />
        <div className="relative flex flex-col items-center gap-2 px-5 pt-4 pb-6 text-center">
          {name.length > 0 ? (
            <h3 className="max-w-full text-[1.3rem] leading-snug wrap-anywhere text-balance" style={fonts.heading}>
              {name}
            </h3>
          ) : null}
          {address.length > 0 ? (
            <p
              className="max-w-full text-[0.9rem] leading-relaxed whitespace-pre-line wrap-anywhere text-pretty"
              style={{ ...fonts.body, color: "#6e3a3a" }}
            >
              {address}
            </p>
          ) : null}
          {maps !== null ? (
            <a
              href={maps}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mapsButton}
              style={fonts.heading}
            >
              {copy.openInMaps}
            </a>
          ) : null}
        </div>
      </article>
    </section>
  );
}
