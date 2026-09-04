-- ============================================================================
-- Lifafa — 0004: weather on the invitation
--
-- RUN 0003_cover_animation.sql FIRST. This migration recreates
-- event_by_invite_code() with the full guest-facing column list, cover_animation
-- among them, so applying it against a database that has not had 0003 will fail
-- on that column and roll the whole thing back. Which is the point of the
-- transaction below: a half applied schema is worse than an unapplied one.
--
-- WHAT THIS ADDS
--
-- Four columns on public.events:
--
--   show_weather   whether guests see the weather on the card at all
--   latitude       the venue, resolved once at save time
--   longitude
--   weather_theme  which of the four panel treatments to draw
--
-- Coordinates are stored rather than looked up per page load. The venue lives
-- in event_draft as free text — a name and an address, nothing geocoded — and
-- an invitation opened by three hundred guests must not geocode three hundred
-- times. lib/weather.ts resolves them once, in the write path, and everything
-- afterwards reads two numbers off the row.
--
-- WHY EVERY COLUMN IS NULLABLE WITH NO DEFAULT
--
-- Every event that already exists predates all of this and has no answer to any
-- of it. Null means never asked, needs no backfill, and reads as "off" in the
-- one place it matters: the card checks show_weather is true, so null and false
-- both mean guests see nothing. A NOT NULL DEFAULT false would say the same
-- thing while rewriting every existing row to say it.
-- ============================================================================

begin;


-- ----------------------------------------------------------------------------
-- Columns
-- ----------------------------------------------------------------------------
alter table public.events
  add column if not exists show_weather boolean;

alter table public.events
  add column if not exists latitude double precision;

alter table public.events
  add column if not exists longitude double precision;

alter table public.events
  add column if not exists weather_theme text;


-- ----------------------------------------------------------------------------
-- Checks
--
-- Dropped before they are added so this file can be re-run after the list of
-- theme ids grows.
--
-- The coordinate bounds are not decoration. These values are pasted straight
-- into a URL for a third party API, and a swapped latitude and longitude, or a
-- degrees value that is really a distance, should be refused at the row rather
-- than answered with the weather somewhere in the sea.
-- ----------------------------------------------------------------------------
alter table public.events
  drop constraint if exists events_weather_theme_check;

alter table public.events
  add constraint events_weather_theme_check
  check (
    weather_theme is null
    or weather_theme in ('minimal', 'panel', 'strip', 'ornamental')
  );

alter table public.events
  drop constraint if exists events_latitude_check;

alter table public.events
  add constraint events_latitude_check
  check (latitude is null or latitude between -90 and 90);

alter table public.events
  drop constraint if exists events_longitude_check;

alter table public.events
  add constraint events_longitude_check
  check (longitude is null or longitude between -180 and 180);


-- ----------------------------------------------------------------------------
-- event_by_invite_code(), reprojected again
--
-- anon has no SELECT policy on public.events, so this function is the only door
-- a guest has and a column it does not project does not exist as far as an
-- invitation is concerned. The card needs the coordinates to ask about the
-- weather, show_weather to know whether to, and weather_theme to know how to
-- draw it.
--
-- Dropped rather than replaced: `create or replace function` cannot change a
-- return type, and adding to RETURNS TABLE is exactly that. The grants go with
-- the drop, so they are restated.
--
-- Still guest-facing columns only. host_id, payment_id and the timestamps stay
-- unprojected, as they have been since 0001.
-- ----------------------------------------------------------------------------
drop function if exists public.event_by_invite_code(text);

create function public.event_by_invite_code(p_invite_code text)
returns table (
  id              uuid,
  invite_code     text,
  card_config     jsonb,
  event_draft     jsonb,
  is_paid         boolean,
  cover_animation text,
  show_weather    boolean,
  latitude        double precision,
  longitude       double precision,
  weather_theme   text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select e.id, e.invite_code, e.card_config, e.event_draft, e.is_paid,
         e.cover_animation, e.show_weather, e.latitude, e.longitude,
         e.weather_theme
  from public.events e
  where e.invite_code = p_invite_code
  limit 1;
$$;

revoke all on function public.event_by_invite_code(text) from public;
grant execute on function public.event_by_invite_code(text) to anon, authenticated;


commit;
