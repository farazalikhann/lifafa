"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from "react";
import { preload } from "react-dom";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { useFloatingPause } from "@/hooks/useFloatingPause";
import {
  coverNameLine,
  formatWhen,
  placeholderOpacity,
  resolveCoverNames,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { dateRevealOf } from "@/lib/royalScroll";
import { ART } from "@/templates/emerald-shahi/art";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/* How small the words may be set to fit the frame, as a share of their full size, and the step down. */
const FIT_FLOOR = 0.5;
const FIT_STEP = 0.04;

/**
 * Sets the words inside the frame as large as fits its opening, and no larger.
 *
 * `box` is the frame's safe opening and `words` everything set in it. The
 * words' sizes are all in `em`, so one font size on `words` scales the lot:
 * it is stepped down from full size until the words are no taller and no
 * wider than the box, which is what keeps a long pair of names, or the taller
 * lines of Devanagari, off the gold. Done before the first paint, and again
 * when the box changes size or the fonts arrive, never while anything moves.
 */
function useFitInside(
  box: RefObject<HTMLElement | null>,
  words: RefObject<HTMLElement | null>,
  key: string,
): void {
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = words.current;

    if (outer === null || inner === null) {
      return;
    }

    let live = true;

    const fit = (): void => {
      if (!live) {
        return;
      }

      let scale = 1;
      inner.style.fontSize = "1em";

      while (
        scale > FIT_FLOOR &&
        (inner.scrollHeight > outer.clientHeight ||
          inner.scrollWidth > outer.clientWidth)
      ) {
        scale = Math.max(FIT_FLOOR, scale - FIT_STEP);
        inner.style.fontSize = `${scale}em`;
      }
    };

    fit();

    const observer =
      typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    observer?.observe(outer);
    void document.fonts?.ready.then(fit);

    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [box, words, key]);
}

/**
 * A name with the light of foil passing over it.
 *
 * The name is set twice: once in gold, and once more over it in a pale gold
 * that is only ever seen through a narrow slanted window. The window slides
 * across by a transform while the pale copy inside it slides back by the same
 * amount, so the copy stays exactly on the name and what shows is a band of
 * light crossing the letters and nothing but the letters. Two transforms and
 * nothing else; see `.shimmer` in the stylesheet for the timing (once as the
 * hero arrives, then every eight seconds).
 */
function Shimmering({ text }: { text: string }): ReactElement {
  return (
    <span className="relative inline-block max-w-full">
      {text}
      <span aria-hidden="true" className={styles.shimmerClip}>
        <span className={styles.shimmer}>
          <span className={styles.shimmerCopy}>{text}</span>
        </span>
      </span>
    </span>
  );
}

/**
 * The first screen: an ornate gold frame with the couple's seal on its top
 * edge, and inside it the invitation line, what the day is in small gold
 * capitals, the names in gold script, a thin gold rule and the date.
 *
 * THE WORDS STAY INSIDE THE FRAME'S OPENING. The opening was measured off the
 * picture (see `.frameBox` in the stylesheet) and the words are laid in a box inset from it
 * on every side; they are then sized to that box by useFitInside, so a long
 * pair of names or a Hindi card shrinks and never reaches the gold.
 *
 * A floral overlaps the frame's top right corner and the same one, turned
 * round, its bottom left. Both lie wholly outside the box the words are in,
 * so no flower can cover a word at any size.
 *
 * THE ENTRANCE, once, as the cover lets the card go: the frame fades in as it
 * grows from 96%, the seal drops onto its top edge and presses, and the lines
 * fade up one after another. Then the light crosses the names. Under reduced
 * motion everything simply fades in and nothing crosses.
 *
 * The date is left off a card whose host has hidden it behind a scratch panel
 * or a strip of paper, which would otherwise be given away here.
 */
export default function EmeraldShahiHero({
  draft,
  config,
  language,
  minHeight,
  namesFont,
  headingFont,
  bodyFont,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  minHeight: string;
  namesFont: CSSProperties;
  headingFont: CSSProperties;
  bodyFont: CSSProperties;
}): ReactElement {
  /* The frame is the first thing seen as the envelope fades; fetched early, though the cover does not wait on it. */
  preload(ART.heroFrame, { as: "image" });

  const { ref, entered } = useEnter<HTMLElement>();
  const pauseRef = useFloatingPause();
  const boxRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const copy = cardCopy(language);
  const names = resolveCoverNames(draft, config.occasionId, language);
  const title = draft.eventTitle.trim();

  const reveal = dateRevealOf(config.dateReveal, config.scratchTarget);
  const dateHidden =
    config.scratchTarget === "date" || reveal === "scratch" || reveal === "tear";
  const when = dateHidden ? null : formatWhen(draft.eventDate, "", language);

  useFitInside(
    boxRef,
    wordsRef,
    `${title}|${coverNameLine(names)}|${when}|${language}`,
  );

  const initials =
    names.kind === "pair"
      ? `${initialOf(names.first)}${initialOf(names.second)}`
      : names.isPlaceholder
        ? ""
        : initialsOf(names.text);

  /* One line of the words, fading up `order` steps after the frame and the seal. */
  const line = (order: number): { className: string; style: CSSProperties } => ({
    className: styles.heroLine,
    style: { "--es-delay": `${950 + order * 140}ms` } as CSSProperties,
  });

  const script: CSSProperties = {
    ...namesFont,
    fontSize: "2.15em",
    lineHeight: language === "hi" ? 1.45 : 1.15,
  };

  return (
    <section
      ref={ref}
      className={`${styles.hero} flex-col items-center justify-center`}
      style={{ minHeight }}
    >
      <div
        ref={pauseRef}
        className={`${styles.frame} ${entered ? styles.heroIn : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.heroFrame}
          alt=""
          draggable={false}
          className={styles.frameArt}
        />

        <span aria-hidden="true" className={`${styles.floral} ${styles.floralTop}`} />
        <span aria-hidden="true" className={`${styles.floral} ${styles.floralFoot}`} />

        {/* The seal, half over the frame's top edge, with the couple's letters pressed into it. */}
        <div aria-hidden="true" className={styles.heroSeal}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ART.seal}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full select-none"
          />
          {initials.length > 0 ? (
            <span
              className={`relative ${styles.engraved}`}
              style={{
                ...headingFont,
                fontSize: "calc(var(--frame-w) * 0.07)",
                letterSpacing: initials.length > 1 ? "0.06em" : undefined,
                lineHeight: 1.2,
              }}
            >
              {initials}
            </span>
          ) : (
            <GoldFlower
              hi="#a57a1e"
              body="#7a5714"
              lo="#5c400c"
              className="relative w-[34%]"
            />
          )}
        </div>

        {/*
          The frame's opening, less a margin on every side; the words never
          leave it. Marked so the butterflies can find it and fly round it.
        */}
        <div ref={boxRef} data-es-hero-box="" className={styles.frameBox}>
          <div
            ref={wordsRef}
            className="flex w-full flex-col items-center text-center"
            style={{ gap: "0.62em" }}
          >
            <p
              {...line(0)}
              style={{
                ...line(0).style,
                ...bodyFont,
                fontSize: "0.86em",
                fontStyle: "italic",
                color: "var(--es-ivory)",
              }}
            >
              {copy.coverInvite.heading}
            </p>

            {/*
              What the day is, over the names: "Wedding Ceremony" in the
              heading's spaced gold capitals. Sized in `em` like every line
              here, so a long title, or a Hindi one, shrinks with the rest.
            */}
            {title.length > 0 ? (
              <p
                {...line(1)}
                className={`${styles.heroLine} max-w-full wrap-anywhere text-balance`}
                style={{ ...line(1).style, lineHeight: 1.5 }}
              >
                <span
                  className={styles.caps}
                  style={{
                    ...headingFont,
                    fontSize: language === "hi" ? "0.9em" : "0.66em",
                  }}
                >
                  {title}
                </span>
              </p>
            ) : null}

            {names.kind === "pair" ? (
              <div className="flex max-w-full flex-col items-center">
                <p
                  {...line(2)}
                  className={`${styles.heroLine} ${styles.script} max-w-full wrap-anywhere`}
                  style={{ ...line(2).style, ...script }}
                >
                  <Shimmering text={names.first} />
                </p>
                <p
                  {...line(3)}
                  style={{
                    ...line(3).style,
                    ...headingFont,
                    fontSize: "0.95em",
                    color: "var(--es-gold)",
                    lineHeight: 1.3,
                  }}
                >
                  &amp;
                </p>
                <p
                  {...line(4)}
                  className={`${styles.heroLine} ${styles.script} max-w-full wrap-anywhere`}
                  style={{ ...line(4).style, ...script }}
                >
                  <Shimmering text={names.second} />
                </p>
              </div>
            ) : (
              <p
                {...line(2)}
                className={`${styles.heroLine} ${styles.script} max-w-full wrap-anywhere text-balance`}
                style={{ ...line(2).style, ...script }}
              >
                {names.isPlaceholder ? (
                  /* The editor's "Your names", fainter than a name; never seen by a guest. */
                  <span style={{ opacity: placeholderOpacity(true, "primary") }}>
                    {names.text}
                  </span>
                ) : (
                  <Shimmering text={names.text} />
                )}
              </p>
            )}

            <span
              aria-hidden="true"
              {...line(5)}
              className={`${styles.heroLine} ${styles.heroRule}`}
            />

            {when !== null ? (
              <p
                {...line(6)}
                className={`${styles.heroLine} text-balance`}
                style={{
                  ...line(6).style,
                  ...headingFont,
                  fontSize: "0.98em",
                  color: "var(--es-ivory)",
                }}
              >
                {when}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
