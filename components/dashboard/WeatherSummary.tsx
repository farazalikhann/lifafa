import type { ReactElement } from "react";
import type { EventWeather } from "@/types/weather";

/**
 * The same reading the card shows, in the dashboard's own plain style.
 *
 * None of the four card themes appears here. The dashboard is a working tool: a
 * host reads it to decide whether to hire a marquee, and an ornamental gold
 * frame around that figure would be decoration in a place that has none.
 *
 * Shown even when the host has weather switched off for guests, because the
 * question "will it rain on the day" is theirs to plan around whether or not
 * they chose to put the answer on the invitation. When it is off, the panel
 * says so, so nobody reads this as proof their guests can see it.
 */
export default function WeatherSummary({
  weather,
  showWeather,
}: {
  weather: EventWeather | null;
  /** Whether guests see this too. Only ever changes the note at the bottom. */
  showWeather: boolean;
}): ReactElement | null {
  /*
    Nothing at all when there is nothing to say. A venue that could not be
    located, an endpoint that is down, a date already past: the host gets one
    less panel, not an apology for a feature they may never have asked for.
  */
  if (weather === null) {
    return null;
  }

  const isForecast = weather.kind === "forecast";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
          {isForecast ? "Forecast for the day" : "Typical for this time of year"}
        </h2>

        <p className="text-xs text-[var(--lifafa-muted)]">
          {showWeather
            ? "Shown to guests on the invitation."
            : "Not shown to guests. This is for your planning only."}
        </p>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <p className="text-2xl font-semibold text-[var(--lifafa-cream)]">
          {weather.highC}°C
          <span className="ml-2 text-base font-normal text-[var(--lifafa-muted)]">
            high
          </span>
        </p>

        <p className="text-2xl font-semibold text-[var(--lifafa-cream)]">
          {weather.lowC}°C
          <span className="ml-2 text-base font-normal text-[var(--lifafa-muted)]">
            low
          </span>
        </p>

        <p className="text-sm text-[var(--lifafa-cream)]">{weather.condition}</p>
      </div>

      {/*
        The distinction, stated in full and never abbreviated to "typical". A
        host reading a seasonal average as a forecast is the one way this panel
        can do harm, and it is the reading someone in a hurry will reach for.
      */}
      <p className="max-w-[62ch] text-xs leading-relaxed text-[var(--lifafa-muted)]">
        {isForecast
          ? "A real forecast from Open-Meteo for your event date."
          : `Your date is beyond the forecast range, so this is what your venue is usually like at this time of year, averaged from the last ${weather.yearsAveraged ?? 0} years. It is not a forecast. A forecast will appear here about two weeks before the day.`}
      </p>
    </section>
  );
}
