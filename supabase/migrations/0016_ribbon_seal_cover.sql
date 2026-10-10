-- ============================================================================
-- Lifafa — 0016: the Ribbon & Seal cover
--
-- Run after 0015_rose_bloom_cover.sql. Paste it into the Supabase SQL editor
-- once. Safe to run again.
--
-- WHAT THIS CHANGES
--
-- One line of the check on public.events.cover_animation, added in
-- 0003_cover_animation.sql and last widened in 0015: the list of ids a card
-- may be saved with gains 'ribbon-seal', the seventh cover in
-- types/coverAnimation.ts. Nothing else. No column is added, no row is
-- touched, and event_by_invite_code() already projects the column whatever it
-- holds.
--
-- WHY IT MUST BE APPLIED TO THE LIVE DATABASE BEFORE THE APPLICATION IS PUSHED
--
-- The designer offers Ribbon & Seal the moment the application is deployed.
-- Until this has run, the check still lists six ids, so Postgres refuses any
-- insert or update that names 'ribbon-seal' (error 23514) and the host is told
-- their card could not be saved. The application does not drop the cover and
-- save the card without it: a card saved with a cover it did not ask for is
-- worse than a save that says no. Every other cover saves exactly as before.
--
-- The six existing ids are unchanged, so no saved card is affected.
-- ============================================================================

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
      'petal-dust',
      'rose-bloom',
      'ribbon-seal'
    )
  );
