"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import CalendarSheet from "@/components/card/CalendarSheet";
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

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Where "Added to calendar" is remembered, per invitation, for this visit. */
function addedKey(code: string): string {
  return `lifafa:calendar-added:${code}`;
}

/**
 * How long the sparkle is given before the sheet covers the button. Enough for
 * the burst to be seen leaving the button, not enough to feel like a wait.
 */
const SHEET_DELAY_MS = 160;

/** The burst: under a second, then its elements are gone from the DOM. */
const SPARKLE_MS = 760;
const SPARKLE_COUNT = 14;

interface Sparkle {
  readonly id: number;
  readonly dx: number;
  readonly dy: number;
  readonly spin: number;
  readonly size: number;
  readonly color: string;
  readonly star: boolean;
  readonly delay: number;
}

/**
 * One burst's particles, thrown out round an ellipse the size of the button so
 * a wide pill sprays sideways as well as up. Built in the tap's handler, never
 * during render, which is why a random offset is fine here.
 */
function burst(width: number, height: number, colors: readonly string[]): Sparkle[] {
  return Array.from({ length: SPARKLE_COUNT }, (_, index) => {
    const angle =
      (index / SPARKLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const reach = 14 + Math.random() * 22;

    return {
      id: index,
      dx: Math.cos(angle) * (width / 2 + reach),
      dy: Math.sin(angle) * (height / 2 + reach),
      spin: (Math.random() - 0.5) * 240,
      size: 9 + Math.random() * 8,
      color: colors[index % colors.length],
      star: index % 3 !== 2,
      delay: Math.random() * 90,
    };
  });
}

function CalendarIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="1.25em" height="1.25em" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
}: {
  text: CalendarPageText;
  theme: Theme;
  shown: boolean;
  label: string;
  /** Devanagari needs room above for its headstroke and matras. */
  isDevanagari: boolean;
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
          {text.month} {text.year}
        </div>

        <div className="relative flex flex-col items-center px-2 pt-2 pb-4">
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
 * takes the page and the time line with it, and a hidden venue leaves the
 * line with the time alone. The button still works: what the guest adds is
 * theirs to see once it is in their calendar.
 *
 * Renders nothing when the event has no date, matching the countdown above.
 */
export default function SaveTheDate({
  draft,
  theme,
  invite,
  occasionId,
  language,
  hideDate,
  hideVenue,
}: {
  draft: EventDraft;
  theme: Theme;
  invite: CalendarInvite;
  occasionId: OccasionId;
  /** The block, and the entry it writes, are in the card's language. */
  language: CardLanguage;
  /** The date is behind a scratch panel elsewhere on the card. */
  hideDate: boolean;
  /** The venue is behind a scratch panel elsewhere on the card. */
  hideVenue: boolean;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLDivElement>(SECTION_REVEAL_OPTIONS);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [sparkles, setSparkles] = useState<{ key: number; items: Sparkle[] } | null>(null);
  const timers = useRef<number[]>([]);

  /*
    Read after mount, never during render: the server has no session storage,
    and a button that said "Added" in the HTML and "Add" once hydrated would be
    a mismatch on a card whose whole job is to be opened on a phone.
  */
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(addedKey(invite.code)) === "1") {
        setIsAdded(true);
      }
    } catch {
      /* Storage blocked: the button simply starts as "Add". */
    }
  }, [invite.code]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const event = calendarEvent(draft, occasionId, invite, language);
  const page = calendarPageText(draft.eventDate, draft.eventTime, language);

  if (event === null || page === null) {
    return null;
  }

  const copy = cardCopy(language).calendar;
  const onAccent = readableOn(theme.accent, [theme.background, theme.textPrimary]);
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  const venue = hideVenue
    ? ""
    : draft.venueName.trim() || draft.venueAddress.trim();
  const whenWhere = hideDate
    ? []
    : [page.time, venue].filter(
        (part): part is string => part !== null && part.length > 0,
      );

  const later = (callback: () => void, delay: number): void => {
    timers.current.push(window.setTimeout(callback, delay));
  };

  const handleTap = (): void => {
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia(REDUCED_MOTION_QUERY).matches;

    if (reduced || buttonRef.current === null) {
      setIsOpen(true);
      return;
    }

    const { width, height } = buttonRef.current.getBoundingClientRect();
    const key = Date.now();

    setSparkles({
      key,
      items: burst(width, height, [
        theme.accent,
        mixHex(theme.accent, "#FFFFFF", 0.45),
        theme.textPrimary,
        mixHex(theme.accent, theme.textMuted, 0.5),
      ]),
    });

    later(() => setIsOpen(true), SHEET_DELAY_MS);
    later(
      () => setSparkles((current) => (current?.key === key ? null : current)),
      SPARKLE_MS + 120,
    );
  };

  const handleClose = (): void => {
    setIsOpen(false);
    /* Back where the guest was, so a keyboard user is not dropped at the top. */
    buttonRef.current?.focus();
  };

  const handleAdded = (): void => {
    setIsAdded(true);
    setIsOpen(false);

    try {
      window.sessionStorage.setItem(addedKey(invite.code), "1");
    } catch {
      /* Remembered for this render only; nothing else depends on it. */
    }
  };

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

      {hideDate ? null : (
        <div className="py-2">
          <CalendarPage
            text={page}
            theme={theme}
            shown={isInView}
            label={copy.pageLabel(page.weekday, page.day, page.month, page.year)}
            isDevanagari={language === "hi"}
          />
        </div>
      )}

      {whenWhere.length > 0 ? (
        <div className={reveal} style={lineDelay(1)}>
          <p
            className="max-w-[30ch] text-[calc(0.95*var(--card-rem,1rem))] leading-snug text-balance"
            style={{ color: theme.textPrimary }}
          >
            {whenWhere.map((part, index) => (
              <span key={part}>
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

      <div className={`relative mt-1 ${reveal}`} style={lineDelay(3)}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleTap}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className="relative inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full px-6 text-[calc(0.95*var(--card-rem,1rem))] font-semibold transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
          style={{
            backgroundColor: theme.accent,
            color: onAccent,
            outlineColor: theme.accent,
            boxShadow: `0 6px 18px -8px ${theme.accent}`,
          }}
        >
          {isAdded ? <CheckIcon /> : <CalendarIcon />}
          <span>{isAdded ? copy.added : copy.add}</span>
        </button>

        {sparkles === null ? null : (
          <span
            key={sparkles.key}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            {sparkles.items.map((sparkle) => (
              <span
                key={sparkle.id}
                className="lifafa-sparkle"
                style={
                  {
                    "--sx": `${sparkle.dx.toFixed(1)}px`,
                    "--sy": `${sparkle.dy.toFixed(1)}px`,
                    "--sr": `${sparkle.spin.toFixed(0)}deg`,
                    width: sparkle.size,
                    height: sparkle.size,
                    color: sparkle.color,
                    animationDelay: `${sparkle.delay.toFixed(0)}ms`,
                  } as CSSProperties
                }
              >
                {sparkle.star ? (
                  <svg viewBox="0 0 10 10" width="100%" height="100%">
                    <path d="M5 0l1.2 3.8L10 5 6.2 6.2 5 10 3.8 6.2 0 5l3.8-1.2z" fill="currentColor" />
                  </svg>
                ) : (
                  <span className="block h-full w-full scale-50 rounded-full bg-current" />
                )}
              </span>
            ))}
          </span>
        )}
      </div>

      {isOpen ? (
        <CalendarSheet
          event={event}
          inviteCode={invite.code}
          isPreview={invite.url === null}
          theme={theme}
          language={language}
          onClose={handleClose}
          onAdded={handleAdded}
        />
      ) : null}
    </div>
  );
}
