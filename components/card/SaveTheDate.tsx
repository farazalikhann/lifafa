"use client";

import { useId, type ReactElement } from "react";
import AddToCalendar from "@/components/card/AddToCalendar";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useScratchReveal } from "@/components/card/ScratchReveal";
import { useInView } from "@/hooks/useInView";
import { calendarEvent, type CalendarInvite } from "@/lib/calendar";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  calendarPageText,
  lineDelay,
  revealClass,
  type CalendarPageText,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardRem } from "@/lib/cardScale";
import { mixHex, readableOn } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/** The day, large, and the weekday under it: the writing on the page's body. */
function PageDay({
  text,
  theme,
  isDevanagari,
}: {
  text: CalendarPageText;
  theme: Theme;
  isDevanagari: boolean;
}): ReactElement {
  return (
    <div className="flex flex-col items-center">
      <span
        className="block leading-[1.05] tabular-nums"
        style={{
          fontSize: cardRem(3.6),
          color: theme.textPrimary,
          fontFamily: "var(--card-heading)",
          fontWeight: "var(--card-heading-weight)" as unknown as number,
        }}
      >
        {text.day}
      </span>
      <span
        className={`text-[calc(0.8*var(--card-rem,1rem))] tracking-[0.12em] uppercase ${
          isDevanagari ? "mt-1.5 leading-[1.5]" : "mt-0.5 leading-tight"
        }`}
        style={{ color: theme.textMuted }}
      >
        {text.weekday}
      </span>
    </div>
  );
}

/**
 * The tear-off page: the month on a strip in the card's accent, the day large
 * in the pair's heading face, the weekday under it.
 *
 * Drawn, not an image. The torn lower edge is a mask (see .lifafa-cal-sheet in
 * globals.css), the paper is a faint turbulence noise, and the page that flips
 * away on arrival is a second sheet hinged at the strip. Tilted two degrees at
 * rest, which is the difference between a calendar page and a date box.
 */
function CalendarPage({
  text,
  theme,
  shown,
  label,
  isDevanagari,
  scratch,
}: {
  text: CalendarPageText;
  theme: Theme;
  shown: boolean;
  label: string;
  /** Devanagari needs room above for its headstroke and matras. */
  isDevanagari: boolean;
  /**
   * Set when the date is behind a scratch panel. The page is drawn all the
   * same, strip and rings and paper; only its writing is covered, the month
   * on the strip and the day and weekday under it, each by a patch in the
   * card's scratch style. Both carry the "date" target, so scratching either
   * one, or the date's own panel elsewhere on the card, opens all three.
   *
   * Neither patch has a reveal button of its own: the sheet clips, and would
   * clip the button with it. SaveTheDate puts one under the page instead.
   */
  scratch: ScratchConfig | null;
}): ReactElement {
  const grainId = useId();
  const onAccent = readableOn(theme.accent, [theme.background, theme.textPrimary]);
  /* A shade off the page, so the page flipping away reads as a second sheet. */
  const underside = mixHex(theme.surface, theme.textPrimary, 0.05);

  return (
    <div
      role="img"
      aria-label={label}
      data-shown={shown ? "true" : "false"}
      className="lifafa-cal relative"
      style={{ width: cardRem(9.5) }}
    >
      <div
        className="lifafa-cal-sheet relative overflow-hidden rounded-t-[0.9rem] rounded-b-[0.35rem]"
        style={{
          backgroundColor: theme.surface,
          boxShadow: `inset 0 0 0 1px ${theme.textMuted}40`,
        }}
      >
        <div
          className={`px-1.5 pt-3 pb-2 text-center text-[calc(0.68*var(--card-rem,1rem))] font-semibold tracking-[0.12em] uppercase ${
            isDevanagari ? "leading-[1.4]" : "leading-none"
          }`}
          style={{ backgroundColor: theme.accent, color: onAccent }}
        >
          {scratch === null ? (
            `${text.month} ${text.year}`
          ) : (
            /* No words on a strip this thin; the hint under the page says what to do. */
            <ScratchPanel
              {...scratch}
              label=""
              phrases={{ ...scratch.phrases, short: "" }}
              showRevealButton={false}
            >
              {text.month} {text.year}
            </ScratchPanel>
          )}
        </div>

        <div className="relative flex flex-col items-center px-2 pt-2 pb-4">
          {scratch === null ? (
            <PageDay text={text} theme={theme} isDevanagari={isDevanagari} />
          ) : (
            <ScratchPanel {...scratch} showRevealButton={false}>
              <PageDay text={text} theme={theme} isDevanagari={isDevanagari} />
            </ScratchPanel>
          )}
          {/* The page before this one, flipping up and away over the hinge. */}
          <div
            aria-hidden="true"
            className="lifafa-cal-flip absolute inset-0"
            style={{
              backgroundColor: underside,
              boxShadow: `inset 0 1px 0 ${theme.textMuted}55`,
            }}
          />
        </div>

        {/* Paper grain. Faint enough to be felt rather than seen. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.09] mix-blend-overlay"
        >
          <filter id={grainId}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter={`url(#${grainId})`} />
        </svg>
      </div>

      {/* Two binding rings over the strip, the way a desk pad is held. */}
      {[28, 72].map((left) => (
        <span
          key={left}
          aria-hidden="true"
          className="absolute -top-1.5 block h-3.5 w-1.5 -translate-x-1/2 rounded-full"
          style={{
            left: `${left}%`,
            backgroundColor: theme.textMuted,
            boxShadow: `0 0 0 2px ${theme.background}`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * "Save the date": the event's day as a tear-off calendar page, and a button
 * that puts it in the guest's own calendar.
 *
 * Sits directly under the countdown when the card has one, and otherwise under
 * the date or the venue; CardCanvas picks the spot. It takes no screen of its
 * own and carries no minHeight. It does not count down itself: when the live
 * countdown is on, it is right above.
 *
 * RESPECTS THE SCRATCH PANEL. A host can hide the date or the venue behind a
 * panel the guest scratches off, and a tear-off page printing the date in
 * 56px type would give the surprise away one screen later. So a hidden date
 * is hidden on the page too, under patches in the same scratch style, and the
 * time waits with it; a hidden venue is left out of the line. The page itself
 * is always there. It is one secret wherever it is shown: scratching the page
 * or the date's own panel opens both, with the same fade, and a reload in the
 * same session finds it open (ScratchReveal.tsx). The button works throughout:
 * what the guest adds is theirs to see once it is in their calendar. It is
 * AddToCalendar, which the date's own screen carries too.
 *
 * Renders nothing when the event has no date, matching the countdown above.
 */
export default function SaveTheDate({
  draft,
  theme,
  invite,
  occasionId,
  language,
  dateScratch,
  venueScratched,
}: {
  draft: EventDraft;
  theme: Theme;
  invite: CalendarInvite;
  occasionId: OccasionId;
  /** The block, and the entry it writes, are in the card's language. */
  language: CardLanguage;
  /** Set when the date is behind a scratch panel: the page's patches use it. */
  dateScratch: ScratchConfig | null;
  /** The venue is behind a scratch panel elsewhere on the card. */
  venueScratched: boolean;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLDivElement>(SECTION_REVEAL_OPTIONS);
  const dateReveal = useScratchReveal(dateScratch === null ? undefined : "date");
  const venueReveal = useScratchReveal(venueScratched ? "venue" : undefined);
  const event = calendarEvent(draft, occasionId, invite, language);
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);

  if (event === null || page === null) {
    return null;
  }

  const copy = cardCopy(language).calendar;
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  const dateHidden =
    dateScratch !== null && dateReveal.revealed === null;
  const venueHidden =
    venueScratched && venueReveal.revealed === null;

  const venue = venueHidden
    ? ""
    : draft.venueName.trim() || draft.venueAddress.trim();
  const whenWhere = [dateHidden ? null : page.time, venue].filter(
    (part): part is string => part !== null && part.length > 0,
  );

  return (
    <div
      ref={ref}
      className="flex flex-col items-center px-7 pt-2 pb-12 text-center"
      style={{ gap: cardRem(1.1) }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <h3
          className={`text-[calc(1.9*var(--card-rem,1rem))] text-balance ${
            language === "hi" ? "leading-[1.45]" : "leading-[1.15]"
          }`}
          style={{
            color: theme.accent,
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
        >
          {copy.heading}
        </h3>
      </div>

      <div className="py-2">
        <CalendarPage
          text={page}
          theme={theme}
          shown={isInView}
          label={copy.pageLabel(page.weekday, page.day, page.month, page.year)}
          isDevanagari={language === "hi"}
          scratch={dateScratch}
        />
      </div>

      {dateHidden ? (
        /*
          What each patch on the page would have carried under it, said once:
          what to do, and the way round it for a guest who cannot drag.
        */
        <div className={`-mt-2 flex flex-col items-center ${reveal}`} style={lineDelay(1)}>
          <p
            className="text-[calc(0.8125*var(--card-rem,1rem))] tracking-[0.04em]"
            style={{ color: theme.textMuted }}
          >
            {cardCopy(language).scratch.hint}
          </p>
          <button
            type="button"
            onClick={dateReveal.reveal}
            className="min-h-11 rounded-full px-3 text-xs font-medium underline decoration-transparent underline-offset-4 opacity-70 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ color: theme.accent, outlineColor: theme.accent }}
          >
            {cardCopy(language).scratch.reveal}
          </button>
        </div>
      ) : null}

      {whenWhere.length > 0 ? (
        <div className={reveal} style={lineDelay(1)}>
          <p
            className="max-w-[30ch] text-[calc(0.95*var(--card-rem,1rem))] leading-snug text-balance"
            style={{ color: theme.textPrimary }}
          >
            {whenWhere.map((part, index) => (
              /* A part that arrives with a reveal fades in rather than appears. */
              <span key={part} className="lifafa-reveal-in">
                {index > 0 ? (
                  <span aria-hidden="true" className="mx-2" style={{ color: theme.accent }}>
                    ·
                  </span>
                ) : null}
                {part}
              </span>
            ))}
          </p>
        </div>
      ) : null}

      <div className={reveal} style={lineDelay(2)}>
        <p
          className="max-w-[28ch] text-[calc(0.9*var(--card-rem,1rem))] leading-relaxed text-balance"
          style={{ color: theme.textMuted }}
        >
          {copy.subline}
        </p>
      </div>

      <div className={`mt-1 ${reveal}`} style={lineDelay(3)}>
        <AddToCalendar
          draft={draft}
          theme={theme}
          invite={invite}
          occasionId={occasionId}
          language={language}
        />
      </div>
    </div>
  );
}
