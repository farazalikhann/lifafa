import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import type { CardConfig } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { Coordinates, WeatherThemeId } from "@/types/weather";
import type { CardBlock } from "@/types/customSection";
import type { EventDraft } from "@/types/event";
import type { Guest, RsvpStatus } from "@/types/guest";

/**
 * Hand-written database types, matching the migrations in supabase/migrations.
 *
 * Hand-written rather than generated, because generated types would be one more
 * thing to regenerate before the schema is settled — and because the jsonb
 * columns are the interesting part, and a generator can only ever type those as
 * `Json`. Here they carry their real shapes, CardConfig and EventDraft.
 *
 * The app types in types/event.ts and types/guest.ts are NOT renamed to match
 * the database. The database speaks snake_case because Postgres does; the app
 * speaks camelCase because TypeScript does. The converters at the bottom of
 * this file are the single place those two vocabularies meet, so a column
 * rename lands in exactly one file.
 */

/* ────────────────────────── Row shapes ────────────────────────── */

/*
  Type aliases, not interfaces, throughout this file. postgrest-js requires each
  Row/Insert/Update to satisfy Record<string, unknown>, and only an object type
  alias picks up TypeScript's implicit index signature — an interface fails that
  check, which collapses the whole schema to `never` and turns every query into
  an unhelpful "not assignable to type 'never'".
*/

export type EventRow = {
  id: string;
  host_id: string;
  invite_code: string;
  /** A CardConfig, stored verbatim. */
  card_config: CardConfig;
  /** An EventDraft, stored verbatim. */
  event_draft: EventDraft;
  is_paid: boolean;
  payment_id: string | null;
  /**
   * The id of the opening animation, from types/coverAnimation.ts.
   *
   * `string`, not CoverAnimationId, and that is deliberate. This is what came
   * back from Postgres: a row written by an older build, or edited by hand, can
   * carry an id this build has never heard of, and typing the column as the
   * union would be a promise the database has not made. getCoverAnimation()
   * turns whatever is here into a real option. Null means the host was never
   * asked — every event saved before covers existed.
   */
  cover_animation: string | null;
  /**
   * Whether guests see the weather on the card.
   *
   * Null is "never asked", which reads the same as false everywhere: the card
   * tests for `=== true`, so an event saved before 0004 shows nothing.
   */
  show_weather: boolean | null;
  /**
   * The venue, resolved once at save time by lib/weather.ts.
   *
   * Stored rather than looked up per page load. The venue is free text inside
   * event_draft and geocoding it on a card three hundred guests are opening
   * would be three hundred lookups of an answer that never changes.
   */
  latitude: number | null;
  longitude: number | null;
  /** A WeatherThemeId, or null. `string` for the same reason cover_animation is. */
  weather_theme: string | null;
  /**
   * Whether the host has switched on QR check-in at the door.
   *
   * `boolean` like is_paid rather than `boolean | null` like show_weather: the
   * column is NOT NULL DEFAULT false (0005), so a row that has it always holds
   * an answer. A row read before 0005 is applied has no key at all, which is
   * why toStoredEvent tests it with `=== true` rather than reading it straight.
   */
  qr_checkin_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * What an insert may carry.
 *
 * The generated and defaulted columns are optional; host_id is not, because
 * the events_insert_own policy checks it against auth.uid() and an insert
 * without it is refused.
 */
export type EventInsert = {
  id?: string;
  host_id: string;
  invite_code: string;
  card_config: CardConfig;
  event_draft: EventDraft;
  is_paid?: boolean;
  payment_id?: string | null;
  cover_animation?: string | null;
  show_weather?: boolean | null;
  latitude?: number | null;
  longitude?: number | null;
  weather_theme?: string | null;
  qr_checkin_enabled?: boolean;
}

/** Every field a host may change. Ownership and identity are not among them. */
export type EventUpdate = Partial<
  Pick<
    EventRow,
    | "card_config"
    | "event_draft"
    | "is_paid"
    | "payment_id"
    | "invite_code"
    | "cover_animation"
    | "show_weather"
    | "latitude"
    | "longitude"
    | "weather_theme"
    | "qr_checkin_enabled"
  >
>;

export type GuestRow = {
  id: string;
  event_id: string;
  name: string;
  phone: string;
  rsvp: RsvpStatus;
  accompanying_count: number;
  message: string | null;
  responded_at: string | null;
  checked_in: boolean;
  checked_in_at: string | null;
  /**
   * The secret on a guest's check-in pass, from 0006. Issued by a trigger the
   * first time the row is accepted and never changed after; null for a reply
   * that has never been a yes. Deliberately absent from GuestInsert and
   * GuestUpdate: no caller mints or edits one.
   */
  checkin_token: string | null;
  created_at: string;
}

export type GuestInsert = {
  id?: string;
  event_id: string;
  name: string;
  phone: string;
  rsvp: RsvpStatus;
  accompanying_count?: number;
  message?: string | null;
  responded_at?: string | null;
  checked_in?: boolean;
  checked_in_at?: string | null;
}

/**
 * What a host may change on a guest row — in practice the door scanner.
 * event_id, name and phone are absent: correcting those is a different feature
 * with different consequences, and leaving them out means a check-in cannot
 * accidentally rewrite who a guest is.
 */
export type GuestUpdate = Partial<
  Pick<GuestRow, "rsvp" | "accompanying_count" | "message" | "checked_in" | "checked_in_at">
>;

/**
 * The shape event_by_invite_code() returns.
 *
 * Deliberately narrower than EventRow: the function projects only the
 * guest-facing columns, so host_id, payment_id and the timestamps are absent
 * here by design rather than by omission.
 */
export type EventByInviteCodeRow = {
  id: string;
  invite_code: string;
  card_config: CardConfig;
  event_draft: EventDraft;
  is_paid: boolean;
  /* Projected by 0003. The cover is drawn for the guest, so the guest read needs it. */
  cover_animation: string | null;
  /* Projected by 0004, for the same reason: the weather is drawn for the guest. */
  show_weather: boolean | null;
  latitude: number | null;
  longitude: number | null;
  weather_theme: string | null;
  /* Projected by 0006, so the guest's page knows whether to offer a pass. */
  qr_checkin_enabled: boolean;
}

/* ────────────────────── The Database generic ────────────────────── */

/**
 * The shape supabase-js expects from `createClient<Database>()`.
 *
 * Written by hand to the subset actually in use. Every client in lib/supabase
 * is parameterised with it, so a query naming a column that does not exist
 * fails at tsc rather than at runtime.
 */
/*
  A `type`, not an `interface`, and that is load-bearing. postgrest-js checks
  this against Record<string, GenericTable> and friends; only an object *type
  alias* gets TypeScript's implicit index signature, so an interface fails the
  constraint and every query silently degrades to `never`.
*/
export type Database = {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
        /*
          Required by postgrest-js's GenericTable. Empty because nothing here
          traverses a foreign key in a select — a schema that omits it fails the
          constraint silently, and every query then degrades to `never`.
        */
        Relationships: [];
      };
      guests: {
        Row: GuestRow;
        Insert: GuestInsert;
        Update: GuestUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      event_by_invite_code: {
        Args: { p_invite_code: string };
        Returns: EventByInviteCodeRow[];
      };
      event_exists: {
        Args: { p_event_id: string };
        Returns: boolean;
      };
      /*
        The caller's own check-in token when the reply is accepted, null
        otherwise (0006) — one value, never a row, so the guest write path still
        cannot read the list it writes to. Before 0006 it returns void, which
        arrives as null and reads the same as "no pass".
      */
      submit_reply: {
        Args: {
          p_invite_code: string;
          p_name: string;
          p_phone: string;
          p_rsvp: string;
          p_accompanying_count: number;
          p_message: string;
        };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

/* ──────────────────────── Converters ──────────────────────── */

/**
 * The app-side view of a stored event.
 *
 * What the invite page, the share image and the dashboard all read. Shaped to
 * the app's own types rather than the database's, so a column rename stops at
 * the converters below.
 */
export interface StoredEvent {
  id: string;
  inviteCode: string;
  config: CardConfig;
  draft: EventDraft;
  isPaid: boolean;
  /** Raw, exactly as stored. Resolved by getCoverAnimation at the point of use. */
  coverAnimation: string | null;
  /** False whenever the host has not explicitly asked for weather. */
  showWeather: boolean;
  /**
   * The venue's coordinates, or null when it could not be resolved.
   *
   * One object rather than two loose numbers, because a latitude without a
   * longitude is not half an answer, it is no answer, and the pair being
   * present or absent together is the only state the weather code can use.
   */
  coordinates: Coordinates | null;
  /** Raw, exactly as stored. Resolved by getWeatherTheme at the point of use. */
  weatherTheme: string | null;
  /** False unless the host has switched QR check-in on. */
  qrCheckinEnabled: boolean;
}

/** An event as the index page needs it: the event plus its reply tally. */
export type HostEvent = StoredEvent & { replyCount: number };

/**
 * Adds any built-in section the stored running order has never heard of.
 *
 * card_config is a jsonb snapshot of the registry as it stood the day the host
 * saved, so every event written before a new section existed carries a list
 * without it — and would go on rendering the old card forever. Registering a
 * section would then ship a feature that only new events could ever show.
 *
 * A missing section is placed after the last section that precedes it in
 * DEFAULT_SECTION_ORDER, so it lands where the registry says it belongs even
 * on a card the host has reordered, and at the front when nothing precedes it.
 * Enabled, matching how a new event starts; a host who does not want it has
 * the same toggle they have for every other section.
 *
 * Only ever adds. A section the host switched off is `enabled: false` and
 * still present, so nothing here can turn it back on, and a custom section is
 * never touched.
 */
function withRegisteredSections(
  blocks: readonly CardBlock[],
): readonly CardBlock[] {
  const present = new Set(
    blocks
      .filter((block) => block.kind === "builtin")
      .map((block) => block.id),
  );

  const missing = DEFAULT_SECTION_ORDER.filter((id) => !present.has(id));

  if (missing.length === 0) {
    return blocks;
  }

  const next = [...blocks];

  for (const id of missing) {
    const rank = DEFAULT_SECTION_ORDER.indexOf(id);
    let at = 0;

    for (let i = next.length - 1; i >= 0; i -= 1) {
      const block = next[i];

      if (
        block.kind === "builtin" &&
        DEFAULT_SECTION_ORDER.indexOf(block.id) < rank
      ) {
        at = i + 1;
        break;
      }
    }

    next.splice(at, 0, { kind: "builtin", id, enabled: true });
  }

  return next;
}

/**
 * Fills in draft fields that did not exist when the row was written.
 *
 * event_draft is a jsonb snapshot of EventDraft as it stood the day the host
 * saved, so every draft written before sub-events existed has no `subEvents`
 * key. TypeScript would go on believing it was an array, `.map` would be called
 * on undefined, and a card saved last month would throw in the middle of a
 * guest's render.
 *
 * Only `subEvents` needs this. The family fields are declared optional and
 * `undefined` is a shape their readers already handle, which is the difference
 * between a field that is missing and a field that is empty.
 */
function withDraftDefaults(draft: EventDraft): EventDraft {
  return Array.isArray(draft.subEvents) ? draft : { ...draft, subEvents: [] };
}

/**
 * Row to app shape.
 *
 * isPaid is taken from the column and written over whatever card_config carries.
 * The JSON copy exists because the renderer takes one CardConfig object, but the
 * column is what a payment writes to — so if the two ever disagree, the column
 * wins and a stale JSON value cannot hand out a free unwatermarked card.
 */
export function toStoredEvent(
  row: EventRow | EventByInviteCodeRow,
): StoredEvent {
  return {
    id: row.id,
    inviteCode: row.invite_code,
    config: {
      ...row.card_config,
      blocks: withRegisteredSections(row.card_config.blocks),
      isPaid: row.is_paid,
    },
    draft: withDraftDefaults(row.event_draft),
    isPaid: row.is_paid,
    /*
      `?? null` rather than a straight read. Until 0003 is applied the column is
      not in the row at all, and `undefined` would be a StoredEvent that does not
      match its own type. Both mean "no cover was ever chosen".
    */
    coverAnimation: row.cover_animation ?? null,
    /*
      `=== true`, not a truthiness test. Null is "never asked" and false is
      "asked and declined", and a card treats them identically: no weather.
    */
    showWeather: row.show_weather === true,
    coordinates:
      typeof row.latitude === "number" && typeof row.longitude === "number"
        ? { latitude: row.latitude, longitude: row.longitude }
        : null,
    weatherTheme: row.weather_theme ?? null,
    /*
      `=== true` rather than a straight read. Until 0005 is applied the host's
      row has no such key, and until 0006 the guest's read does not project it;
      either way a missing key has to mean off.
    */
    qrCheckinEnabled: row.qr_checkin_enabled === true,
  };
}

/**
 * App shape to an insert.
 *
 * The invite code is a parameter rather than a field on the draft because it is
 * minted server-side, once, by lib/inviteCode.ts — never derived from anything
 * the host typed.
 */
export function toEventInsert(
  hostId: string,
  inviteCode: string,
  config: CardConfig,
  draft: EventDraft,
  coverAnimation: CoverAnimationId,
  weather: {
    showWeather: boolean;
    themeId: WeatherThemeId;
    /** Null when the venue could not be geocoded, which is a card with no weather. */
    coordinates: Coordinates | null;
  },
  qrCheckinEnabled: boolean,
): EventInsert {
  return {
    host_id: hostId,
    invite_code: inviteCode,
    card_config: config,
    event_draft: draft,
    is_paid: config.isPaid,
    /*
      A CoverAnimationId on the way in, a plain string on the way out. The
      caller has already checked it against the union, so what reaches the
      column is one of the five the check constraint allows; what comes back
      is whatever the row happens to hold.
    */
    cover_animation: coverAnimation,
    show_weather: weather.showWeather,
    weather_theme: weather.themeId,
    /*
      Written whether or not the host switched weather on. The dashboard shows
      the forecast to the host either way — it is useful for their own planning
      even when guests never see it — so the coordinates are worth keeping the
      moment they are known.
    */
    latitude: weather.coordinates?.latitude ?? null,
    longitude: weather.coordinates?.longitude ?? null,
    qr_checkin_enabled: qrCheckinEnabled,
  };
}

/**
 * Guest row to the app's Guest.
 *
 * `message` crosses from null to undefined: the column is nullable because SQL
 * has no notion of an absent key, while Guest.message is optional because the
 * seeded rows never had one. Both mean "nothing to show", and GuestTable
 * already renders that as a dash.
 */
export function toGuest(row: GuestRow): Guest {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    rsvp: row.rsvp,
    accompanyingCount: row.accompanying_count,
    message: row.message ?? undefined,
    respondedAt: row.responded_at,
    checkedIn: row.checked_in,
    checkedInAt: row.checked_in_at,
  };
}

/**
 * A guest's reply to an insert.
 *
 * partySize counts the guest themselves; accompanying_count does not. Clamped
 * to the column's own 0..9 check, so a malformed size is refused here rather
 * than arriving as a constraint violation.
 *
 * respondedAt is a parameter, minted by the caller in its handler. Nothing here
 * reads the clock: a converter that called now() would put a timestamp into a
 * render.
 */
export function toGuestInsert(
  eventId: string,
  reply: {
    name: string;
    phone: string;
    status: Exclude<RsvpStatus, "pending">;
    partySize: number;
    message: string;
    respondedAt: string;
  },
): GuestInsert {
  const trimmedMessage = reply.message.trim();

  return {
    event_id: eventId,
    name: reply.name,
    phone: reply.phone,
    rsvp: reply.status,
    /* Clamped to the column's own check constraint, 0..9. */
    accompanying_count: Math.min(9, Math.max(0, reply.partySize - 1)),
    message: trimmedMessage.length > 0 ? trimmedMessage : null,
    responded_at: reply.respondedAt,
    checked_in: false,
    checked_in_at: null,
  };
}
