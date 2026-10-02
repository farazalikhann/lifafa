"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import CalendarSheet from "@/components/card/CalendarSheet";
import { calendarEvent, type CalendarInvite } from "@/lib/calendar";
import { cardCopy } from "@/lib/cardLanguage";
import { mixHex } from "@/lib/contrast";
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
 * The button that puts the event in the guest's own calendar, with the burst
 * it gives off and the sheet it opens.
 *
 * Lifted out of SaveTheDate, where it was written, so the date's own screen
 * can carry it too: the two are never on one card together, and whichever is
 * there remembers "Added" for the visit under the same key. Draws nothing
 * for an event with no date.
 */
export default function AddToCalendar({
  draft,
  theme,
  invite,
  occasionId,
  language,
}: {
  draft: EventDraft;
  theme: Theme;
  invite: CalendarInvite;
  occasionId: OccasionId;
  /** The button, and the entry it writes, are in the card's language. */
  language: CardLanguage;
}): ReactElement | null {
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

  if (event === null) {
    return null;
  }

  const copy = cardCopy(language).calendar;

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
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={handleTap}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          /*
            Drawn like the countdown's tiles above it — a thin accent border,
            the same soft corners, the surface leaned toward the accent — so the
            two read as one set rather than a button dropped under a clock.
          */
          className="relative inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl border px-6 text-[calc(0.95*var(--card-rem,1rem))] font-semibold tracking-[0.02em] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
          style={{
            borderColor: `${theme.accent}8c`,
            backgroundColor: mixHex(theme.surface, theme.accent, 0.05),
            color: theme.accent,
            outlineColor: theme.accent,
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
    </>
  );
}
