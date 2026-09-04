/**
 * The weather shown on an invitation, and the four ways a host can dress it.
 *
 * The theme ids below are written into saved cards in the database and must
 * never be renamed or removed once a card has been created: a saved row keeps
 * the literal string, and dropping the value it names would leave that card
 * pointing at a theme that no longer exists. Adding a new id is safe.
 */

/** Every visual treatment the weather panel can take. */
export type WeatherThemeId = "minimal" | "panel" | "strip" | "ornamental";

/** One treatment, as offered in the designer and drawn on the card. */
export interface WeatherThemeOption {
  id: WeatherThemeId;
  /** Name shown to the host in the designer. */
  label: string;
  /** One short line describing how it looks. */
  description: string;
}

/**
 * Where a reading came from, and it changes what the card is allowed to claim.
 *
 * "forecast" is a real prediction for the event's own date. "seasonal" is what
 * that place is usually like at that time of year, averaged from past years,
 * for a date too far out for anyone to forecast. The two must never be worded
 * the same way: one says what the weather will be, the other says only what it
 * has tended to be.
 */
export type WeatherKind = "forecast" | "seasonal";

/**
 * The drawing a condition gets, as a small closed set.
 *
 * Separate from the condition text rather than derived from it. "Light rain"
 * and "Heavy showers" are different sentences and the same picture, and an icon
 * chosen by searching the words would break the first time the wording is
 * improved.
 */
export type WeatherIcon = "sun" | "cloud" | "rain" | "storm" | "snow" | "fog";

/** One resolved reading, ready to render. Degrees Celsius, whole numbers. */
export interface EventWeather {
  kind: WeatherKind;
  highC: number;
  lowC: number;
  /** Plain English, already resolved from the WMO code. */
  condition: string;
  icon: WeatherIcon;
  /**
   * How many past years the seasonal figures were averaged over.
   *
   * Null for a forecast, which averages nothing. Carried so the card can say
   * "averaged over the last 5 years" rather than asking a guest to take the
   * range on trust.
   */
  yearsAveraged: number | null;
}

/** Coordinates resolved once, at save time, and stored on the event row. */
export interface Coordinates {
  latitude: number;
  longitude: number;
}
