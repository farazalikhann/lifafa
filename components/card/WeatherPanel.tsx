"use client";

import type { ReactElement } from "react";
import { formatDateAndTime } from "@/lib/cardFormat";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import { getWeatherTheme } from "@/lib/weatherThemes";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { EventWeather, WeatherIcon } from "@/types/weather";

/**
 * The weather, drawn four ways.
 *
 * One component rather than four files, because the four differ only in their
 * frame: every one of them says the same three things in the same words, and
 * splitting them up would be four places to keep one sentence consistent in.
 *
 * The wording is the part that matters most here. A forecast and a seasonal
 * average are not the same claim, and a guest deciding what to wear to an
 * outdoor wedding is entitled to know which one they are reading. Nothing in
 * this file lets the two share a phrasing — and that holds in every language,
 * because the sentences themselves live in lib/cardLanguage.ts in pairs.
 */

/* ────────────────────────── Wording ────────────────────────── */

/**
 * The line that says what kind of reading this is.
 *
 * Deliberately not "Weather" in either case. A bare heading over two numbers
 * reads as a forecast whatever the numbers actually are, and the seasonal case
 * is the one where that mistake costs somebody a wet afternoon.
 */
function headingOf(weather: EventWeather, copy: CardCopy["weather"]): string {
  return weather.kind === "forecast"
    ? copy.forecastHeading
    : copy.seasonalHeading;
}

/** "29°C high, 21°C low". The unit is stated, once, rather than assumed. */
function rangeOf(weather: EventWeather, copy: CardCopy["weather"]): string {
  return copy.range(weather.highC, weather.lowC);
}

/**
 * The qualifier that follows a seasonal reading, and null after a forecast.
 *
 * It says the number of years out loud. "Typical" on its own is a word a reader
 * can take as loosely or as literally as they like; "averaged from the last 5
 * years" is a statement they can judge.
 */
function noteOf(
  weather: EventWeather,
  copy: CardCopy["weather"],
): string | null {
  if (weather.kind === "forecast" || weather.yearsAveraged === null) {
    return null;
  }

  return copy.seasonalNote(weather.yearsAveraged);
}

/** The whole reading as one sentence, for the layouts that have room for one line. */
function sentenceOf(weather: EventWeather, copy: CardCopy["weather"]): string {
  const range = rangeOf(weather, copy);
  const condition = copy.condition(weather);

  return weather.kind === "forecast"
    ? copy.forecastSentence(range, condition)
    : copy.seasonalSentence(range, condition);
}

/* ────────────────────────── The icon ────────────────────────── */

/**
 * Six drawings, inline, sharing one 24 unit box.
 *
 * `currentColor` throughout, so each theme below sets the colour once on a
 * parent and the icon follows. No library and no image: this is a handful of
 * circles and lines, and a dependency for it would be heavier than the card.
 */
function WeatherGlyph({
  icon,
  size,
}: {
  icon: WeatherIcon;
  size: number;
}): ReactElement {
  const cloud = (
    <path
      d="M7.5 18h9a3.5 3.5 0 0 0 .4-6.98A5.5 5.5 0 0 0 6.4 12.1 3.2 3.2 0 0 0 7.5 18Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  );

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      /* The same px as the attributes, grown with a fluid card. */
      style={{ width: cardPx(size), height: cardPx(size) }}
      role="presentation"
      focusable="false"
      aria-hidden
      className="shrink-0"
    >
      {icon === "sun" ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="12" cy="12" r="4.4" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" />
        </g>
      ) : null}

      {icon === "cloud" ? cloud : null}

      {icon === "fog" ? (
        <g>
          {cloud}
          <path
            d="M5 20.6h14M7 22.9h10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            opacity="0.7"
          />
        </g>
      ) : null}

      {icon === "rain" ? (
        <g>
          {cloud}
          <path
            d="M9 20v2.4M12 20.4v2.6M15 20v2.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {icon === "snow" ? (
        <g>
          {cloud}
          <g fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
            <path d="M8.4 20.4v2.2M7.4 21.5h2M11.6 20.4v2.2M10.6 21.5h2M14.8 20.4v2.2M13.8 21.5h2" />
          </g>
        </g>
      ) : null}

      {icon === "storm" ? (
        <g>
          {cloud}
          <path
            d="M12.6 19.6 10.4 23h2.6l-1 2.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      ) : null}
    </svg>
  );
}

/** The gold flourish the ornamental frame is built from, drawn twice. */
function FrameRule({ flip }: { flip?: boolean }): ReactElement {
  return (
    <svg
      viewBox="0 0 120 8"
      width="120"
      height="8"
      style={{ width: cardPx(120), height: cardPx(8) }}
      role="presentation"
      focusable="false"
      aria-hidden
      className={flip === true ? "rotate-180" : undefined}
    >
      <path
        d="M0 4h44M76 4h44"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M60 0.6 66 4l-6 3.4L54 4Z"
        fill="currentColor"
        opacity="0.8"
      />
    </svg>
  );
}

/* ────────────────────────── The panel ────────────────────────── */

export default function WeatherPanel({
  weather,
  themeId,
  theme,
  draft,
  language,
}: {
  weather: EventWeather;
  /** Raw, as stored. Resolved here so an unknown id cannot reach a switch. */
  themeId: string | null;
  theme: Theme;
  draft: EventDraft;
  /** The language every line of the reading is written in, the condition included. */
  language: CardLanguage;
}): ReactElement {
  const copy = cardCopy(language).weather;
  const variant = getWeatherTheme(themeId).id;
  const heading = headingOf(weather, copy);
  const range = rangeOf(weather, copy);
  const note = noteOf(weather, copy);
  const condition = copy.condition(weather);

  if (variant === "minimal") {
    return (
      <section className="px-7 pb-10 text-center">
        <p
          className="mx-auto max-w-[36ch] text-[calc(0.85*var(--card-rem,1rem))] leading-relaxed text-pretty"
          style={{ color: theme.textMuted }}
        >
          {sentenceOf(weather, copy)}
        </p>
      </section>
    );
  }

  if (variant === "strip") {
    const when = formatDateAndTime(draft.eventDate, draft.eventTime, language);

    return (
      <section className="px-5 pb-10">
        <div
          className="flex w-full flex-col items-center gap-1.5 px-5 py-4 text-center"
          style={{
            backgroundColor: theme.surface,
            borderTop: `1px solid ${theme.accent}33`,
            borderBottom: `1px solid ${theme.accent}33`,
          }}
        >
          <div
            className="flex items-center gap-2.5"
            style={{ color: theme.accent }}
          >
            <WeatherGlyph icon={weather.icon} size={22} />
            <p className="text-[calc(0.9*var(--card-rem,1rem))] font-medium">{condition}</p>
          </div>

          {when !== null ? (
            <p
              className="text-[calc(0.75*var(--card-rem,1rem))] tracking-[0.14em] uppercase"
              style={{ color: theme.textMuted }}
            >
              {when}
            </p>
          ) : null}

          <p
            className="text-[calc(0.95*var(--card-rem,1rem))] font-medium"
            style={{ color: theme.textPrimary }}
          >
            {range}
          </p>

          <p
            className="max-w-[38ch] text-[calc(0.72*var(--card-rem,1rem))] leading-relaxed text-pretty"
            style={{ color: theme.textMuted }}
          >
            {note ?? heading}
          </p>
        </div>
      </section>
    );
  }

  if (variant === "ornamental") {
    return (
      <section className="px-7 pb-10">
        <div
          className="mx-auto flex max-w-[calc(320*var(--card-px,1px))] flex-col items-center gap-3 px-6 py-6 text-center"
          style={{
            backgroundColor: theme.surface,
            border: `1px solid ${theme.accent}55`,
            borderRadius: 2,
          }}
        >
          <div style={{ color: theme.accent }}>
            <FrameRule />
          </div>

          <p
            className="text-[calc(0.68*var(--card-rem,1rem))] tracking-[0.22em] uppercase"
            style={{ color: theme.textMuted }}
          >
            {heading}
          </p>

          <div style={{ color: theme.accent }}>
            <WeatherGlyph icon={weather.icon} size={34} />
          </div>

          <p
            className="text-[calc(1.05*var(--card-rem,1rem))] leading-snug"
            style={{
              color: theme.textPrimary,
              fontFamily: "var(--card-heading)",
              fontWeight: "var(--card-heading-weight)" as unknown as number,
            }}
          >
            {range}
          </p>

          <p className="text-[calc(0.85*var(--card-rem,1rem))]" style={{ color: theme.textPrimary }}>
            {condition}
          </p>

          {note !== null ? (
            <p
              className="max-w-[30ch] text-[calc(0.72*var(--card-rem,1rem))] leading-relaxed text-pretty"
              style={{ color: theme.textMuted }}
            >
              {note}
            </p>
          ) : null}

          <div style={{ color: theme.accent }}>
            <FrameRule flip />
          </div>
        </div>
      </section>
    );
  }

  /* "panel", and the fallback any unknown id resolves to before it gets here. */
  return (
    <section className="px-7 pb-10">
      <div
        className="mx-auto flex max-w-[calc(320*var(--card-px,1px))] items-start gap-4 rounded-2xl px-5 py-4"
        style={{
          backgroundColor: theme.surface,
          border: `1px solid ${theme.accent}33`,
        }}
      >
        <div className="pt-0.5" style={{ color: theme.accent }}>
          <WeatherGlyph icon={weather.icon} size={30} />
        </div>

        <div className="flex min-w-0 flex-col gap-1 text-left">
          <p
            className="text-[calc(0.68*var(--card-rem,1rem))] tracking-[0.18em] uppercase"
            style={{ color: theme.textMuted }}
          >
            {heading}
          </p>

          <p
            className="text-[calc(0.95*var(--card-rem,1rem))] font-medium"
            style={{ color: theme.textPrimary }}
          >
            {range}
          </p>

          <p className="text-[calc(0.85*var(--card-rem,1rem))]" style={{ color: theme.textPrimary }}>
            {condition}
          </p>

          {note !== null ? (
            <p
              className="text-[calc(0.72*var(--card-rem,1rem))] leading-relaxed text-pretty"
              style={{ color: theme.textMuted }}
            >
              {note}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
