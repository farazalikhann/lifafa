-- ============================================================================
-- Lifafa — 0003: the cover animation a card opens with
--
-- Run after 0002_reply_upsert.sql. Paste it into the Supabase SQL editor once.
--
-- WHAT THIS ADDS
--
-- One column on public.events, holding the id of the opening animation the host
-- chose: how the invitation is wrapped before a guest taps it. The ids are the
-- five in types/coverAnimation.ts and they are permanent — a saved row keeps
-- the literal string, so renaming one here would orphan every card carrying it.
--
-- WHY IT IS NULLABLE, WITH NO DEFAULT
--
-- Every event that already exists was saved before covers existed, and none of
-- them has an answer to this question. A NOT NULL column would need a default
-- to land at all, and that default would be a decision made on behalf of hosts
-- who were never asked — every existing invitation would silently acquire an
-- envelope. Null is the honest value for "never chosen", it needs no backfill,
-- and lib/coverAnimations.ts already resolves null to the "none" option, so an
-- old invite goes on opening exactly the way it does today.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- The column
-- ----------------------------------------------------------------------------
alter table public.events
  add column if not exists cover_animation text;


-- ----------------------------------------------------------------------------
-- The check
--
-- Null is allowed and is the "never chosen" case above. Anything else must be
-- one of the five known ids: the application validates with isCoverAnimationId
-- before it writes, and this is the line that holds when something else does
-- the writing — a SQL editor session, a future import, a bug.
--
-- Dropped first so the migration can be re-run after the list of ids grows.
-- ----------------------------------------------------------------------------
alter table public.events
  drop constraint if exists events_cover_animation_check;

alter table public.events
  add constraint events_cover_animation_check
  check (
    cover_animation is null
    or cover_animation in (
      'none',
      'envelope-seal',
      'curtain-reveal',
      'fold-unfold',
      'petal-dust'
    )
  );


-- ----------------------------------------------------------------------------
-- event_by_invite_code(), reprojected
--
-- The guest-facing read goes through this function and nothing else: anon has
-- no SELECT policy on public.events, so a column the function does not project
-- does not exist as far as an invitation is concerned. The cover is drawn for
-- the guest, so it has to come out here.
--
-- Dropped rather than replaced. `create or replace function` cannot change a
-- function's return type, and adding a column to RETURNS TABLE is exactly that
-- — the replace fails with "cannot change return type of existing function".
-- The grants go with the drop, so they are restated below.
--
-- Still the guest-facing columns only: host_id, payment_id and the timestamps
-- stay unprojected, as they were.
-- ----------------------------------------------------------------------------
drop function if exists public.event_by_invite_code(text);

create function public.event_by_invite_code(p_invite_code text)
returns table (
  id              uuid,
  invite_code     text,
  card_config     jsonb,
  event_draft     jsonb,
  is_paid         boolean,
  cover_animation text
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select e.id, e.invite_code, e.card_config, e.event_draft, e.is_paid,
         e.cover_animation
  from public.events e
  where e.invite_code = p_invite_code
  limit 1;
$$;

revoke all on function public.event_by_invite_code(text) from public;
grant execute on function public.event_by_invite_code(text) to anon, authenticated;
