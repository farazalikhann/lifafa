"use client";

import type { CSSProperties, ReactElement } from "react";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { resolveCoverNames } from "@/lib/cardFormat";
import { ART, ENVELOPE } from "@/templates/shahi-darwaza/art";
import styles from "@/templates/shahi-darwaza/darwaza.module.css";
import { letterLines } from "@/templates/shahi-darwaza/sections";
import type { DarwazaFonts } from "@/templates/shahi-darwaza/shared";
import { useEnter } from "@/templates/shahi-darwaza/useEnter";
import { useNear } from "@/templates/shahi-darwaza/useNear";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The letter: a cream envelope sealed in pink wax with the couple's
 * initials, which opens as it comes on screen. The flap and its seal fade,
 * and the letter slides up out of the pocket with the host's note on it and
 * the two families under it.
 *
 * THE ENVELOPE IS ONE PICTURE CUT IN TWO (see ENVELOPE in art.ts): the pocket
 * stays in front of the letter, and the flap over both goes. The letter is
 * inside a box cut off at the envelope's foot, so all of it below the
 * pocket's edge is hidden until it rises.
 *
 * Everything is sized from the envelope body's width, --b. The letter is
 * paper cut into nine by border-image, so it grows as long as the note is
 * without its gold corners stretching; it is only given its paper once it is
 * a screen away (useNear).
 *
 * Under reduced motion the letter is already out and the flap already gone;
 * the section fades in.
 */
export default function ShahiDarwazaLetter({
  draft,
  config,
  language,
  fonts,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  fonts: DarwazaFonts;
}): ReactElement | null {
  const { ref, entered } = useEnter<HTMLElement>();
  const near = useNear<HTMLDivElement>();
  const { message, families } = letterLines(draft);
  const names = resolveCoverNames(draft, config.occasionId, language);

  if (message.length === 0 && families.length === 0) {
    return null;
  }

  const initials =
    names.kind === "pair"
      ? `${initialOf(names.first)}${initialOf(names.second)}`
      : names.isPlaceholder
        ? ""
        : initialsOf(names.text);

  const geometry = {
    "--env-w": String(ENVELOPE.width),
    "--env-left": String(ENVELOPE.left),
    "--env-body-top": String(ENVELOPE.bodyTop),
    "--env-corner": String(ENVELOPE.pocketCorner),
    "--env-point": String(ENVELOPE.pocketPoint),
    "--seal-x": String(ENVELOPE.seal.x),
    "--seal-y": String(ENVELOPE.seal.y),
    "--seal-size": String(ENVELOPE.seal.size),
  } as CSSProperties;

  return (
    <section ref={ref} className={`${styles.section} ${entered ? styles.letterIn : ""}`}>
      <div ref={near.ref} className={styles.letterStage} style={geometry}>
        <div className={styles.letterClip}>
          <div className={`${styles.letter} ${near.near ? styles.letterPaper : ""}`}>
            {message.length > 0 ? (
              <p
                className="text-[0.95rem] leading-relaxed whitespace-pre-line wrap-anywhere text-pretty"
                style={fonts.body}
              >
                {message}
              </p>
            ) : null}

            {message.length > 0 && families.length > 0 ? (
              <span aria-hidden="true" className={styles.letterRule} />
            ) : null}

            {families.map((line, index) => (
              <p
                key={index}
                data-family-parents={index === 0 ? "one" : "two"}
                className="text-[0.92rem] leading-snug wrap-anywhere text-balance"
                style={fonts.heading}
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        <div aria-hidden="true" className={styles.envelope}>
          <span className={styles.envelopeInside} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ART.envelopePocket}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            className={styles.envelopePocket}
          />
          <div className={styles.envelopeFlap}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ART.envelopeFlap}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full max-w-none"
            />
            {/* The seal, over the one drawn on the flap, with the couple's letters pressed into it. */}
            <div className={styles.seal}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ART.waxSeal}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                className="absolute inset-0 h-full w-full max-w-none"
              />
              {initials.length > 0 ? (
                <span className={styles.sealInitials} style={fonts.names}>
                  {initials}
                </span>
              ) : (
                <GoldFlower hi="#c98d93" body="#a9666e" lo="#7e4249" className="relative w-[34%]" />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
