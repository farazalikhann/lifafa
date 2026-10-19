"use client";

import {
  useLayoutEffect,
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
import { dateRevealOf } from "@/lib/royalScroll";
import { ART, HALL_GLINTS } from "@/templates/sheesh-mahal/art";
import Foil from "@/templates/sheesh-mahal/Foil";
import Glints from "@/templates/sheesh-mahal/Glints";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import {
  scriptLeading,
  sheeshCopy,
  whenIdle,
  type SheeshFonts,
} from "@/templates/sheesh-mahal/shared";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/*
  How small a name may be set on one line, as a share of its full size,
  before it is given two lines instead; and the least the whole block may be
  stepped down to fit the oval's height.
*/
const ONE_LINE_FLOOR = 0.6;
const BLOCK_FLOOR = 0.55;
const BLOCK_STEP = 0.04;
/* Each line of the entrance after the one before. */
const STAGGER = 150;

/**
 * Sets the names as large as fits: each on one line at the largest size the
 * oval's width allows, or on two lines where one would make it too small;
 * then the whole block stepped down, if it must be, to fit the oval's height.
 *
 * Every size is in `em`, so a `--fit` on a name scales that name and a font
 * size on the block scales the lot. Before the first paint, again when the
 * box changes size and when the fonts arrive; never while anything moves.
 */
function fitNames(box: HTMLElement, words: HTMLElement): void {
  words.style.fontSize = "1em";
  const width = box.clientWidth;

  for (const name of words.querySelectorAll<HTMLElement>("[data-name]")) {
    name.removeAttribute("data-wrap");
    name.style.setProperty("--fit", "1");
    const natural = name.scrollWidth;
    const fit = natural > 0 ? Math.min(1, width / natural) : 1;

    if (fit >= ONE_LINE_FLOOR) {
      name.style.setProperty("--fit", fit.toFixed(3));
    } else {
      /* Two lines, at the size the longer of them fits; a single unbroken word is broken anywhere. */
      name.setAttribute("data-wrap", "");
      name.style.setProperty("--fit", Math.max(ONE_LINE_FLOOR * 0.8, Math.min(1, (width * 1.9) / natural)).toFixed(3));
    }
  }

  let scale = 1;

  while (scale > BLOCK_FLOOR && (words.scrollHeight > box.clientHeight || words.scrollWidth > box.clientWidth)) {
    scale = Math.max(BLOCK_FLOOR, scale - BLOCK_STEP);
    words.style.fontSize = `${scale}em`;
  }
}

/** One line of the words, fading up in its turn. */
function Line({
  order,
  className = "",
  style,
  name = false,
  children,
}: {
  order: number;
  className?: string;
  style?: CSSProperties;
  /** A name, sized by fitNames. */
  name?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <p
      data-name={name ? "" : undefined}
      className={`${styles.lineUp} ${className}`}
      style={{ "--sm-delay": `${order * STAGGER}ms`, ...style } as CSSProperties}
    >
      {children}
    </p>
  );
}

/**
 * Page 2: the names, in the hall of mirrors.
 *
 * The hall is the ground, covering the room, its dark oval for the words
 * painted into the picture (nothing is laid over it to darken it). The
 * cover's doors open onto exactly this, and the cover's hall fades into it.
 *
 * INSIDE THE OVAL, between 30% and 58% of the height: a small spaced-caps
 * invitation line, the two names large in antique gold foil with a small
 * ampersand between, a thin gold rule and the date. The date is left off a
 * card whose host hides it behind a scratch panel. A band of light crosses
 * the names as they arrive and every eight seconds.
 *
 * THE ENTRANCE plays once, in front of the guest: the card is let go only
 * when the cover has finished (its `revealAt` is its end), and the pager
 * marks this page entered then. The invitation line fades up, the first name
 * rises, the "&", the second name, then the rule and the date, 150ms apart,
 * and the light crosses the names just after. Coming back to the page does
 * not play it again. Under reduced motion each line simply fades in.
 *
 * The hall's own glints (Glints.tsx) answer the phone's tilt while this is
 * the room being read, on its arches, walls and floor, never over the words;
 * held over the room, not in it, so the walk to page 3 never scales them.
 * "Swipe up" bobs at the foot until the guest first scrolls.
 */
export default function SheeshNamesPage({
  draft,
  config,
  language,
  fonts,
}: {
  draft: EventDraft;
  config: CardConfig;
  language: CardLanguage;
  fonts: SheeshFonts;
}): ReactElement {
  preload(ART.hall, { as: "image", fetchPriority: "high" });

  const boxRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const own = sheeshCopy(language);
  const names = resolveCoverNames(draft, config.occasionId, language);

  const reveal = dateRevealOf(config.dateReveal, config.scratchTarget);
  const dateHidden =
    config.scratchTarget === "date" || reveal === "scratch" || reveal === "tear";
  const when = dateHidden ? null : formatWhen(draft.eventDate, "", language);
  const key = `${coverNameLine(names)}|${when}|${language}|${config.style.fontPairId}`;

  useLayoutEffect(() => {
    const box = boxRef.current;
    const words = wordsRef.current;

    if (box === null || words === null) {
      return;
    }

    let live = true;
    let cancelIdle: (() => void) | null = null;
    const fit = (): void => {
      if (live) {
        fitNames(box, words);
      }
    };
    /*
      A change of size is fitted at the next idle moment, not in the frame
      it happens in: the screen changes height as the cover's tap asks for the
      whole screen, under the cover, in the opening's first frames.
    */
    const refit = (): void => {
      cancelIdle?.();
      cancelIdle = whenIdle(fit);
    };

    fit();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(refit) : null;
    observer?.observe(box);
    void document.fonts?.ready.then(fit);

    return () => {
      live = false;
      cancelIdle?.();
      observer?.disconnect();
    };
  }, [key]);

  const script: CSSProperties = {
    ...fonts.names,
    lineHeight: scriptLeading(language),
  };

  return (
    <SheeshPage
      label={coverNameLine(names)}
      images={[ART.hall]}
      ground={
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ART.hall} alt="" draggable={false} fetchPriority="high" className={styles.roomArt} />
      }
      overlay={<Glints glints={HALL_GLINTS} listen followPage />}
    >

      <div ref={boxRef} className={styles.namesBox}>
        <div ref={wordsRef} className={styles.namesWords}>
          <Line order={0} className={`${styles.inviteLine} ${styles.caps} ${styles.onNight} text-balance`} style={fonts.heading}>
            {own.invitationLine}
          </Line>

          {names.kind === "pair" ? (
            <>
              <Line order={1} name className={styles.nameLine} style={script}>
                <Foil text={names.first} />
              </Line>
              <Line order={2} className={styles.ampersand} style={fonts.names}>
                &amp;
              </Line>
              <Line order={3} name className={styles.nameLine} style={script}>
                <Foil text={names.second} />
              </Line>
            </>
          ) : (
            <Line order={1} name className={styles.nameLine} style={script}>
              {names.isPlaceholder ? (
                /* The editor's "Your names", fainter than a name; never seen by a guest. */
                <span className={styles.onNight} style={{ opacity: placeholderOpacity(true, "primary") }}>
                  {names.text}
                </span>
              ) : (
                <Foil text={names.text} />
              )}
            </Line>
          )}

          {when !== null ? (
            <>
              <span
                aria-hidden="true"
                className={`${styles.rule} ${styles.lineUp}`}
                style={{ "--sm-delay": `${4 * STAGGER}ms` } as CSSProperties}
              >
                <span className={styles.ruleMark} />
              </span>
              <Line order={4} className={`${styles.dateLine} ${styles.onNight} text-balance`} style={fonts.heading}>
                {when}
              </Line>
            </>
          ) : null}
        </div>
      </div>

      <SwipeHint language={language} />
    </SheeshPage>
  );
}

/**
 * "Swipe up", bobbing gently at the foot of the page until the guest first
 * scrolls (the pager marks the card `data-sm-scrolled`), and a way on for one
 * who would rather tap: it takes them to the next room.
 */
function SwipeHint({ language }: { language: CardLanguage }): ReactElement {
  const label = sheeshCopy(language).swipeUp;

  return (
    <button
      type="button"
      className={styles.hint}
      onClick={(event) => {
        const pages = [...document.querySelectorAll("[data-sm-page]")];
        const here = event.currentTarget.closest("[data-sm-page]");
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
        <span className={language === "hi" ? "" : "tracking-[0.24em] uppercase"}>{label}</span>
      </span>
    </button>
  );
}
