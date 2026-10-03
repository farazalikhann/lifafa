"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import AddToCalendar from "@/components/card/AddToCalendar";
import FrameStage from "@/components/card/FrameStage";
import FramedScratch from "@/components/card/FramedScratch";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useScratchReveal } from "@/components/card/ScratchReveal";
import { useInView } from "@/hooks/useInView";
import type { CalendarInvite } from "@/lib/calendar";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  calendarPageText,
  placeholderOpacity,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/** The section's own rhythm, shared with the group the panel covers. */
const GAP = "calc(0.75 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))";

/** How much further down than its inset the date's screen starts, and the least it keeps at its foot, in card px. */
const TOP_EXTRA = 40;
const MIN_FOOT = 56;

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
 * The date's own screen: "Save the date", the date in an oval frame of roses,
 * where it is, and the button that puts it in the guest's calendar.
 *
 *            Save the date
 *
 *              ( DECEMBER )
 *              (    12    )
 *              ( SATURDAY )
 *              (   ────   )
 *              ( 2026 · 7 PM )
 *
 *              Taj Palace
 *              New Delhi
 *           [ Add to calendar ]
 *
 * STACKED, NOT A BAND. The date used to be set across the card as weekday,
 * day and time between two rules, which is the right shape for a card and the
 * wrong one for an oval: brought down to fit, it was a third of its size in
 * a frame that was mostly empty. An oval is tall, so the date is set down it
 * with the day as its hero. Whatever the month, the language or the screen,
 * it is fitted to the box the opening holds clear of the vine (FrameStage).
 *
 * The words come from `calendarPageText` — one table, Indian day and Hindi
 * names, identical on the server and in the browser. Hindi names are set in
 * Tiro Devanagari Hindi; the numerals stay as the card prints them
 * everywhere. On first view the lines rise one after another, transform and
 * opacity only, and nothing moves under reduced motion.
 *
 * THIS SCREEN IS ALSO THE CARD'S "SAVE THE DATE". The heading and the
 * calendar button used to be a block of their own further down, under a
 * tear-off page that printed the date a second time; CardCanvas now leaves
 * that block off a card that has this section, and draws it only where a host
 * has switched this one off.
 */
export default function DetailsSection({
  draft,
  theme,
  minHeight,
  pad,
  scratch,
  language,
  invite,
  occasionId,
  venueScratched,
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
  /** What the calendar button writes its entry from. */
  invite: CalendarInvite;
  occasionId: OccasionId;
  /** The venue is behind a scratch panel elsewhere on the card, and is not named here until it opens. */
  venueScratched: boolean;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  const copy = cardCopy(language);
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);
  const hindi = language === "hi";

  const small: CSSProperties = { color: theme.textMuted };
  /* The weekday, the year and time, and the venue's name: said about the day, not the day itself. */
  const strong: CSSProperties = { color: textRoles(theme).detail };

  const venueReveal = useScratchReveal(venueScratched ? "venue" : undefined);
  const venueHidden = venueScratched && venueReveal.revealed === null;
  const venueName = draft.venueName.trim();
  /* An address that is a pasted map link or a pair of coordinates is for the directions button, not for reading. */
  const venueAddress = /https?:\/\/|^\s*-?\d{1,2}\.\d+\s*,/.test(draft.venueAddress)
    ? ""
    : draft.venueAddress.trim();

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
        className="flex flex-col items-center text-center"
        style={{ gap: "calc(0.5 * var(--card-rem, 1rem))" }}
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
            latinClass="text-[calc(1*var(--card-rem,1rem))] tracking-[0.32em] pl-[0.32em]"
            hindiClass="text-[calc(1.3*var(--card-rem,1rem))]"
            style={small}
          />
        </Rise>

        <Rise shown={isInView} step={1}>
          <p
            aria-hidden="true"
            className="text-[calc(6*var(--card-rem,1rem))] leading-none"
            style={{
              color: textRoles(theme).heading,
              fontFamily: "var(--card-heading)",
              fontWeight: 700,
              /* Lining figures: an old-style 3 or 9 hangs below the line, into the weekday under it. */
              fontVariantNumeric: "lining-nums tabular-nums",
            }}
          >
            {page.day}
          </p>
        </Rise>

        <Rise shown={isInView} step={2}>
          <Word
            text={page.weekday}
            hindi={hindi}
            latinClass="text-[calc(0.875*var(--card-rem,1rem))] tracking-[0.3em] pl-[0.3em]"
            hindiClass="text-[calc(1.1*var(--card-rem,1rem))]"
            style={strong}
          />
        </Rise>

        <Rise shown={isInView} step={3}>
          <span
            aria-hidden="true"
            className="my-1 block h-px w-10"
            style={{ backgroundColor: theme.accent, opacity: 0.7 }}
          />
        </Rise>

        <Rise shown={isInView} step={3}>
          {/* The year, and the time beside it when the host set one. Never broken across two lines. */}
          <p
            aria-hidden="true"
            className={`whitespace-nowrap text-[calc(0.9375*var(--card-rem,1rem))] ${hindi ? "leading-[1.5]" : "tracking-[0.12em]"}`}
            style={{ ...strong, ...(hindi ? { fontFamily: HINDI_FACE } : null) }}
          >
            {page.year}
            {page.time !== null ? (
              <>
                <span className="mx-[0.5em]" style={{ color: theme.accent }}>
                  ·
                </span>
                {page.time}
              </>
            ) : null}
          </p>
        </Rise>
      </div>
    );

  /* The date, in its frame: under foil when the host hid it, and simply framed when they did not. */
  const framed =
    page === null ? (
      when
    ) : scratch === null ? (
      <FrameStage frame="oval">{when}</FrameStage>
    ) : scratch.frame !== undefined ? (
      <FramedScratch {...scratch} frame={scratch.frame}>
        {when}
      </FramedScratch>
    ) : (
      <ScratchPanel {...scratch}>{when}</ScratchPanel>
    );

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        /*
          Set a little low. This screen is full from top to bottom, and the top
          of a screen is where the card dissolves what scrolls under its
          hanging ornaments (ScrollFade): centred between equal insets, the
          heading sat in that dissolve. The foot has no ornaments over it and
          can give the room up.
        */
        paddingTop: cardPx(page === null ? pad : pad + TOP_EXTRA),
        paddingBottom: cardPx(page === null ? pad : Math.max(MIN_FOOT, pad - TOP_EXTRA)),
        gap: GAP,
      }}
    >
      {page !== null ? (
        <Rise shown={isInView} step={0}>
          <h3
            className={`text-[calc(2*var(--card-rem,1rem)*var(--card-names-scale,1))] text-balance ${
              hindi ? "leading-[1.45]" : "leading-[1.15]"
            }`}
            style={{
              color: textRoles(theme).heading,
              fontFamily: "var(--card-names)",
              fontWeight: "var(--card-names-weight)" as unknown as number,
            }}
          >
            {copy.calendar.heading}
          </h3>
        </Rise>
      ) : null}

      {framed}

      {/* Where, under the frame: the venue in the display face and its address under it. */}
      {page !== null && !venueHidden && (venueName.length > 0 || venueAddress.length > 0) ? (
        <div className={`flex flex-col items-center gap-1 ${REVEAL_BASE} ${revealClass(isInView)}`}>
          {venueName.length > 0 ? (
            <p
              className="lifafa-reveal-in max-w-[24ch] text-[calc(1.125*var(--card-rem,1rem))] leading-snug text-balance"
              style={{
                ...strong,
                fontFamily: "var(--card-heading)",
                fontWeight: "var(--card-heading-weight)" as unknown as number,
              }}
            >
              {venueName}
            </p>
          ) : null}
          {venueAddress.length > 0 ? (
            <p
              className="lifafa-reveal-in line-clamp-2 max-w-[30ch] text-[calc(0.875*var(--card-rem,1rem))] leading-snug break-words"
              style={small}
            >
              {venueAddress}
            </p>
          ) : null}
        </div>
      ) : null}

      {page !== null ? (
        <div className={`${REVEAL_BASE} ${revealClass(isInView)}`}>
          <AddToCalendar
            draft={draft}
            theme={theme}
            invite={invite}
            occasionId={occasionId}
            language={language}
          />
        </div>
      ) : null}
    </section>
  );
}
