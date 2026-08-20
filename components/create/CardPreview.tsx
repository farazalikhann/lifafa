import type { ReactElement } from "react";
import { getTheme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/**
 * Resolves a draft field to what the card should show. Empty fields fall back
 * to a placeholder, which the card renders at reduced opacity so it never reads
 * as real content.
 */
interface FieldValue {
  text: string;
  isPlaceholder: boolean;
}

function resolve(value: string, placeholder: string): FieldValue {
  const trimmed = value.trim();
  return trimmed.length > 0
    ? { text: trimmed, isPlaceholder: false }
    : { text: placeholder, isPlaceholder: true };
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
};

const TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
};

/**
 * "Sunday, 14 December 2026 at 7:00 PM".
 *
 * The time is always appended before parsing: `new Date("2026-12-14")` is read
 * as UTC and can land on the previous day in India, while
 * `new Date("2026-12-14T00:00")` is read as local time. Returns null for an
 * empty or unparseable date so the caller can fall back to the placeholder.
 */
function formatWhen(eventDate: string, eventTime: string): string | null {
  if (eventDate.trim().length === 0) {
    return null;
  }

  const hasTime = /^\d{2}:\d{2}/.test(eventTime);
  const parsed = new Date(`${eventDate}T${hasTime ? eventTime : "00:00"}`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const datePart = new Intl.DateTimeFormat("en-IN", DATE_FORMAT).format(parsed);

  if (!hasTime) {
    return datePart;
  }

  // ICU separates the day period with a narrow no-break space and may lower
  // case it; normalise both so the card always reads "7:00 PM".
  const timePart = new Intl.DateTimeFormat("en-IN", TIME_FORMAT)
    .format(parsed)
    .replace(/[\u202F\u00A0]/g, " ")
    .replace(/\s*(am|pm)\s*$/i, (_match, period: string) => ` ${period.toUpperCase()}`);

  return `${datePart} at ${timePart}`;
}

/** Small line-art flourish, mirrored for the bottom of the card. */
function Flourish({ flipped = false }: { flipped?: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 120 14"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-[14px] w-[110px] shrink-0 ${flipped ? "rotate-180" : ""}`}
    >
      <path d="M4 7 H44" />
      <path d="M76 7 H116" />
      <path d="M60 1.5 L66.5 7 L60 12.5 L53.5 7 Z" />
      <path d="M48 7 L51 4.5 M48 7 L51 9.5" />
      <path d="M72 7 L69 4.5 M72 7 L69 9.5" />
    </svg>
  );
}

export default function CardPreview({
  draft,
}: {
  draft: EventDraft;
}): ReactElement {
  const theme = getTheme(draft.themeId);

  const hosts = resolve(draft.hostNames, "Your names");
  const title = resolve(draft.eventTitle, "Event title");
  const venue = resolve(draft.venueName, "Venue name");
  const address = resolve(draft.venueAddress, "Venue address");

  const when = formatWhen(draft.eventDate, draft.eventTime);
  const whenText = when ?? "Date and time";
  const message = draft.message.trim();

  return (
    /*
      justify-between pins the two flourishes to a matching inset from the top
      and bottom edges; the interior uses justify-evenly so the lines spread
      through the card instead of bunching in the middle.
    */
    <div
      className="mx-auto flex aspect-[3/4] w-full max-w-[380px] flex-col items-center justify-between overflow-hidden rounded-2xl px-5 py-6 text-center shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)] sm:px-6 sm:py-7"
      style={{
        backgroundColor: theme.background,
        color: theme.textPrimary,
        fontFamily: theme.fontFamily,
      }}
    >
      <span className="shrink-0" style={{ color: theme.accent }}>
        <Flourish />
      </span>

      <div className="flex w-full flex-1 flex-col items-center justify-evenly py-1">
        {/* 1 — host names, then 4 — event title, kept as one block */}
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-[1.75rem] leading-[1.05] font-semibold tracking-[-0.015em] text-balance sm:text-[2rem]"
            style={{ opacity: hosts.isPlaceholder ? 0.4 : 1 }}
          >
            {hosts.text}
          </p>

          <p
            className="text-[0.625rem] tracking-[0.28em] uppercase sm:text-[0.6875rem]"
            style={{
              color: theme.textMuted,
              opacity: title.isPlaceholder ? 0.5 : 1,
            }}
          >
            {title.text}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="h-px w-14"
          style={{ backgroundColor: theme.accent, opacity: 0.45 }}
        />

        {/* 2 — the date carries the second-largest weight on the card */}
        <p
          className="max-w-[24ch] text-[1rem] leading-snug font-medium tracking-[0.05em] text-balance sm:text-[1.125rem]"
          style={{ opacity: when === null ? 0.4 : 1 }}
        >
          {whenText}
        </p>

        {/* 3 — venue name, then 5 — address */}
        <div className="flex flex-col items-center gap-1.5">
          <p
            className="text-[0.9375rem] font-medium"
            style={{ opacity: venue.isPlaceholder ? 0.4 : 1 }}
          >
            {venue.text}
          </p>
          <p
            className="line-clamp-2 max-w-[26ch] text-[0.6875rem] leading-relaxed text-balance sm:text-xs"
            style={{
              color: theme.textMuted,
              opacity: address.isPlaceholder ? 0.55 : 1,
            }}
          >
            {address.text}
          </p>
        </div>

        {/* 6 — host message, only when written */}
        {message.length > 0 ? (
          <p
            className="line-clamp-2 max-w-[30ch] text-[0.625rem] leading-relaxed text-balance italic sm:text-[0.6875rem]"
            style={{ color: theme.textMuted }}
          >
            {message}
          </p>
        ) : null}
      </div>

      <span className="shrink-0" style={{ color: theme.accent }}>
        <Flourish flipped />
      </span>
    </div>
  );
}
