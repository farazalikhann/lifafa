/**
 * The table of weather panel themes, and the lookups that read it.
 *
 * One hand written list is the whole source of truth: the designer renders it
 * in order, and the card looks a saved id up in it. See types/weather.ts on why
 * an id here is permanent.
 */

import type { WeatherThemeId, WeatherThemeOption } from "@/types/weather";

export const WEATHER_THEMES: readonly WeatherThemeOption[] = [
  {
    id: "minimal",
    label: "Minimal",
    description: "One quiet line of text. No icon and no box.",
  },
  {
    id: "panel",
    label: "Panel",
    description: "A bordered card in the invitation's own colours, with an icon.",
  },
  {
    id: "strip",
    label: "Strip",
    description: "A full width band showing the date, the sky and the range.",
  },
  {
    id: "ornamental",
    label: "Ornamental",
    description: "Cream and gold, framed to match the rest of the card.",
  },
];

/** What a card gets before the host picks anything. */
export const DEFAULT_WEATHER_THEME: WeatherThemeId = "panel";

/** The option every unknown id falls back to, kept here so lookups cannot fail. */
const FALLBACK_OPTION: WeatherThemeOption = WEATHER_THEMES[0];

/** True when the value is one of the saved theme ids. */
export function isWeatherThemeId(value: unknown): value is WeatherThemeId {
  return WEATHER_THEMES.some((option) => option.id === value);
}

/**
 * The option a saved id names, or the quietest one when it names nothing.
 *
 * Rows written by an older build, or edited by hand, can carry an id this build
 * has never heard of, or no id at all. Falling back to "minimal" keeps the
 * reading on the card in a form that cannot look broken in any theme.
 */
export function getWeatherTheme(
  id: string | null | undefined,
): WeatherThemeOption {
  const match = WEATHER_THEMES.find((option) => option.id === id);
  return match ?? FALLBACK_OPTION;
}
