import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { Guest, RsvpStatus } from "@/types/guest";

/**
 * Hand-written database types, matching supabase/migrations/0001_initial.sql.
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

export interface EventRow {
  id: string;
  host_id: string;
  invite_code: string;
  /** A CardConfig, stored verbatim. */
  card_config: CardConfig;
  /** An EventDraft, stored verbatim. */
  event_draft: EventDraft;
  is_paid: boolean;
  payment_id: string | null;
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
export interface EventInsert {
  id?: string;
  host_id: string;
  invite_code: string;
  card_config: CardConfig;
  event_draft: EventDraft;
  is_paid?: boolean;
  payment_id?: string | null;
}

/** Every field a host may change. Ownership and identity are not among them. */
export type EventUpdate = Partial<
  Pick<
    EventRow,
    "card_config" | "event_draft" | "is_paid" | "payment_id" | "invite_code"
  >
>;

export interface GuestRow {
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
  created_at: string;
}

export interface GuestInsert {
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
export interface EventByInviteCodeRow {
  id: string;
  invite_code: string;
  card_config: CardConfig;
  event_draft: EventDraft;
  is_paid: boolean;
}

/* ────────────────────── The Database generic ────────────────────── */

/**
 * The shape supabase-js expects from `createClient<Database>()`.
 *
 * Written by hand to the subset actually in use. Every client in lib/supabase
 * is parameterised with it, so a query naming a column that does not exist
 * fails at tsc rather than at runtime.
 */
export interface Database {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
      };
      guests: {
        Row: GuestRow;
        Insert: GuestInsert;
        Update: GuestUpdate;
      };
    };
    Views: Record<never, never>;
    Functions: {
      event_by_invite_code: {
        Args: { p_invite_code: string };
        Returns: EventByInviteCodeRow[];
      };
      event_exists: {
        Args: { p_event_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

/* ──────────────────────── Converters ──────────────────────── */

/**
 * The app-side view of a stored event.
 *
 * Mirrors MockEvent in lib/mockEvent.ts closely enough that the invite page and
 * the share image can move onto it without changing shape — that is the whole
 * point of matching the existing types rather than inventing new ones.
 */
export interface StoredEvent {
  id: string;
  inviteCode: string;
  config: CardConfig;
  draft: EventDraft;
  isPaid: boolean;
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
    config: { ...row.card_config, isPaid: row.is_paid },
    draft: row.event_draft,
    isPaid: row.is_paid,
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
): EventInsert {
  return {
    host_id: hostId,
    invite_code: inviteCode,
    card_config: config,
    event_draft: draft,
    is_paid: config.isPaid,
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
 * partySize counts the guest themselves; accompanying_count does not — the same
 * subtraction lib/guestStore.ts makes, clamped the same way, so the in-memory
 * store and the database cannot disagree about what a party of one means.
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
