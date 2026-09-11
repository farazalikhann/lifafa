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
import type { EventInsert, EventUpdate } from "@/types/database";
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
  "qr_checkin_enabled",
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
  qrCheckinEnabled: boolean,
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
  const wantsQrCheckin = qrCheckinEnabled === true;

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
      wantsQrCheckin,
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
 * How many events the signed-in host has, and nothing else about them.
 *
 * ONE REQUEST, NO ROWS. `head: true` with an exact count asks PostgREST for the
 * Content-Range header and no body at all, so a host with forty invitations
 * pays for a tally rather than for forty rows they were not going to be shown.
 * The `select("id")` names the cheapest column there is; with `head: true` it
 * is never actually projected.
 *
 * Host-scoped by events_select_own rather than by a host_id filter written
 * here, exactly as getEventsForHost is — which also means an anonymous caller
 * gets 0 rather than an error. That matters: this is a server action, and the
 * notice on /create calls it from a page anyone may open.
 *
 * NOT A LIMIT. Nothing in the app refuses a host a further invitation because
 * of this number. It exists so /create can say what already exists and the
 * dashboard can say how much there is; a host may keep as many drafts as they
 * like and pays per invitation, not per account.
 */
export async function countEventsForHost(): Promise<DbResult<number>> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true });

  if (error !== null) {
    return dbFailure(
      "countEventsForHost",
      error,
      "Could not count your invitations, please try again.",
    );
  }

  /* Null when PostgREST returns no range header at all; no rows is 0 either way. */
  return dbSuccess(count ?? 0);
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
 * The only columns an edit may write.
 *
 * A type rather than a comment, so the list below is checked rather than
 * remembered. Every column of public.events that is missing from this Pick is
 * missing on purpose; see the note on updateEvent.
 */
type EventContentUpdate = Pick<
  EventUpdate,
  | "card_config"
  | "event_draft"
  | "cover_animation"
  | "show_weather"
  | "weather_theme"
  | "latitude"
  | "longitude"
  | "qr_checkin_enabled"
>;

/** One update, returning the row it wrote. Split out so the retry below reads. */
function update(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
  hostId: string,
  row: EventContentUpdate,
) {
  return supabase
    .from("events")
    .update(row)
    /*
      HOST SCOPED TWICE, AND BOTH ARE MEANT.

      events_update_own already refuses a row belonging to anybody else, so this
      filter changes no outcome — it changes what the application is *asking
      for*. A write that names only an id is a write that would take another
      host's row if the policy were ever dropped, loosened or applied to a new
      role; a write that names the host as well is one that cannot, and the
      policy becomes the second lock rather than the only one.
    */
    .eq("id", id)
    .eq("host_id", hostId)
    .select("*")
    .single();
}

/**
 * Saves a host's edits to an invitation they own.
 *
 * WHAT MAY BE WRITTEN is the card and nothing else: card_config, event_draft,
 * and the columns that hold the choices which never fitted inside card_config
 * — the cover animation, the two weather choices, the venue's coordinates and
 * the check-in switch. The object handed to Postgres is built here, field by
 * field, from a patch that has nowhere to put anything else.
 *
 * WHAT MAY NEVER BE WRITTEN, and why:
 *
 * invite_code. THE LINK IS ALREADY OUT. A host has put that code in a WhatsApp
 * group, printed it on a paper card, sent it to three hundred people. Rolling
 * it would break every one of those at once, silently, and there is no version
 * of "fixed a typo in the venue" that should be able to do that. It is not
 * editable in the UI, it is not a field on the patch, and it is not in
 * EventContentUpdate — so there is no expression in this function that could
 * name it even by accident.
 *
 * host_id. Ownership is not a thing an owner may hand over from an editor.
 *
 * is_paid and payment_id. These belong to the payment path, which is the only
 * thing entitled to say an invitation has been paid for. A card's own JSON
 * carries an isPaid copy for the renderer, and toStoredEvent lets the column
 * win over it on the way out for exactly this reason: an editor cannot make a
 * card free of its watermark by claiming it in a config.
 *
 * updated_at is left alone: the trigger owns it.
 */
export async function updateEvent(
  id: string,
  patch: {
    draft: EventDraft;
    cardConfig: CardConfig;
    coverAnimation: string;
    weather: { showWeather: boolean; themeId: string };
    qrCheckinEnabled: boolean;
  },
): Promise<DbResult<StoredEvent>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return dbFailure(
      "updateEvent/auth",
      authError,
      "You need to be signed in to change an event.",
    );
  }

  /*
    Checked here rather than trusted from the caller, exactly as createEvent
    checks them: this is a server action, so its arguments are whatever crossed
    the wire, and both columns carry check constraints that would turn an
    unknown id into a database error the host cannot act on.
  */
  const chosenCover = isCoverAnimationId(patch.coverAnimation)
    ? patch.coverAnimation
    : DEFAULT_COVER_ANIMATION;
  const chosenTheme = isWeatherThemeId(patch.weather.themeId)
    ? patch.weather.themeId
    : DEFAULT_WEATHER_THEME;

  /*
    The row as it stands, read before it is written.

    Two things need it. The venue is one: geocoding is the one slow call in this
    path, and re-running it on every save would spend a network round trip to
    learn that the hall did not move. The other is the answer to "is this yours"
    — events_select_own filters rather than refuses, so a missing row here means
    the event was deleted or belongs to somebody else, and both deserve the same
    uninformative reply.
  */
  const { data: existing, error: readError } = await supabase
    .from("events")
    .select("event_draft, latitude, longitude")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();

  if (readError !== null) {
    return dbFailure(
      "updateEvent/read",
      readError,
      "Could not save your changes, please try again.",
    );
  }

  if (existing === null) {
    return dbFailure(
      "updateEvent/notFound",
      `event ${id} is not available to host ${user.id}`,
      "Could not find that invitation. It may have been deleted, or it belongs to a different account.",
    );
  }

  const venueMoved =
    existing.event_draft.venueName !== patch.draft.venueName ||
    existing.event_draft.venueAddress !== patch.draft.venueAddress;

  /*
    Re-resolved only when the host changed where it is. A failed lookup writes
    null, which is a card with no weather rather than a refused save — the same
    trade createEvent makes — and a venue that did not change keeps the
    coordinates it already had, including the null it already had.
  */
  const coordinates = venueMoved
    ? await geocodeVenue(patch.draft.venueName, patch.draft.venueAddress)
    : {
        latitude: existing.latitude,
        longitude: existing.longitude,
      };

  const row: EventContentUpdate = {
    card_config: patch.cardConfig,
    event_draft: patch.draft,
    cover_animation: chosenCover,
    show_weather: patch.weather.showWeather === true,
    weather_theme: chosenTheme,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    /* Same trust rule as createEvent: a boolean from the wire is only true if it says so. */
    qr_checkin_enabled: patch.qrCheckinEnabled === true,
  };

  /*
    Each refused column is dropped and the row is sent again, for the reason
    spelled out over PENDING_COLUMNS: an application deploy can name a column
    before the migration that creates it has been applied. The choice it carried
    is lost — the card keeps the cover it had, or shows no weather — and the
    host's edit still saves, which is the trade worth making. Bounded by the
    list, so this cannot spin.
  */
  const attempt: EventContentUpdate = { ...row };
  let attemptResult = await update(supabase, id, user.id, attempt);

  for (let dropped = 0; dropped < PENDING_COLUMNS.length; dropped += 1) {
    const column = missingColumn(attemptResult.error);

    if (column === null) {
      break;
    }

    console.error(
      `[db] updateEvent/update: events.${column} does not exist. Apply the outstanding migrations in supabase/migrations. Saving these changes without it.`,
    );

    delete attempt[column];
    attemptResult = await update(supabase, id, user.id, attempt);
  }

  const { data, error } = attemptResult;

  if (error !== null || data === null) {
    return dbFailure(
      "updateEvent",
      error,
      "Could not save your changes, please try again.",
    );
  }

  return dbSuccess(toStoredEvent(data));
}

/**
 * Deletes an invitation the signed-in host owns, and everything hanging off it.
 *
 * THE GUEST LIST GOES WITH IT. guests.event_id is `on delete cascade`, so this
 * one statement also destroys every reply, every headcount and every check-in
 * recorded against the event. That is the intended meaning of the word delete
 * here — an invitation whose replies outlived it would be a row nothing in the
 * app can reach — but it is why the control that calls this asks first, and why
 * the dialog says how many replies are about to go.
 *
 * THE LINK DIES TOO. Any guest who opens the shared /i/<code> afterwards meets
 * the not-found card rather than the invitation, and the code is freed for a
 * future roll. There is no undo. A host who wants an invitation to stop taking
 * replies without losing what it has collected wants something this is not.
 *
 * HOST SCOPED TWICE, for the reason spelled out over `update`: events_delete_own
 * already refuses another host's row, and naming host_id here means the
 * statement the application sends could not take one even if that policy were
 * dropped. RLS filters rather than refuses, so a row belonging to someone else
 * simply matches nothing — which is why the delete asks for the id back rather
 * than trusting the absence of an error.
 */
export async function deleteEvent(id: string): Promise<DbResult<null>> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError !== null || user === null) {
    return dbFailure(
      "deleteEvent/auth",
      authError,
      "You need to be signed in to delete an invitation.",
    );
  }

  /*
    `select("id")` is what turns a silent no-op into an answer. A delete that
    matches no rows is a perfectly successful statement as far as Postgres is
    concerned; without asking for the deleted rows back, an event that was
    already gone — or never this host's — would report the same cheerful success
    as one that was actually removed, and the list would redraw still holding it.
  */
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id)
    .select("id");

  if (error !== null) {
    return dbFailure(
      "deleteEvent",
      error,
      "Could not delete this invitation, please try again.",
    );
  }

  if ((data ?? []).length === 0) {
    return dbFailure(
      "deleteEvent/notFound",
      `event ${id} is not available to host ${user.id}`,
      "Could not find that invitation. It may already have been deleted.",
    );
  }

  return dbSuccess(null);
}
