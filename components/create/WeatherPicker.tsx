"use client";

import type { ReactElement } from "react";
import { WEATHER_THEMES } from "@/lib/weatherThemes";
import type { WeatherThemeId } from "@/types/weather";

/**
 * Whether guests see the weather, and how it is drawn if they do.
 *
 * Off by default and off in one click. Weather on an invitation is a nice thing
 * to offer and a strange thing to impose: a host holding an indoor reception in
 * an air conditioned hall has no use for it, and the card should not have
 * acquired a temperature reading because nobody found the switch.
 *
 * The theme list appears only once weather is on. Choosing how something looks
 * before deciding whether it exists is a question in the wrong order.
 */
export default function WeatherPicker({
  showWeather,
  weatherTheme,
  onShowWeatherChange,
  onWeatherThemeChange,
}: {
  showWeather: boolean;
  weatherTheme: WeatherThemeId;
  onShowWeatherChange: (show: boolean) => void;
  onWeatherThemeChange: (id: WeatherThemeId) => void;
}): ReactElement {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
            Weather
          </h2>
          <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
            Show guests what to expect at your venue. You will still see it on
            your own dashboard either way.
          </p>
        </div>

        {/*
          A real checkbox, styled rather than replaced. It is the control every
          assistive technology already understands as a switch, and it comes
          with the label association, the focus ring and the space bar for free.
        */}
        <label className="flex shrink-0 cursor-pointer items-center gap-2">
          <span className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
            {showWeather ? "On" : "Off"}
          </span>
          <input
            type="checkbox"
            checked={showWeather}
            onChange={(event) => onShowWeatherChange(event.target.checked)}
            className="size-5 shrink-0 cursor-pointer accent-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          />
        </label>
      </div>

      {showWeather ? (
        <div className="flex flex-col gap-2">
          {WEATHER_THEMES.map((option) => {
            const isSelected = option.id === weatherTheme;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onWeatherThemeChange(option.id)}
                className={[
                  "flex min-h-11 flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                  isSelected
                    ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                    : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-muted)]",
                ].join(" ")}
              >
                <span
                  className={`text-[0.8125rem] font-medium ${
                    isSelected
                      ? "text-[var(--lifafa-cream)]"
                      : "text-[var(--lifafa-muted)]"
                  }`}
                >
                  {option.label}
                </span>
                <span className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
                  {option.description}
                </span>
              </button>
            );
          })}

          <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
            Dates within about two weeks show a real forecast. Dates further out
            show typical weather for that time of year, labelled as such. If the
            venue cannot be located, the card simply leaves it out.
          </p>
        </div>
      ) : null}
    </section>
  );
}
