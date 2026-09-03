-- ============================================================================
-- Lifafa — initial schema
--
-- Paste this whole file into the Supabase SQL editor and run it once. It is
-- idempotent enough to re-run on a fresh project, but it is NOT a down
-- migration: it creates, it never drops user data.
--
-- Shapes here mirror the app's TypeScript exactly. events.card_config holds a
-- CardConfig (types/card.ts) and events.event_draft holds an EventDraft
-- (types/event.ts), both verbatim, so the design a host builds in the editor
-- round-trips without a translation layer. The guests table is the flattened
-- form of Guest (types/guest.ts) — see types/database.ts for the converters.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- Extensions
--
-- gen_random_uuid() is built into Postgres 13+ and Supabase runs well past
-- that, so no extension is needed for it. pgcrypto is requested anyway because
-- it is the documented home of that function and enabling it is free if the
-- project is ever restored onto an older instance.
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;


-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- events
--
-- One row per invitation. host_id references auth.users(id) rather than storing
-- an email: sign-in is email today and phone later, and an events table that
-- had learned an email address would have to be migrated the day that changes.
-- The identity lives in auth.users; this table only points at it.
--
-- card_config and event_draft are jsonb rather than fifty columns because they
-- are read and written whole, always together, and their shape is owned by the
-- TypeScript types. Splitting them into columns would mean a migration every
-- time the editor gained a control.
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),

  -- on delete cascade: closing an account takes its invitations with it.
  host_id     uuid not null references auth.users (id) on delete cascade,

  -- The guest-facing credential. Unique because it is what a link resolves by;
  -- see lib/inviteCode.ts for why it is random rather than sequential.
  invite_code text not null unique,

  -- A CardConfig object (types/card.ts), stored verbatim.
  card_config jsonb not null,

  -- An EventDraft object (types/event.ts), stored verbatim.
  event_draft jsonb not null,

  -- The column is the source of truth for payment, not card_config.isPaid.
  -- That field exists inside the JSON too, because the renderer takes one
  -- object; types/database.ts overwrites it from this column on the way out so
  -- a stale JSON value can never grant a free card.
  is_paid     boolean not null default false,
  payment_id  text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- guests
--
-- One row per reply. Guests have no account: the invite link is their whole
-- credential, so nothing here references auth.users.
-- ----------------------------------------------------------------------------
create table if not exists public.guests (
  id                 uuid primary key default gen_random_uuid(),

  -- on delete cascade: deleting an event takes its guest list with it.
  event_id           uuid not null references public.events (id) on delete cascade,

  name               text not null,

  -- Ten digits, normalised in the browser before it ever gets here
  -- (normalisePhone in components/invite/RsvpPanel.tsx). Stored as text, never
  -- a number: a leading zero is meaningful and a phone number is never
  -- arithmetic.
  phone              text not null,

  rsvp               text not null
                     check (rsvp in ('accepted', 'declined', 'maybe', 'pending')),

  -- People this guest brings, NOT counting themselves. The form collects a
  -- party size of 1..10 and subtracts one, so 0..9 is the whole legal range and
  -- the check is what stops a negative quietly subtracting from a headcount.
  accompanying_count integer not null default 0
                     check (accompanying_count between 0 and 9),

  -- Optional note to the hosts. Null, not '', when there is nothing to say.
  message            text,

  -- Null while a guest is still 'pending'.
  responded_at       timestamptz,

  checked_in         boolean not null default false,
  checked_in_at      timestamptz,

  created_at         timestamptz not null default now(),

  -- One reply per phone per event.
  --
  -- A guest who opens the link again and replies a second time — changed their
  -- mind, or is adding a companion — must UPDATE this row, not insert beside
  -- it. Two rows for one phone would double-count them in the headcount the
  -- host hands to a caterer. The write path should therefore upsert on this
  -- constraint; see the note under the guests RLS policies for why that upsert
  -- has to run through a definer function rather than a plain anon UPDATE.
  constraint guests_event_phone_unique unique (event_id, phone)
);


-- ============================================================================
-- INDEXES
--
-- invite_code and (event_id, phone) are already backed by the unique
-- constraints above — a unique constraint builds its own index, and a second
-- one on the same columns would only cost write time. Only the two foreign-key
-- lookups need adding.
-- ============================================================================

-- Every dashboard page load: "the events belonging to this host".
create index if not exists events_host_id_idx on public.events (host_id);

-- Every guest list, headcount and CSV export: "the guests for this event".
create index if not exists guests_event_id_idx on public.guests (event_id);


-- ============================================================================
-- updated_at TRIGGER
-- ============================================================================

-- Set by the database rather than the application: a client that forgets to
-- send updated_at, or sends a wrong clock, cannot corrupt it here.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();


-- ============================================================================
-- ROW LEVEL SECURITY
--
-- Enabled on both tables. With RLS on and no policy matching, the answer is
-- "no rows" — the tables fail closed, and everything below is an explicit
-- exception to that default.
-- ============================================================================

alter table public.events enable row level security;
alter table public.guests enable row level security;

-- Belt and braces: FORCE applies RLS even to the table's owner, so a query run
-- as the owning role in the SQL editor cannot quietly sidestep these policies
-- and give a false all-clear when testing them.
alter table public.events force row level security;
alter table public.guests force row level security;


-- ----------------------------------------------------------------------------
-- Helper: does this event exist?
--
-- SECURITY DEFINER, so it can answer for an event the caller cannot see. It is
-- needed by exactly one policy — anonymous guest insert — which must confirm an
-- event exists without granting the anonymous visitor any ability to read the
-- events table.
--
-- It returns a boolean and nothing else. A caller can learn "this id is real",
-- which they already knew from the link they followed, and cannot learn a
-- single field of the row.
--
-- `set search_path` is not optional on a definer function: without it, a caller
-- who can create objects could put a lookalike table earlier in the path and
-- have this function read theirs instead, while running with the definer's
-- privileges.
-- ----------------------------------------------------------------------------
create or replace function public.event_exists(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.events where id = p_event_id);
$$;

revoke all on function public.event_exists(uuid) from public;
grant execute on function public.event_exists(uuid) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- Guest-facing read: fetch one event by its invite code.
--
-- WHY THIS IS A FUNCTION AND NOT A POLICY — the one deliberate deviation in
-- this file, and the reason is worth stating plainly:
--
-- A policy cannot see the WHERE clause of the query it is filtering. It is a
-- row predicate, nothing more. So "anyone may select an event, but only by
-- invite_code" is not expressible as a policy: the closest you can write is
-- `using (true)`, which permits `select * from events` and hands an anonymous
-- visitor every host's names, venue and date in one request. That is precisely
-- the enumeration the brief asks to prevent.
--
-- Taking the code as an argument is what makes enumeration impossible: a caller
-- must already hold a valid code to get anything back, and one call returns at
-- most one row. There is deliberately NO anon SELECT policy on public.events
-- below — the table is unreadable to anonymous visitors, and this function is
-- the only door.
--
-- It returns the guest-facing columns only. host_id, is_paid, payment_id and
-- the timestamps are not projected: a guest has no use for them, and payment_id
-- in particular should never cross to the guest side.
-- ----------------------------------------------------------------------------
create or replace function public.event_by_invite_code(p_invite_code text)
returns table (
  id          uuid,
  invite_code text,
  card_config jsonb,
  event_draft jsonb,
  is_paid     boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select e.id, e.invite_code, e.card_config, e.event_draft, e.is_paid
  from public.events e
  where e.invite_code = p_invite_code
  limit 1;
$$;

revoke all on function public.event_by_invite_code(text) from public;
grant execute on function public.event_by_invite_code(text) to anon, authenticated;


-- ============================================================================
-- POLICIES — events
--
-- Four host policies, each written separately so the verbs cannot drift.
-- ============================================================================

-- SELECT: a host reads their own events and no one else's.
-- Protects against: one signed-in host reading another host's guest list,
-- venue and date by guessing or iterating event ids.
drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
  on public.events
  for select
  to authenticated
  using ((select auth.uid()) = host_id);

-- INSERT: a host may only create events owned by themselves.
-- Protects against: a host inserting a row with someone else's host_id, which
-- would plant an event in another account — or, with a null host_id, an
-- orphaned row no policy could ever reach again.
drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = host_id);

-- UPDATE: a host may edit their own events, and cannot hand one away.
-- USING decides which rows may be edited; WITH CHECK decides what they may
-- become. Both are required: with USING alone a host could edit their own row
-- and rewrite host_id to another user, silently transferring the event — and
-- with WITH CHECK alone they could edit anyone's row so long as they left it
-- owned by themselves.
drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
  on public.events
  for update
  to authenticated
  using ((select auth.uid()) = host_id)
  with check ((select auth.uid()) = host_id);

-- DELETE: a host may delete their own events.
-- Protects against: deleting another host's event — which, through the cascade
-- on guests.event_id, would destroy their entire guest list.
drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
  on public.events
  for delete
  to authenticated
  using ((select auth.uid()) = host_id);

-- NOTE: there is intentionally no policy granting `anon` any access to
-- public.events. Guest reads go through event_by_invite_code() above. If you
-- ever add `create policy ... to anon for select using (true)` here, you have
-- reopened full table enumeration.


-- ============================================================================
-- POLICIES — guests
--
-- The asymmetry is the point: a guest may write their own reply and can never
-- read anybody's.
-- ============================================================================

-- SELECT: only the host of the owning event may read guest rows.
-- The subquery is itself under RLS, evaluated as the caller, so it can only
-- match events that events_select_own already lets this host see — the check
-- fails closed rather than trusting the join.
-- Protects against: a host reading another host's guest list.
drop policy if exists "guests_select_host" on public.guests;
create policy "guests_select_host"
  on public.guests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.host_id = (select auth.uid())
    )
  );

-- UPDATE: only the host may change a guest row — this is the check-in path.
-- Protects against: a guest editing their own row after the fact, and against
-- any host touching a row on an event they do not own. WITH CHECK repeats the
-- condition so a row cannot be moved to a different event_id on the way out.
drop policy if exists "guests_update_host" on public.guests;
create policy "guests_update_host"
  on public.guests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.host_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.host_id = (select auth.uid())
    )
  );

-- DELETE: only the host may remove a guest row.
-- Protects against: a guest, or another host, deleting entries from a list they
-- do not own.
drop policy if exists "guests_delete_host" on public.guests;
create policy "guests_delete_host"
  on public.guests
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = guests.event_id
        and e.host_id = (select auth.uid())
    )
  );

-- INSERT: an anonymous visitor may add a reply, but only to a real event.
--
-- event_exists() is the definer function above, used because anon cannot read
-- public.events at all — a plain `exists (select 1 from events ...)` here would
-- be filtered by RLS to zero rows and every insert would be refused.
--
-- Protects against: rows landing on a fabricated event_id, which would
-- accumulate unreachable data no host could ever see or clear. It does NOT
-- attempt to prove who the visitor is; there is no guest account to prove it
-- against, and the invite link is the only credential in play.
--
-- RESIDUAL RISK, stated rather than hidden: anyone holding a valid event id can
-- submit replies to it, so the guest list is spammable by someone who has the
-- link. The unique constraint on (event_id, phone) caps that at one row per
-- phone number, which is the meaningful limit. Rate limiting belongs in front
-- of the API, not in a policy.
drop policy if exists "guests_insert_anon" on public.guests;
create policy "guests_insert_anon"
  on public.guests
  for insert
  to anon, authenticated
  with check (public.event_exists(event_id));

-- NOTE: there is intentionally no SELECT policy for `anon` on public.guests. A
-- guest must never be able to read the guest list — it is a list of names and
-- phone numbers. Two consequences to write code around:
--
--   1. An anonymous insert cannot use `.select()` to return the inserted row,
--      because RETURNING needs SELECT permission. Insert without selecting.
--   2. A repeat reply needs to UPDATE the existing row (see the unique
--      constraint above), and anon has no UPDATE policy here — by design. That
--      upsert must go through a SECURITY DEFINER function that takes the invite
--      code and the phone and updates exactly the one matching row. Do not
--      solve it by granting anon UPDATE on this table: that would let anyone
--      with the link rewrite another guest's reply, or flip checked_in.
