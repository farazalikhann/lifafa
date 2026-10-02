"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import FramedScratch from "@/components/card/FramedScratch";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useInView } from "@/hooks/useInView";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  calendarPageText,
  placeholderOpacity,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** The section's own rhythm, shared with the group the panel covers. */
const GAP = "calc(1 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))";

/**
 * The face Hindi words in the band are set in: Tiro Devanagari Hindi, the
 * traditional serif app/layout.tsx already loads for Hindi headings, with the
 * card's own Devanagari behind it.
 */
const HINDI_FACE =
  'var(--font-hi-tiro), var(--font-devanagari), "Noto Serif Devanagari", serif';

/** When the rules finish drawing, the words start: this far in, then a step each. */
const TEXT_START_MS = 450;
const TEXT_STEP_MS = 90;

/** A line of the band's text, rising into place once the rules are drawn. */
function Rise({
  shown,
  step,
  children,
}: {
  shown: boolean;
  step: number;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      className={`${REVEAL_BASE} ${revealClass(shown)}`}
      style={{ transitionDelay: `${TEXT_START_MS + step * TEXT_STEP_MS}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * A word of the band: set as small spaced capitals in Latin, or in the Hindi
 * serif at a size that holds its own beside them — letter-spacing would break
 * Devanagari's headline, so a Hindi word is made larger instead of wider.
 */
function Word({
  text,
  hindi,
  latinClass,
  hindiClass,
  style,
}: {
  text: string;
  hindi: boolean;
  latinClass: string;
  hindiClass: string;
  style: CSSProperties;
}): ReactElement {
  return hindi ? (
    <p lang="hi" className={`leading-[1.5] whitespace-nowrap ${hindiClass}`} style={{ ...style, fontFamily: HINDI_FACE }}>
      {text}
    </p>
  ) : (
    <p className={`whitespace-nowrap uppercase ${latinClass}`} style={style}>
      {text}
    </p>
  );
}

/**
 * A rule of the band, drawn as a transform so it can grow in: from the centre
 * outward for the horizontals, from its middle for the verticals. Static under
 * reduced motion, where the section is shown drawn.
 */
function Rule({
  drawn,
  accent,
  placement,
}: {
  drawn: boolean;
  accent: string;
  placement: "top-left" | "bottom-left" | "top-right" | "bottom-right" | "left" | "right";
}): ReactElement {
  const horizontal = placement.startsWith("top") || placement.startsWith("bottom");
  const position: CSSProperties = horizontal
    ? {
        left: 0,
        right: 0,
        height: 1,
        ...(placement.startsWith("top") ? { top: 0 } : { bottom: 0 }),
        /* Toward the centre of the band, which is where they grow from. */
        transformOrigin: placement.endsWith("left") ? "right center" : "left center",
        transform: drawn ? "scaleX(1)" : "scaleX(0)",
      }
    : {
        top: "8%",
        bottom: "8%",
        width: 1,
        ...(placement === "left" ? { left: 0 } : { right: 0 }),
        transformOrigin: "center",
        transform: drawn ? "scaleY(1)" : "scaleY(0)",
      };

  return (
    <span
      aria-hidden="true"
      className="absolute block transition-transform duration-700 ease-out motion-reduce:transition-none"
      style={{ ...position, backgroundColor: accent, opacity: 0.7 }}
    />
  );
}

/**
 * The date, set the way a printed invitation sets it: the month above, a band
 * of weekday, day and time between two rules with the day as its hero, and the
 * year below.
 *
 *              OCTOBER
 *     ─────────┐    ┌──────────
 *       MONDAY │ 12 │ 7:00 AM
 *     ─────────┘    └──────────
 *               2026
 *
 * Without a time the year takes the time's place and the line below goes, so
 * the band keeps its three parts. The words come from `calendarPageText` — the
 * same table, Indian day and Hindi names as the tear-off page, identical on the
 * server and in the browser. Hindi names are set in Tiro Devanagari Hindi;
 * the numerals stay as the card prints them everywhere.
 *
 * On first view the rules draw out from the centre and the words rise after
 * them — transform and opacity only, and nothing moves under reduced motion.
 */
export default function DetailsSection({
  draft,
  theme,
  minHeight,
  pad,
  scratch,
  language,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /**
   * Set when this is the section the host chose to hide. Null otherwise, which
   * is every card but one and both of the other two scratch targets.
   */
  scratch: ScratchConfig | null;
  /** The language the date is written in. */
  language: CardLanguage;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  const copy = cardCopy(language);
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);
  const hindi = language === "hi";

  const small: CSSProperties = { color: theme.textMuted };
  const strong: CSSProperties = { color: theme.textPrimary };

  /*
    The lines that give the date away, grouped so a scratch panel covers them
    and nothing else — and grouped even without a panel, so the covered and
    uncovered cards lay out identically.
  */
  const when =
    page === null ? (
      /* No date yet: the editor's placeholder, where the band will be. */
      <div className="flex flex-col items-center text-center" style={{ gap: GAP }}>
        <Rise shown={isInView} step={0}>
          <p
            className="text-[calc(0.84*var(--card-rem,1rem))] tracking-[0.3em] uppercase"
            style={{ ...small, opacity: placeholderOpacity(true, "muted") }}
          >
            {copy.details.dayPlaceholder}
          </p>
        </Rise>
        <Rise shown={isInView} step={1}>
          <p
            className="text-[1.825rem] leading-[1.2] font-medium"
            style={{
              opacity: placeholderOpacity(true, "primary"),
              fontFamily: "var(--card-heading)",
            }}
          >
            {copy.details.dateTimePlaceholder}
          </p>
        </Rise>
      </div>
    ) : (
      <div
        className="flex w-full flex-col items-center text-center"
        style={{ gap: "calc(0.9 * var(--card-rem, 1rem))" }}
        /* Read as one date, in order, whatever the layout draws. */
        aria-label={[page.weekday, page.day, page.month, page.year, page.time]
          .filter((part) => part !== null)
          .join(" ")}
        role="group"
      >
        <Rise shown={isInView} step={0}>
          <Word
            text={page.month}
            hindi={hindi}
            latinClass="text-[calc(0.8*var(--card-rem,1rem))] tracking-[0.42em] pl-[0.42em]"
            hindiClass="text-[calc(1.05*var(--card-rem,1rem))]"
            style={small}
          />
        </Rise>

        <div
          aria-hidden="true"
          className="grid w-full max-w-[22rem] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch"
        >
          <div className="relative flex items-center justify-end py-3.5 pr-3">
            <Rule drawn={isInView} accent={theme.accent} placement="top-left" />
            <Rule drawn={isInView} accent={theme.accent} placement="bottom-left" />
            <Rise shown={isInView} step={1}>
              <Word
                text={page.weekday}
                hindi={hindi}
                latinClass="text-[calc(0.72*var(--card-rem,1rem))] tracking-[0.2em]"
                hindiClass="text-[calc(0.88*var(--card-rem,1rem))]"
                style={strong}
              />
            </Rise>
          </div>

          <div className="relative flex items-center justify-center px-3.5 sm:px-5">
            <Rule drawn={isInView} accent={theme.accent} placement="left" />
            <Rule drawn={isInView} accent={theme.accent} placement="right" />
            <Rise shown={isInView} step={1}>
              <p
                className="text-[3.25rem] leading-none tabular-nums sm:text-[calc(3.5*var(--card-rem,1rem))]"
                style={{
                  color: theme.accent,
                  fontFamily: "var(--card-heading)",
                  fontWeight: "var(--card-heading-weight)" as unknown as number,
                }}
              >
                {page.day}
              </p>
            </Rise>
          </div>

          <div className="relative flex items-center justify-start py-3.5 pl-3">
            <Rule drawn={isInView} accent={theme.accent} placement="top-right" />
            <Rule drawn={isInView} accent={theme.accent} placement="bottom-right" />
            <Rise shown={isInView} step={1}>
              {page.time !== null ? (
                <Word
                  text={page.time}
                  hindi={hindi}
                  latinClass="text-[calc(0.72*var(--card-rem,1rem))] tracking-[0.2em]"
                  hindiClass="text-[calc(0.88*var(--card-rem,1rem))]"
                  style={strong}
                />
              ) : (
                <p
                  className="text-[calc(0.72*var(--card-rem,1rem))] tracking-[0.2em]"
                  style={strong}
                >
                  {page.year}
                </p>
              )}
            </Rise>
          </div>
        </div>

        {page.time !== null ? (
          <Rise shown={isInView} step={2}>
            <p
              aria-hidden="true"
              className="pl-[0.42em] text-[calc(0.8*var(--card-rem,1rem))] tracking-[0.42em]"
              style={small}
            >
              {page.year}
            </p>
          </Rise>
        ) : null}
      </div>
    );

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: GAP,
      }}
    >
      {scratch === null ? (
        when
      ) : scratch.frame !== undefined ? (
        <FramedScratch {...scratch} frame={scratch.frame}>
          {when}
        </FramedScratch>
      ) : (
        <ScratchPanel {...scratch}>{when}</ScratchPanel>
      )}
    </section>
  );
}
