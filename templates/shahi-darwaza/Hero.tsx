"use client";

import type { CSSProperties, ReactElement } from "react";
import { useShowPlaceholders } from "@/components/card/placeholders";
import { useCoverReady } from "@/hooks/useCoverOpen";
import { formatWhen, placeholderOpacity, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardTopGreeting, cardTopImage } from "@/lib/cardTopImage";
import { dateRevealOf } from "@/lib/royalScroll";
import { ART } from "@/templates/shahi-darwaza/art";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { scriptLeading, type DarwazaFonts } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The first screen: the courtyard inside the door, which the cover's film
 * ends on, with "You are invited", the names and the date over its sky.
 *
 * THE SAME PICTURE IN THE SAME FRAME AS THE FILM'S LAST. The courtyard is
 * laid in a box as wide as the cover's door (up to 30rem) and as tall as the
 * screen, with object-fit: cover, so the cover fades onto exactly what it
 * was showing. The section itself may be shorter (a live demo's bar takes
 * the foot of the screen); the picture is cut there, not scaled.
 *
 * THE WORDS ARRIVE AS THE COVER GOES: the darkening at the head of the
 * picture that they are read on, then each line, fading up in turn. Under
 * reduced motion they only fade.
 *
 * The picture is asked for once the cover is drawn, not with the page: the
 * cover waits for its key and door only, and this would share the line with
 * them. It is the film's last frame, so nobody sees it arrive.
 *
 * A card Lifafa gave its own picture or opening line (CardConfig.topImage,
 * topGreeting) has them first, above the invitation line.
 */
export default function ShahiDarwazaHero({
  draft,
  config,
  language,
  minHeight,
  band,
  fonts,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  /** The section's own height: the screen, less a demo's bar. */
  minHeight: string;
  /** The picture's height: the whole screen, as the cover's is. */
  band: string;
  fonts: DarwazaFonts;
}): ReactElement {
  const showPlaceholders = useShowPlaceholders();
  const coverReady = useCoverReady();
  const { ref, entered } = useEnter<HTMLElement>();
  const copy = cardCopy(language);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const topImage = cardTopImage(config);
  const greeting = cardTopGreeting(config);
  const lead = (topImage !== null ? 1 : 0) + (greeting !== null ? 1 : 0);

  /* Left off where the host hid the date behind a panel, which this would give away. */
  const reveal = dateRevealOf(config.dateReveal, config.scratchTarget);
  const dateHidden =
    config.scratchTarget === "date" || reveal === "scratch" || reveal === "tear";
  const when = dateHidden ? null : formatWhen(draft.eventDate, "", language);

  const step = (order: number): CSSProperties =>
    ({ "--sd-delay": `${250 + order * 170}ms` }) as CSSProperties;

  return (
    <section
      ref={ref}
      className={`${styles.hero} ${entered ? styles.heroIn : ""}`}
      style={{ minHeight }}
    >
      <div className={styles.heroArt} style={{ height: band }}>
        {coverReady ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ART.courtyard}
            alt=""
            draggable={false}
            decoding="async"
            className="absolute inset-0 h-full w-full max-w-none object-cover select-none"
          />
        ) : null}
        <span aria-hidden="true" className={styles.heroScrim} />
      </div>

      <div className={styles.heroWords}>
        {topImage !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={topImage.src}
            alt={topImage.alt}
            draggable={false}
            decoding="async"
            className={styles.heroLine}
            style={{ ...step(0), width: `${topImage.width / 16}rem`, maxWidth: "70%" }}
          />
        ) : null}

        {greeting !== null ? (
          <p
            lang={greeting.lang.length > 0 ? greeting.lang : undefined}
            className={`${styles.heroLine} max-w-full text-balance`}
            style={{
              ...step(topImage !== null ? 1 : 0),
              ...fonts.heading,
              fontSize: "0.95rem",
              lineHeight: 1.5,
              color: "#f2d896",
            }}
          >
            {greeting.text}
          </p>
        ) : null}

        <p
          className={styles.heroLine}
          style={{
            ...step(lead),
            ...fonts.body,
            fontSize: "1rem",
            fontStyle: "italic",
            letterSpacing: "0.04em",
          }}
        >
          {copy.coverInvite.heading}
        </p>

        {/*
          One name to a line, with the "&" between: a line of its own each way
          is what keeps two full names from breaking mid-name.
        */}
        <p
          className={`${styles.heroLine} flex max-w-full flex-col items-center wrap-anywhere text-balance`}
          style={{
            ...step(lead + 1),
            ...fonts.names,
            fontSize: "2.2rem",
            lineHeight: scriptLeading(language),
            color: "#f7e2ad",
          }}
        >
          {names.kind === "pair" ? (
            <>
              <span>{names.first}</span>
              <span style={{ ...fonts.heading, fontSize: "0.48em", lineHeight: 1.1 }}>&amp;</span>
              <span>{names.second}</span>
            </>
          ) : names.isPlaceholder ? (
            /* The editor's "Your names", fainter than a name; nothing for a guest. */
            showPlaceholders ? (
              <span style={{ opacity: placeholderOpacity(true, "primary") }}>{names.text}</span>
            ) : null
          ) : (
            names.text
          )}
        </p>

        <span aria-hidden="true" className={`${styles.heroLine} ${styles.heroRule}`} style={step(lead + 2)} />

        {when !== null ? (
          <p
            className={`${styles.heroLine} text-balance`}
            style={{
              ...step(lead + 3),
              ...fonts.heading,
              fontSize: "1rem",
              letterSpacing: language === "hi" ? undefined : "0.08em",
            }}
          >
            {when}
          </p>
        ) : null}
      </div>
    </section>
  );
}
