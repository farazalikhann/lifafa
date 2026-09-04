"use server";

import { createClient } from "@/lib/supabase/server";
import { generateInviteCode, isValidInviteCode } from "@/lib/inviteCode";
import {
  dbFailure,
  dbSuccess,
  postgresError,
  type DbResult,
} from "@/lib/db/result";
import {
  DEFAULT_COVER_ANIMATION,
  isCoverAnimationId,
} from "@/lib/coverAnimations";
import { geocodeVenue } from "@/lib/weather";
import {
  DEFAULT_WEATHER_THEME,
  isWeatherThemeId,
} from "@/lib/weatherThemes";
import {
  toEventInsert,
  toStoredEvent,
  type HostEvent,
  type StoredEvent,
} from "@/types/database";
import type { CardConfig } from "@/types/card";
import type { EventInsert } from "@/types/database";
import type { EventDraft } from "@/types/event";

/**
 * Every read and write of public.events.
 *
 * No component talks to Supabase directly. That is not tidiness: these calls go
 * through the server client, which carries the host's session cookie, which is
 * what makes auth.uid() resolve inside the RLS policies. A component reaching
 * for the browser client would be querying as a different role and silently
 * seeing a different set of rows.
 */

/** How many times a colliding invite code is worth re-rolling. */
const CODE_ATTEMPTS = 5;

/** Postgres unique-violation. Raised here by events_invite_code_key. */
const UNIQUE_VIOLATION = "23505";

/**
 * The two ways a write naming a column the database does not have comes back.
 *
 * Postgres raises 42703 itself; PostgREST answers PGRST204 when the column is
 * absent from the schema cache it validates writes against, which is what an
 * insert usually hits first.
 */
const UNDEFINED_COLUMN = "42703";
const SCHEMA_CACHE_MISS = "PGRST204";

/**
 * Columns a deploy can name before the migration that creates them is applied.
 *
 * An application deploy reaches production the moment it is pushed; a migration
 * waits for someone to paste it into the SQL editor. In between, an insert
 * names columns the table does not have, Postgres refuses the entire row, and
 * a host who has spent twenty minutes on a card is told to try again — forever,
 * because trying again sends exactly the same columns.
 *
 * So the card outlives the columns. Only these, only the two codes that mean
 * "no such column", and each one dropped individually, so nothing else is ever
 * retried into silence.
 */
const PENDING_COLUMNS = [
  "cover_animation",
  "show_weather",
  "latitude",
  "longitude",
  "weather_theme",
] as const;

type PendingColumn = (typeof PENDING_COLUMNS)[number];

/** Which pending column this failure is about, or null if it is about something else. */
function missingColumn(cause: unknown): PendingColumn | null {
  const pg = postgresError(cause);

  if (pg === null) {
    return null;
  }

  if (pg.code !== UNDEFINED_COLUMN && pg.code !== SCHEMA_CACHE_MISS) {
    return null;
  }

  return PENDING_COLUMNS.find((column) => pg.message.includes(column)) ?? null;
}

/** One insert, returning the row it wrote. Split out so the retry above reads. */
function insert(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: EventInsert,
) {
  return supabase.from("events").insert(row).select("*").single();
}

/**
 * Creates an event owned by the signed-in host.
 *
 * host_id comes from the session rather than from an argument. Passing it in
 * would make it a claim the caller could forge — and while events_insert_own
 * would refuse the row, refusing at the boundary is better than relying on the
 * database to catch a lie the application chose to repeat.
 */
export async function createEvent(
  draft: EventDraft,
  cardConfig: CardConfig,
  coverAnimation: string,
  weather: { showWeather: boolean; themeId: string },
): Promise<DbResult<StoredEvent>> {
  const supabase = await createClient();

  /*
    Checked here rather than trusted from the caller. The editor's own state is
    typed to the union and cannot produce anything else, but this is a server
    action: its argument is whatever crossed the wire, and the column has a
    check constraint that would reject an unknown id as a database error the
    host cannot act on. An id nobody recognises falls back to the default,
    which is also what an older client that sends nothing at all would get.
  */
  const chosenCover = isCoverAnimationId(coverAnimation)
    ? coverAnimation
    : DEFAULT_COVER_ANIMATION;

  /* Same check, same reason: a server action's arguments are whatever arrived. */
  const chosenTheme = isWeatherThemeId(weather.themeId)
    ? weather.themeId
    : DEFAULT_WEATHER_THEME;
  const showWeather = weather.showWeather === true;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return dbFailure(
      "createEvent/auth",
      authError,
      "You need to be signed in to save an event.",
    );
  }

  /*
    The one geocode this feature ever performs.

    Here rather than on the invite page, because the venue does not move and a
    link opened by three hundred guests would otherwise resolve the same address
    three hundred times. Null when Open-Meteo recognises nothing in what the
    host typed, and null is a card with no weather rather than a failed save:
    the row is written either way.
  */
  const coordinates = await geocodeVenue(draft.venueName, draft.venueAddress);

  /*
    Retried rather than trusted first time. Eight characters over a 31 symbol
    alphabet makes a collision vanishingly unlikely, but "unlikely" is not
    "impossible" and the unique constraint is what actually decides. Re-rolling
    on 23505 is cheaper than reasoning about the odds.
  */
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const inviteCode = generateInviteCode();

    const row = toEventInsert(
      user.id,
      inviteCode,
      cardConfig,
      draft,
      chosenCover,
      { showWeather, themeId: chosenTheme, coordinates },
    );

    /*
      Each refused column is dropped and the row is sent again. The choice it
      carried is lost — the card opens with no cover, or shows no weather — and
      the card itself still saves, which is the trade worth making. Bounded by
      the list, so this cannot spin.
    */
    const attempt: EventInsert = { ...row };
    let attemptResult = await insert(supabase, attempt);

    for (let dropped = 0; dropped < PENDING_COLUMNS.length; dropped += 1) {
      const column = missingColumn(attemptResult.error);

      if (column === null) {
        break;
      }

      console.error(
        `[db] createEvent/insert: events.${column} does not exist. Apply the outstanding migrations in supabase/migrations. Saving this card without it.`,
      );

      delete attempt[column];
      attemptResult = await insert(supabase, attempt);
    }

    const { data, error } = attemptResult;

    if (error === null && data !== null) {
      return dbSuccess(toStoredEvent(data));
    }

    if (error?.code === UNIQUE_VIOLATION) {
      continue;
    }

    return dbFailure(
      "createEvent/insert",
      error,
      "Could not save your event, please try again.",
    );
  }

  return dbFailure(
    "createEvent/codeCollision",
    `no free invite code in ${CODE_ATTEMPTS} attempts`,
    "Could not save your event, please try again.",
  );
}

/**
 * The guest-facing read, and the only anonymous path into events.
 *
 * Goes through the event_by_invite_code() function rather than a table select,
 * because anon has no SELECT policy on events at all — see the long note in
 * 0001_initial.sql. The function takes the code as an argument, so holding one
 * code reveals one event and the table cannot be walked.
 *
 * Returns null for an unknown code. That is a not-found, not a failure: most
 * unknown codes are a typo in a pasted link.
 */
export async function getEventByInviteCode(
  code: string,
): Promise<DbResult<StoredEvent | null>> {
  /*
    Rejected before the round trip. Anything outside the code alphabet cannot
    match a real row, so this turns a mangled URL into a not-found without
    troubling the database.
  */
  if (!isValidInviteCode(code)) {
    return dbSuccess(null);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.rpc("event_by_invite_code", {
    p_invite_code: code,
  });

  if (error !== null) {
    return dbFailure(
      "getEventByInviteCode",
      error,
      "Could not open this invitation, please try again.",
    );
  }

  const row = data?.[0];

  return dbSuccess(row === undefined ? null : toStoredEvent(row));
}

/**
 * The signed-in host's events, newest first, each with how many people have
 * replied.
 *
 * The count comes from a second query rather than an embedded aggregate,
 * because RLS already scopes it exactly right: guests_select_host means a plain
 * `select event_id from guests` returns rows for this host's events and nobody
 * else's, so tallying them here needs no filter and cannot over-count.
 */
export async function getEventsForHost(): Promise<DbResult<HostEvent[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error !== null) {
    return dbFailure(
      "getEventsForHost",
      error,
      "Could not load your events, please try again.",
    );
  }

  const { data: replies, error: replyError } = await supabase
    .from("guests")
    .select("event_id");

  if (replyError !== null) {
    return dbFailure(
      "getEventsForHost/counts",
      replyError,
      "Could not load your events, please try again.",
    );
  }

  const counts = new Map<string, number>();
  for (const row of replies ?? []) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  return dbSuccess(
    (data ?? []).map((row) => ({
      ...toStoredEvent(row),
      replyCount: counts.get(row.id) ?? 0,
    })),
  );
}

/**
 * One event by id, for the host's dashboard.
 *
 * Host-scoped by events_select_own rather than by a host_id filter written
 * here. Someone else's id therefore returns null — indistinguishable from a
 * deleted one, which is the right amount to tell a stranger.
 */
export async function getEventById(
  id: string,
): Promise<DbResult<StoredEvent | null>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error !== null) {
    return dbFailure(
      "getEventById",
      error,
      "Could not load this event, please try again.",
    );
  }

  return dbSuccess(data === null ? null : toStoredEvent(data));
}

/**
 * Updates an event the host owns.
 *
 * host_id and id are not patchable — the type forbids it, and events_update_own
 * would refuse anyway. updated_at is left alone: the trigger owns it.
 */
export async function updateEvent(
  id: string,
  patch: {
    draft?: EventDraft;
    cardConfig?: CardConfig;
  },
): Promise<DbResult<StoredEvent>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .update({
      ...(patch.draft === undefined ? {} : { event_draft: patch.draft }),
      ...(patch.cardConfig === undefined
        ? {}
        : { card_config: patch.cardConfig }),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error !== null || data === null) {
    return dbFailure(
      "updateEvent",
      error,
      "Could not save your changes, please try again.",
    );
  }

  return dbSuccess(toStoredEvent(data));
}
