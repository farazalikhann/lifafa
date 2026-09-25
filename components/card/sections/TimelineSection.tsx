"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import CalendarSheet from "@/components/card/CalendarSheet";
import CeremonyIcon from "@/components/card/CeremonyIcon";
import { useStillHidden } from "@/components/card/ScratchReveal";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { functionCalendarEvent, type CalendarInvite } from "@/lib/calendar";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  calendarPageText,
  directionsUrl,
  formatDateChip,
  formatWeekday,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { cardPx, cardRem } from "@/lib/cardScale";
import {
  hasTimeline,
  timelineEntries,
  timelinePhases,
  type TimelineEntry,
  type TimelinePhase,
} from "@/lib/cardSections";
import { ceremonyKind } from "@/lib/ceremonies";
import { mixHex, readableOn } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** How often the chips are brought up to date while the card is open. */
const PHASE_REFRESH_MS = 60 * 1000;

/** Rows that come into view together arrive this far apart. */
const ROW_STAGGER_MS = 90;

/** A small map pin before a venue, the location card's in miniature. */
function PinIcon({ color }: { color: string }): ReactElement {
  return (
    <svg viewBox="0 0 12 16" width="0.7em" height="0.95em" aria-hidden="true" className="mt-[0.3em] shrink-0">
      <path d="M6 15.5S1 9.6 1 6a5 5 0 0 1 10 0c0 3.6-5 9.5-5 9.5Z" fill={color} />
      <circle cx="6" cy="6" r="1.9" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 16 16" width="0.95em" height="0.95em" fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function RouteIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" aria-hidden="true">
      <path d="M12 21.5s-6.5-6.9-6.5-11.5a6.5 6.5 0 0 1 13 0c0 4.6-6.5 11.5-6.5 11.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

const ACTION_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-2.5 text-[calc(0.8*var(--card-rem,1rem))] font-medium underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-45";

/**
 * One function on the timeline: its medallion on the thread and its card.
 *
 * Its own observer, so a long timeline's rows arrive as each is scrolled to
 * rather than all at once when the first is. Rows that arrive together are
 * staggered by their place, a step apart.
 */
function TimelineRow({
  entry,
  index,
  phase,
  hideWhen,
  hideWhere,
  theme,
  language,
  copy,
  onAddToCalendar,
  canAddToCalendar,
}: {
  entry: TimelineEntry;
  index: number;
  /** Null until the section has read the clock, after mount. */
  phase: TimelinePhase | null;
  /** The date is still behind a scratch panel: this is the main event and it is hidden. */
  hideWhen: boolean;
  /** The same for the venue. */
  hideWhere: boolean;
  theme: Theme;
  language: CardLanguage;
  copy: CardCopy;
  onAddToCalendar: () => void;
  /** Whether the function has a date to write into a calendar at all. */
  canAddToCalendar: boolean;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLLIElement>(SECTION_REVEAL_OPTIONS);

  const page = calendarPageText(entry.date, entry.time, language);
  const chip = hideWhen ? null : formatDateChip(entry.date, language);
  const weekday = hideWhen ? null : formatWeekday(entry.date, entry.time, language);
  const time = hideWhen ? null : (page?.time ?? null);
  const venue = hideWhere ? "" : entry.venueName.trim();
  const note = entry.note?.trim() ?? "";
  const directions = directionsUrl(entry.venueName, entry.venueAddress, entry.mapsLink);

  /* No chip while the date is hidden: "Up next" on the main event is a clue. */
  const shownPhase = hideWhen ? null : phase;
  const isPast = shownPhase === "past";
  const isNext = shownPhase === "next";

  const onAccent = readableOn(theme.accent, [theme.background, theme.textPrimary]);
  const hairline = `${theme.textMuted}4D`;
  /* What arrives with a scratch reveal fades in, as it does under Save the date. */
  const arrives = entry.id === "primary" ? " lifafa-reveal-in" : "";

  const when = [weekday, time].filter((part): part is string => part !== null);

  return (
    <li
      ref={ref}
      className="lifafa-tl-row"
      data-shown={isInView ? "true" : "false"}
      data-side={index % 2 === 0 ? "left" : "right"}
      data-phase={shownPhase ?? "none"}
      style={{ "--tl-delay": `${(index % 3) * ROW_STAGGER_MS}ms` } as CSSProperties}
    >
      <span
        className="lifafa-tl-medal relative flex items-center justify-center rounded-full"
        data-next={isNext ? "true" : undefined}
        style={
          {
            width: "var(--tl-medal)",
            height: "var(--tl-medal)",
            color: theme.accent,
            backgroundColor: theme.surface,
            border: `1.5px solid ${theme.accent}`,
            boxShadow: `0 0 0 ${cardPx(4)} ${theme.background}`,
            "--tl-accent": theme.accent,
          } as CSSProperties
        }
        aria-hidden="true"
      >
        <CeremonyIcon kind={ceremonyKind(entry.label)} size={cardRem(1.45)} />
      </span>

      <article
        className="lifafa-tl-card min-w-0 rounded-2xl px-4 pt-3 pb-1.5 text-left"
        style={{
          backgroundColor: isPast ? "transparent" : theme.surface,
          border: `1px ${isPast ? "dashed" : "solid"} ${hairline}`,
        }}
      >
        {chip !== null || isPast || isNext ? (
          <div className={`mb-1.5 flex flex-wrap items-center gap-1.5${arrives}`}>
            {chip !== null ? (
              <span
                className="rounded-full px-2.5 py-0.5 text-[calc(0.72*var(--card-rem,1rem))] font-semibold tracking-[0.04em]"
                style={{ color: theme.textPrimary, border: `1px solid ${theme.accent}66` }}
              >
                {chip}
              </span>
            ) : null}
            {isNext ? (
              <span
                className="rounded-full px-2.5 py-0.5 text-[calc(0.72*var(--card-rem,1rem))] font-semibold"
                style={{ backgroundColor: theme.accent, color: onAccent }}
              >
                {copy.timeline.upNext}
              </span>
            ) : null}
            {isPast ? (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[calc(0.72*var(--card-rem,1rem))] font-medium"
                style={{ color: theme.textMuted, border: `1px solid ${hairline}` }}
              >
                <CheckIcon />
                {copy.timeline.celebrated}
              </span>
            ) : null}
          </div>
        ) : null}

        <h4
          className="text-[calc(1.1*var(--card-rem,1rem))] break-words"
          style={{
            color: isPast ? theme.textMuted : theme.textPrimary,
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
            lineHeight: copy.script === "devanagari" ? 1.5 : 1.3,
          }}
        >
          {entry.label}
        </h4>

        {when.length > 0 ? (
          <p
            className={`mt-0.5 text-[calc(0.8125*var(--card-rem,1rem))] leading-relaxed${arrives}`}
            style={{ color: theme.accent }}
          >
            {when.join(" · ")}
          </p>
        ) : null}

        {venue.length > 0 ? (
          <p
            className={`mt-0.5 flex items-start gap-1.5 text-[calc(0.8125*var(--card-rem,1rem))] leading-relaxed break-words${arrives}`}
            style={{ color: theme.textMuted }}
          >
            <PinIcon color={theme.accent} />
            <span className="min-w-0">{venue}</span>
          </p>
        ) : null}

        {note.length > 0 ? (
          <p
            className="mt-1 text-[calc(0.78*var(--card-rem,1rem))] leading-relaxed break-words text-pretty italic"
            style={{ color: theme.textMuted }}
          >
            {note}
          </p>
        ) : null}

        {directions !== null || canAddToCalendar ? (
          /*
            Two small actions, 44px tall however small the words, pulled back to
            the card's left edge so the words line up with the text above.
          */
          <div className="-ml-2.5 mt-0.5 flex flex-wrap items-center">
            {directions !== null ? (
              hideWhere ? (
                <button type="button" disabled className={ACTION_CLASS} style={{ color: theme.accent }}>
                  <RouteIcon />
                  {copy.timeline.directions}
                </button>
              ) : (
                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ACTION_CLASS}
                  style={{ color: theme.accent, outlineColor: theme.accent }}
                >
                  <RouteIcon />
                  {copy.timeline.directions}
                </a>
              )
            ) : null}
            {canAddToCalendar ? (
              <button
                type="button"
                onClick={onAddToCalendar}
                /* The entry would hand over a hidden date or venue. */
                disabled={hideWhen || hideWhere}
                aria-haspopup="dialog"
                className={ACTION_CLASS}
                style={{ color: theme.accent, outlineColor: theme.accent }}
              >
                <CalendarIcon />
                {copy.timeline.addToCalendar}
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  );
}

/**
 * Every function of the celebration, as a thread with a medallion for each.
 *
 * THE THREAD is an accent line down the timeline that draws itself as the
 * guest scrolls: one scroll listener, throttled to a frame, reading the
 * timeline's position and setting a scaleY on the line. Only a transform moves,
 * so nothing is laid out again. Under reduced motion it is simply drawn.
 *
 * EACH FUNCTION gets a medallion on the thread, its drawing chosen from its
 * name (lib/ceremonies.ts), and a card: the date as a chip, the weekday and
 * time, the venue with a pin, the note, and two actions, Get directions and
 * Add to calendar, which opens the same calendar sheet as Save the date for
 * that function's own date, time and venue. On a laptop the cards alternate
 * either side of the thread; on a phone they are one column with the thread
 * on the left. See .lifafa-tl in globals.css.
 *
 * WHERE EACH STANDS, by the Indian clock, read after mount and every minute:
 * the next function still to come says "Up next" and its medallion breathes,
 * one that is over is faded with "Celebrated", and one with no date says
 * nothing.
 *
 * THE MAIN EVENT'S ROW repeats its date and venue. When the host hid either
 * behind a scratch panel, the row holds it back, and holds back the actions
 * that would hand it over, until it is scratched anywhere on the card; the
 * other functions are not what the panel hides.
 */
export default function TimelineSection({
  draft,
  theme,
  minHeight,
  pad,
  language,
  invite,
  occasionId,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  language: CardLanguage;
  /** The invitation the calendar entries point back at. */
  invite: CalendarInvite;
  /** For the calendar entry's title, which names the couple as the card does. */
  occasionId: OccasionId;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const dateHidden = useStillHidden("date");
  const venueHidden = useStillHidden("venue");

  /** null until mounted, so the server and the first paint agree: no chips. */
  const [now, setNow] = useState<Date | null>(null);
  const [sheetFor, setSheetFor] = useState<string | null>(null);

  const trackRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), PHASE_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  /*
    The thread follows the scroll. Captured on the window, so it hears the
    guest's page and the editor's scrolling frame alike, and throttled to one
    read and one write a frame.
  */
  useEffect(() => {
    const track = trackRef.current;
    const thread = threadRef.current;

    if (track === null || thread === null) {
      return;
    }

    if (reducedMotion) {
      thread.style.transform = "scaleY(1)";
      return;
    }

    let frame = 0;

    const update = (): void => {
      frame = 0;
      const rect = track.getBoundingClientRect();
      const progress = (window.innerHeight * 0.72 - rect.top) / Math.max(1, rect.height);
      thread.style.transform = `scaleY(${Math.min(1, Math.max(0, progress)).toFixed(4)})`;
    };

    const schedule = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [reducedMotion]);

  /*
    Asked of hasTimeline, not of the row count. The two are no longer the same
    question — a card with a date and no sub-events has one entry and no
    timeline — and CardCanvas places the dividers from hasTimeline, so a null
    return decided any other way would strand a divider beside nothing.
  */
  if (!hasTimeline(draft)) {
    return null;
  }

  const copy = cardCopy(language);
  const entries = timelineEntries(draft, language);
  const phases = now === null ? null : timelinePhases(entries, now);
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  const sheetEntry = entries.find((entry) => entry.id === sheetFor) ?? null;
  const sheetEvent =
    sheetEntry === null
      ? null
      : functionCalendarEvent(draft, sheetEntry, occasionId, invite, language);

  return (
    <section
      ref={ref}
      className="flex flex-col justify-center px-7"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: `calc(1.5 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
      }}
    >
      <p
        className={`text-center text-[calc(0.7*var(--card-rem,1rem))] tracking-[0.24em] uppercase ${reveal}`}
        style={{ color: theme.textMuted, transitionDelay: "0ms" }}
      >
        {copy.timeline.heading}
      </p>

      <div
        ref={trackRef}
        className="lifafa-tl relative"
        style={{ "--tl-medal": cardRem(2.75) } as CSSProperties}
      >
        {/* The thread's bed, faint, and the thread itself, drawn over it. */}
        <span
          aria-hidden="true"
          className="lifafa-tl-line"
          style={{ backgroundColor: mixHex(theme.background, theme.accent, 0.22) }}
        />
        <span
          ref={threadRef}
          aria-hidden="true"
          className="lifafa-tl-line lifafa-tl-thread"
          style={{ backgroundColor: theme.accent }}
        />

        <ol
          className="relative flex flex-col"
          style={{ gap: `calc(1.25 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))` }}
        >
          {entries.map((entry, index) => {
            const isPrimary = entry.id === "primary";

            return (
              <TimelineRow
                key={entry.id}
                entry={entry}
                index={index}
                phase={phases?.get(entry.id) ?? null}
                hideWhen={isPrimary && dateHidden}
                hideWhere={isPrimary && venueHidden}
                theme={theme}
                language={language}
                copy={copy}
                canAddToCalendar={
                  functionCalendarEvent(draft, entry, occasionId, invite, language) !== null
                }
                onAddToCalendar={() => setSheetFor(entry.id)}
              />
            );
          })}
        </ol>
      </div>

      {sheetEntry !== null && sheetEvent !== null ? (
        <CalendarSheet
          event={sheetEvent}
          inviteCode={invite.code}
          functionId={sheetEntry.id}
          isPreview={invite.url === null}
          theme={theme}
          language={language}
          onClose={() => setSheetFor(null)}
          onAdded={() => setSheetFor(null)}
        />
      ) : null}
    </section>
  );
}
