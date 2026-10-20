"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { directionsUrl, readableAddress } from "@/lib/cardFormat";
import { timelineEntries, type TimelineEntry } from "@/lib/cardSections";
import {
  VENUE_ASPECT,
  VENUE_DIYAS,
  VENUE_SHIMMER,
  VENUE_SKY,
  VENUE_STARS,
} from "@/templates/sheesh-mahal/art";
import { useCoupleFit, type CoupleFit } from "@/templates/sheesh-mahal/fit";
import Foil from "@/templates/sheesh-mahal/Foil";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import { useRoomArt } from "@/templates/sheesh-mahal/picture";
import { usePageRest } from "@/templates/sheesh-mahal/rest";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { scriptLeading, sheeshCopy, type SheeshFonts } from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/* A tab's switch: the words out, and the new ones in, about 250ms in all. */
const SWITCH_OUT_MS = 110;
const SWITCH_IN_MS = 150;

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

const hasVenue = (entry: TimelineEntry): boolean =>
  entry.venueName.trim().length > 0 || entry.venueAddress.trim().length > 0;

/* Two functions at the same place are one venue: by its name and address, as a guest would read them (as Gulab Mahal). */
const placeOf = (entry: TimelineEntry): string =>
  `${entry.venueName.trim().toLowerCase()}|${readableAddress(entry.venueAddress).toLowerCase()}`;

/**
 * Page 6: the venue, a lake palace at night (venue-night.webp) covering the
 * room.
 *
 * In the sky, the top third, never over the palace (VENUE_SKY): a deep
 * indigo panel, a little see-through, with a thin antique gold border and
 * small gold corners, all drawn in CSS. In it, "The Venue" in small spaced
 * capitals, the place in gold foil script, its address in ivory, and the
 * card's own directions (`directionsUrl`: the host's pin where they gave one,
 * a search for the place otherwise) as View on map, an ivory satin pill with a
 * thin gold edge. The panel is as tall as its words up to the sky's foot; past
 * that its words are stepped down to fit (fit.ts) rather than the panel
 * growing over the palace.
 *
 * WHEN THE FUNCTIONS ARE IN DIFFERENT PLACES, a small satin tab for each
 * function above the panel, by its name, switching the words with a quick
 * crossfade; all in one place, no tabs. The list and the test are Gulab
 * Mahal's: the card's own `timelineEntries`, those with a venue.
 *
 * THE WATER LIVES: soft light rising and falling on the palace's reflection
 * (a few tall, narrow warm strips over its brightest columns, out of step),
 * the floating diyas flickering, and a few small stars twinkling in the sky
 * beside the panel. Opacity alone. They are drawn only once the page is at
 * rest (`data-sm-rest`), fading in, and are gone while it moves: drawn, even
 * held, they would be layers the next swipe has to make, and a swipe into
 * the page before this one paid for them. Still under reduced motion.
 * The diyas float at the picture's edges, which a phone's screen, taller than
 * the picture, crops: their light is where they are, seen where they are.
 *
 * Once the page has come to rest (rest.ts), once: the panel fades up and
 * rises 12px, then its lines come in one after another.
 */
export default function SheeshVenuePage({
  draft,
  language,
  fonts,
}: {
  draft: EventDraft;
  language: CardLanguage;
  fonts: SheeshFonts;
}): ReactElement | null {
  const art = useRoomArt();
  const own = sheeshCopy(language);
  const entries = timelineEntries(draft, language).filter(hasVenue);
  const tabbed = new Set(entries.map(placeOf)).size > 1;
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const parts = useRef<CoupleFit[]>([{ name: null, box: null, words: null }]);
  /* The words fading out for a switch, waiting for the new ones to fade in. */
  const leaving = useRef<Animation | null>(null);
  const switching = useRef(false);

  const open = entries.find((entry) => entry.id === openId) ?? entries[0];
  const name = open?.venueName.trim() ?? "";
  const address = open === undefined ? "" : readableAddress(open.venueAddress);
  const map = open === undefined ? null : directionsUrl(open.venueName, open.venueAddress, open.mapsLink);

  useCoupleFit(parts, `${open?.id ?? ""}|${name}|${address}|${map ?? ""}|${tabbed}|${language}`);

  usePageRest(rootRef, {
    onRest: () => rootRef.current?.setAttribute("data-vn-in", ""),
  });

  /* After a switch, once the new words are in and fitted (above): in again. */
  useLayoutEffect(() => {
    const out = leaving.current;
    const words = parts.current[0].words;

    if (out === null || words === null) {
      return;
    }

    leaving.current = null;
    const back = words.animate([{ opacity: 0 }, { opacity: 1 }], { duration: SWITCH_IN_MS, easing: "ease-out" });
    out.cancel();
    void back.finished.then(
      () => {
        switching.current = false;
      },
      () => {
        switching.current = false;
      },
    );
  }, [open?.id]);

  if (open === undefined) {
    return null;
  }

  const switchTo = (id: string): void => {
    const words = parts.current[0].words;

    if (id === open.id || switching.current) {
      return;
    }

    if (words === null) {
      setOpenId(id);
      return;
    }

    switching.current = true;
    const out = words.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SWITCH_OUT_MS, easing: "ease-in", fill: "forwards" });
    void out.finished.then(
      () => {
        leaving.current = out;
        setOpenId(id);
      },
      () => {
        switching.current = false;
      },
    );
  };

  return (
    <SheeshPage
      label={own.pages.venue}
      images={art === null ? [] : [art.venueNight]}
      ground={
        <div className={styles.vnScene} style={{ "--vn-aspect": String(VENUE_ASPECT) } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art?.venueNight} alt="" loading="lazy" decoding="async" draggable={false} className={styles.vnArt} />
          <div aria-hidden="true" className={styles.vnLights}>
            {VENUE_SHIMMER.map((strip) => (
              <span
                key={strip.x}
                className={styles.vnShimmer}
                style={
                  {
                    left: pc(strip.x - strip.width / 2),
                    width: pc(strip.width),
                    top: pc(strip.top),
                    bottom: pc(1 - strip.bottom),
                    "--vn-p": `${strip.period}s`,
                    "--vn-d": `${strip.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
            {VENUE_DIYAS.map((diya) => (
              <span
                key={diya.x}
                className={styles.vnDiya}
                style={
                  {
                    left: pc(diya.x - diya.size / 2),
                    top: `calc(${pc(diya.y)} - ${(diya.size * 50).toFixed(2)}cqw)`,
                    width: pc(diya.size),
                    "--vn-p": `${diya.period}s`,
                    "--vn-d": `${diya.delay}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </div>
      }
    >
      <div
        ref={rootRef}
        className={styles.venue}
        style={{ "--vn-sky": String(VENUE_SKY) } as CSSProperties}
      >
        <div aria-hidden="true" className={styles.vnStars}>
          {VENUE_STARS.map((star) => (
            <span
              key={`${star.x}-${star.y}`}
              className={styles.vnStar}
              style={
                {
                  left: pc(star.x),
                  top: pc(star.y),
                  "--vn-p": `${star.period}s`,
                  "--vn-d": `${star.delay}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>

        <div className={styles.vnSky}>
          {tabbed ? (
            <div role="tablist" aria-label={own.pages.venue} className={styles.vnTabs}>
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={entry.id === open.id}
                  className={styles.vnTab}
                  style={fonts.heading}
                  onClick={() => switchTo(entry.id)}
                >
                  {entry.label.trim()}
                </button>
              ))}
            </div>
          ) : null}

          <div className={styles.vnPanel}>
            <span aria-hidden="true" className={`${styles.vnCorner} ${styles.vnCornerTL}`} />
            <span aria-hidden="true" className={`${styles.vnCorner} ${styles.vnCornerTR}`} />
            <span aria-hidden="true" className={`${styles.vnCorner} ${styles.vnCornerBL}`} />
            <span aria-hidden="true" className={`${styles.vnCorner} ${styles.vnCornerBR}`} />
            <div
              ref={(element) => {
                parts.current[0].box = element;
              }}
              className={styles.vnBox}
            >
              <div
                ref={(element) => {
                  parts.current[0].words = element;
                }}
                role={tabbed ? "tabpanel" : undefined}
                className={styles.vnWords}
              >
                <h2 className={`${styles.vnHeading} ${styles.caps} ${styles.vnLine}`} style={{ ...fonts.heading, "--sm-delay": "260ms" } as CSSProperties}>
                  {own.pages.venue}
                </h2>
                {name.length > 0 ? (
                  <h3
                    className={`${styles.vnName} ${styles.vnLine}`}
                    style={{ ...fonts.names, lineHeight: scriptLeading(language), "--sm-delay": "400ms" } as CSSProperties}
                  >
                    <Foil text={name} />
                  </h3>
                ) : null}
                {address.length > 0 ? (
                  <p className={`${styles.vnAddress} ${styles.vnLine}`} style={{ ...fonts.body, "--sm-delay": "540ms" } as CSSProperties}>
                    {address}
                  </p>
                ) : null}
                {map !== null ? (
                  <p className={`${styles.vnMapLine} ${styles.vnLine}`} style={{ "--sm-delay": "680ms" } as CSSProperties}>
                    <a href={map} target="_blank" rel="noopener noreferrer" className={styles.vnMap} style={fonts.heading}>
                      {own.viewOnMap}
                    </a>
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SheeshPage>
  );
}
