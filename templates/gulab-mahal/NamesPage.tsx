"use client";

import {
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { preload } from "react-dom";
import {
  coverNameLine,
  formatWhen,
  placeholderOpacity,
  resolveCoverNames,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { dateRevealOf } from "@/lib/royalScroll";
import { ART, CAMEO_ASPECT, CAMEO_BOX, CAMEO_LINES } from "@/templates/gulab-mahal/art";
import { Corners, Foil, Shadow } from "@/templates/gulab-mahal/Decor";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import GulabPage from "@/templates/gulab-mahal/Page";
import { useFitInside } from "@/templates/gulab-mahal/useFitInside";
import {
  gulabCopy,
  scriptLeading,
  type GulabFonts,
} from "@/templates/gulab-mahal/shared";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** One line of the words, fading up in its turn once the frame has settled. */
function Line({
  order,
  width,
  className = "",
  style,
  children,
}: {
  order: number;
  /** The widest it may be, as a share of the box: narrower where the oval is. */
  width?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}): ReactElement {
  return (
    <p
      className={`${styles.lineUp} ${className}`}
      style={
        {
          "--gm-delay": `${620 + order * 150}ms`,
          maxWidth: width === undefined ? "100%" : `${width * 100}%`,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </p>
  );
}

/**
 * Page 2: the names, in a cameo of roses.
 *
 * The cameo is 80% of the screen across (less on a short screen, so it is
 * always seen whole), on a soft shadow of its own outline, with a rose corner
 * tucked over its top right and the same turned round over its bottom left,
 * each on the cameo's own roses and wholly clear of the words. The names are
 * in rose-gold foil, with a band of light across them now and then.
 *
 * THE WORDS STAY ON THE SATIN. They are laid in a box measured off the
 * picture (CAMEO_BOX in art.ts), the first and last lines held narrower where
 * the oval narrows, and sized to the box by useFitInside: the event's title
 * in small spaced capitals, the invitation line in italic, the names large in
 * wine script with a rose-gold "&", a thin rose-gold rule, and the date. The
 * date is left off a card whose host hides it behind a scratch panel, which
 * this would otherwise give away.
 *
 * THE ENTRANCE, once, as the envelope hands over: the cameo rises and settles on
 * a soft spring with its corners and its shadow, then the lines
 * fade up one by one, the names last.
 */
export default function GulabNamesPage({
  draft,
  config,
  language,
  fonts,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement {
  /* The first thing seen as the letter fades; fetched early, though the cover does not wait on it. */
  preload(ART.cameo, { as: "image", fetchPriority: "high" });
  preload(ART.corner, { as: "image" });

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
    /* The lines fade up into place: measured where they settle. */
    true,
  );

  const script: CSSProperties = {
    ...fonts.names,
    lineHeight: scriptLeading(language),
  };

  /* Names last: after the title, the line, the rule and the date. */
  const namesOrder = 3 + (when !== null ? 1 : 0);

  return (
    <GulabPage label={coverNameLine(names)} images={[ART.cameo, ART.corner, ART.shadow.cameo]} variant={0}>
      <div className={`${styles.cameo} ${styles.rise}`}>
        <Shadow src={ART.shadow.cameo} aspect={CAMEO_ASPECT} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.cameo}
          alt=""
          draggable={false}
          fetchPriority="high"
          className={styles.cameoArt}
        />
        {/* Over the cameo's own roses at its top right and bottom left, nowhere near the words. */}
        <Corners size={0.34} />

        <div
          ref={boxRef}
          className={styles.cameoBox}
          style={{
            top: `${CAMEO_BOX.top * 100}%`,
            bottom: `${CAMEO_BOX.bottom * 100}%`,
            left: `${CAMEO_BOX.side * 100}%`,
            right: `${CAMEO_BOX.side * 100}%`,
          }}
        >
          <div
            ref={wordsRef}
            className="flex w-full flex-col items-center text-center"
            style={{ gap: "0.34em" }}
          >
            {title.length > 0 ? (
              <Line
                order={0}
                width={CAMEO_LINES.top}
                className={`${styles.caps} wrap-anywhere text-balance`}
                style={{
                  ...fonts.heading,
                  fontSize: language === "hi" ? "1.22em" : "0.94em",
                  lineHeight: 1.3,
                }}
              >
                {title}
              </Line>
            ) : null}

            <Line
              order={1}
              width={CAMEO_LINES.upper}
              className="text-balance"
              style={{
                ...fonts.italic(language),
                fontSize: "1.12em",
                lineHeight: 1.3,
                color: "var(--gm-wine-soft)",
              }}
            >
              {copy.coverInvite.line}
            </Line>

            {names.kind === "pair" ? (
              <div className="flex max-w-full flex-col items-center">
                <Line
                  order={namesOrder}
                  className={`${styles.script} ${styles.names} wrap-anywhere`}
                  style={script}
                >
                  <Foil text={names.first} />
                </Line>
                <Line
                  order={namesOrder + 1}
                  style={{
                    ...fonts.names,
                    fontSize: "1.5em",
                    lineHeight: 1,
                    color: "var(--gm-rose-gold)",
                  }}
                >
                  &amp;
                </Line>
                <Line
                  order={namesOrder + 2}
                  className={`${styles.script} ${styles.names} wrap-anywhere`}
                  style={script}
                >
                  <Foil text={names.second} />
                </Line>
              </div>
            ) : (
              <Line
                order={namesOrder}
                className={`${styles.script} ${styles.names} wrap-anywhere text-balance`}
                style={script}
              >
                {names.isPlaceholder ? (
                  /* The editor's "Your names", fainter than a name; never seen by a guest. */
                  <span style={{ opacity: placeholderOpacity(true, "primary") }}>
                    {names.text}
                  </span>
                ) : (
                  <Foil text={names.text} />
                )}
              </Line>
            )}

            <span
              aria-hidden="true"
              className={`${styles.divider} ${styles.lineUp}`}
              style={{ "--gm-delay": `${620 + 2 * 150}ms` } as CSSProperties}
            >
              <span className={styles.dividerMark} />
            </span>

            {when !== null ? (
              <Line
                order={3}
                width={CAMEO_LINES.foot}
                className="text-balance"
                style={{
                  ...fonts.heading,
                  fontSize: "1.2em",
                  lineHeight: 1.25,
                  color: "var(--gm-wine)",
                }}
              >
                {when}
              </Line>
            ) : null}
          </div>
        </div>
      </div>

      <SwipeHint language={language} />
    </GulabPage>
  );
}

/**
 * "Swipe up", bobbing gently at the foot of the page until the guest first
 * scrolls (the pager marks the card `data-gm-scrolled`), and a way down for
 * one who would rather tap: it takes them to the next page.
 */
function SwipeHint({ language }: { language: CardLanguage }): ReactElement {
  const label = gulabCopy(language).swipeUp;

  return (
    <button
      type="button"
      className={`${styles.satin} ${styles.hint}`}
      onClick={(event) => {
        /* The page after this one, wherever it is drawn: the card's next, or the reply. */
        const pages = [...document.querySelectorAll("[data-gm-page]")];
        const here = event.currentTarget.closest("[data-gm-page]");
        const next = here === null ? undefined : pages[pages.indexOf(here) + 1];

        next?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      <span className={styles.hintBob}>
        <svg viewBox="0 0 20 12" aria-hidden="true" focusable="false" className="h-2.5 w-4">
          <path
            d="M2 10 L10 3 L18 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className={language === "hi" ? "" : "tracking-[0.24em] uppercase"}
        >
          {label}
        </span>
      </span>
    </button>
  );
}
