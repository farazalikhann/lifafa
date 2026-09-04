import { istDayKey } from "@/lib/cardFormat";
import type { Coordinates, EventWeather, WeatherIcon } from "@/types/weather";

/**
 * Everything that talks to Open-Meteo.
 *
 * Server only. Nothing here may be imported from a client component: the
 * results are cached through Next's fetch cache, which has no browser
 * equivalent, and an invitation link opened by three hundred guests has to
 * produce one upstream request rather than three hundred. Enforced by
 * convention rather than by the `server-only` package, which this project does
 * not have installed and which is not worth a dependency; every caller here is
 * a server component or a server action.
 *
 * Open-Meteo needs no key and no account, so there is no secret in this file
 * and nothing for a host to configure.
 *
 * Every function returns null rather than throwing. A card with no weather on
 * it is a complete card; a card with a broken weather box on it is not, and a
 * throw inside a server component would take the whole invitation down with it.
 */

const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const ARCHIVE_ENDPOINT = "https://archive-api.open-meteo.com/v1/archive";
const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";

/**
 * How far ahead Open-Meteo will actually forecast.
 *
 * Their limit is 16 days. 15 here, because the request is built from the day
 * the guest opens the card and a card sitting exactly on the boundary would
 * start failing partway through the day the cache was filled.
 */
const FORECAST_HORIZON_DAYS = 15;

/** Every date the app reasons about is an Indian calendar day. */
const TIME_ZONE = "Asia/Kolkata";

/** <input type="date"> emits YYYY-MM-DD, and so does everything downstream. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * How long a cached answer stands, in seconds.
 *
 * A near-date forecast is refreshed a few times a day: it genuinely changes,
 * and a guest opening the card the evening before should not be reading
 * yesterday's sky. A seasonal average is built from years of history and cannot
 * meaningfully change inside a month.
 */
const FORECAST_REVALIDATE = 6 * 60 * 60;
const SEASONAL_REVALIDATE = 30 * 24 * 60 * 60;
const GEOCODE_REVALIDATE = 30 * 24 * 60 * 60;

/** How many past years a seasonal range is averaged over, and the least it accepts. */
const SEASONAL_YEARS = 5;
const SEASONAL_YEARS_REQUIRED = 3;

/** Days either side of the event's date pulled from each past year. */
const SEASONAL_WINDOW_DAYS = 3;

/**
 * Longest a page render will wait for Open-Meteo.
 *
 * Not an AbortSignal, deliberately. The request is left running so its answer
 * still lands in the fetch cache for the next visitor; only this render stops
 * waiting for it. A guest gets a card with no weather rather than a page that
 * hangs on somebody else's outage.
 */
const REQUEST_TIMEOUT_MS = 4000;

/**
 * WMO weather codes, as words.
 *
 * Written out rather than grouped into "rain" and "clear", because the whole
 * value of a condition on an invitation is the difference between light rain
 * and a thunderstorm on the day someone is deciding what to wear.
 */
const CONDITIONS: Readonly<Record<number, string>> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Light snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

/** What an unrecognised code becomes. Never a code number on a card. */
const UNKNOWN_CONDITION = "Mixed conditions";

/**
 * Which drawing each band of codes gets.
 *
 * Ordered, and read from the top down: the first band whose ceiling the code is
 * at or below wins. Thunderstorms sit above snow because a code is matched
 * against these in numeric order and 95 upward is the last band there is.
 */
const ICON_BANDS: readonly { upTo: number; icon: WeatherIcon }[] = [
  { upTo: 1, icon: "sun" },
  { upTo: 3, icon: "cloud" },
  { upTo: 48, icon: "fog" },
  { upTo: 67, icon: "rain" },
  { upTo: 77, icon: "snow" },
  { upTo: 82, icon: "rain" },
  { upTo: 86, icon: "snow" },
  { upTo: 99, icon: "storm" },
];

function iconFor(code: number | undefined): WeatherIcon {
  if (code === undefined) {
    return "cloud";
  }

  return ICON_BANDS.find((band) => code <= band.upTo)?.icon ?? "cloud";
}

/* ────────────────────────── Small helpers ────────────────────────── */

/**
 * Waits for a request, but not indefinitely.
 *
 * The rejection is swallowed here rather than left to float: an unhandled
 * rejection from a request nobody is waiting for any more would be logged as an
 * error on a page that is working exactly as designed.
 */
async function withTimeout<T>(work: Promise<T>): Promise<T | null> {
  const settled = work.catch((cause: unknown) => {
    console.error("[weather] request failed:", cause);
    return null;
  });

  const timer = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), REQUEST_TIMEOUT_MS);
  });

  return Promise.race([settled, timer]);
}

/** A YYYY-MM-DD key as a UTC instant, so two keys can be subtracted. */
function keyToUtc(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00Z`);
}

/** UTC parts back to a YYYY-MM-DD key. */
function utcToKey(instant: number): string {
  return new Date(instant).toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today to the event, in Indian calendar days. */
function daysUntil(eventDate: string): number | null {
  if (!DATE_PATTERN.test(eventDate)) {
    return null;
  }

  const event = keyToUtc(eventDate);
  const today = keyToUtc(istDayKey(new Date()));

  if (Number.isNaN(event) || Number.isNaN(today)) {
    return null;
  }

  return Math.round((event - today) / DAY_MS);
}

function conditionFor(code: number | undefined): string {
  return code === undefined ? UNKNOWN_CONDITION : (CONDITIONS[code] ?? UNKNOWN_CONDITION);
}

/** Every finite number in a list, which is what the arithmetic below needs. */
function finiteNumbers(values: unknown): number[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** The most frequent code in a list, or undefined when there is nothing to count. */
function mode(values: readonly number[]): number | undefined {
  const counts = new Map<number, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let best: number | undefined;
  let bestCount = 0;

  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }

  return best;
}

/* ────────────────────────── Response shapes ────────────────────────── */

/**
 * The one block of an Open-Meteo response either endpoint is asked for.
 *
 * Read defensively, one field at a time, rather than cast. This is a third
 * party payload: a shape change upstream should cost the card its weather, not
 * throw inside a guest's render.
 */
interface DailyReadings {
  highs: number[];
  lows: number[];
  codes: number[];
}

function readDaily(payload: unknown): DailyReadings | null {
  if (typeof payload !== "object" || payload === null || !("daily" in payload)) {
    return null;
  }

  const daily: unknown = (payload as { daily: unknown }).daily;

  if (typeof daily !== "object" || daily === null) {
    return null;
  }

  const block = daily as Record<string, unknown>;
  const highs = finiteNumbers(block.temperature_2m_max);
  const lows = finiteNumbers(block.temperature_2m_min);

  if (highs.length === 0 || lows.length === 0) {
    return null;
  }

  return { highs, lows, codes: finiteNumbers(block.weather_code) };
}

/** One GET, parsed as JSON, never throwing past this point. */
async function getJson(url: string, revalidate: number): Promise<unknown> {
  const response = await fetch(url, { next: { revalidate } });

  if (!response.ok) {
    console.error(`[weather] ${response.status} from ${new URL(url).host}`);
    return null;
  }

  return response.json();
}

/* ────────────────────────── Geocoding ────────────────────────── */

/**
 * The search terms worth trying for one venue, best first.
 *
 * Open-Meteo's geocoder matches place names, not street addresses: "42 Link
 * Road, Bandra West, Mumbai" finds nothing, while "Mumbai" finds it at once.
 * So the address is tried from its last comma separated part inwards, which is
 * where a city and a state sit in every address anyone writes, before falling
 * back to the venue's own name for a hall or a hotel that is itself a landmark.
 */
function searchTerms(venueName: string, venueAddress: string): string[] {
  const parts = venueAddress
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .reverse();

  const name = venueName.trim();
  const candidates = name.length > 0 ? [...parts, name] : parts;

  /* Deduplicated, and capped: this runs once per save, not once per guest. */
  return [...new Set(candidates)].slice(0, 4);
}

/**
 * Coordinates for a venue, resolved once at save time.
 *
 * Called from the write path rather than from a page, so an invitation opened
 * by hundreds of guests geocodes nothing at all: the answer is already a pair
 * of numbers on the event row. Null when nothing matched, which is a card with
 * no weather and not an error anybody needs to see.
 */
export async function geocodeVenue(
  venueName: string,
  venueAddress: string,
): Promise<Coordinates | null> {
  for (const term of searchTerms(venueName, venueAddress)) {
    const url = `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(term)}&count=1&language=en&format=json`;
    const payload = await withTimeout(getJson(url, GEOCODE_REVALIDATE));

    if (typeof payload !== "object" || payload === null) {
      continue;
    }

    const results: unknown = (payload as { results?: unknown }).results;

    if (!Array.isArray(results) || results.length === 0) {
      continue;
    }

    const first: unknown = results[0];

    if (typeof first !== "object" || first === null) {
      continue;
    }

    const { latitude, longitude } = first as {
      latitude?: unknown;
      longitude?: unknown;
    };

    if (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      return { latitude, longitude };
    }
  }

  return null;
}

/* ────────────────────────── Readings ────────────────────────── */

/** The real forecast for one day, when that day is close enough to have one. */
async function fetchForecast(
  coordinates: Coordinates,
  eventDate: string,
): Promise<EventWeather | null> {
  const url =
    `${FORECAST_ENDPOINT}?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&timezone=${encodeURIComponent(TIME_ZONE)}` +
    `&start_date=${eventDate}&end_date=${eventDate}`;

  const daily = readDaily(await withTimeout(getJson(url, FORECAST_REVALIDATE)));

  if (daily === null) {
    return null;
  }

  return {
    kind: "forecast",
    highC: Math.round(daily.highs[0]),
    lowC: Math.round(daily.lows[0]),
    condition: conditionFor(daily.codes[0]),
    icon: iconFor(daily.codes[0]),
    yearsAveraged: null,
  };
}

/**
 * What this place is usually like at this time of year.
 *
 * One request per past year rather than one long range, because the window
 * wanted is a week around one date in each of five years and a single range
 * covering all of them would pull five years of daily rows to use thirty five
 * of them.
 *
 * The years counted back are the years before *today*, never before the event.
 * A wedding booked for 2030 would otherwise ask the archive about 2029, which
 * has not happened yet.
 */
async function fetchSeasonal(
  coordinates: Coordinates,
  eventDate: string,
): Promise<EventWeather | null> {
  const currentYear = Number(istDayKey(new Date()).slice(0, 4));
  const month = Number(eventDate.slice(5, 7));
  const day = Number(eventDate.slice(8, 10));

  const requests = Array.from({ length: SEASONAL_YEARS }, (_unused, index) => {
    const year = currentYear - 1 - index;
    const centre = Date.UTC(year, month - 1, day);
    const start = utcToKey(centre - SEASONAL_WINDOW_DAYS * DAY_MS);
    const end = utcToKey(centre + SEASONAL_WINDOW_DAYS * DAY_MS);

    const url =
      `${ARCHIVE_ENDPOINT}?latitude=${coordinates.latitude}&longitude=${coordinates.longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=${encodeURIComponent(TIME_ZONE)}` +
      `&start_date=${start}&end_date=${end}`;

    return withTimeout(getJson(url, SEASONAL_REVALIDATE));
  });

  const years = (await Promise.all(requests)).map(readDaily);
  const usable = years.filter((year): year is DailyReadings => year !== null);

  /*
    Three years is the floor for calling anything typical. Below that this is
    one or two years of weather wearing the word "usually", which is a claim the
    data does not support, so the card shows nothing instead.
  */
  if (usable.length < SEASONAL_YEARS_REQUIRED) {
    return null;
  }

  const highs = usable.flatMap((year) => year.highs);
  const lows = usable.flatMap((year) => year.lows);
  const codes = usable.flatMap((year) => year.codes);
  const typical = mode(codes);

  return {
    kind: "seasonal",
    highC: Math.round(mean(highs)),
    lowC: Math.round(mean(lows)),
    condition: conditionFor(typical),
    icon: iconFor(typical),
    yearsAveraged: usable.length,
  };
}

/**
 * The weather for an event, or null when there is none worth showing.
 *
 * Null covers every failure and every gap: no coordinates on the row, a date
 * that is not a date, an event already past, an endpoint that is down, an
 * archive too thin to average. Callers render nothing on null and never an
 * error, a spinner or an empty box.
 */
export async function getEventWeather(
  coordinates: Coordinates | null,
  eventDate: string,
): Promise<EventWeather | null> {
  if (coordinates === null) {
    return null;
  }

  const days = daysUntil(eventDate);

  /*
    A past event is left alone. The archive could answer what the weather was,
    but an invitation to something that has already happened has no use for it.
  */
  if (days === null || days < 0) {
    return null;
  }

  return days <= FORECAST_HORIZON_DAYS
    ? fetchForecast(coordinates, eventDate)
    : fetchSeasonal(coordinates, eventDate);
}
