-- ============================================================================
-- Lifafa — 0011: translation_usage
--
-- Run after 0010_coupons.sql. Paste it into the Supabase SQL editor once; it
-- is safe to run again.
--
-- WHAT THIS IS FOR
--
-- One row per successful AI translate in the editor (app/api/translate/route.ts),
-- which is what lets the server, and not only the browser, hold two rules:
--
--   ONE PER CARD. A card that already has a row cannot translate again.
--
--   ONE UNPAID CARD AT A TIME. While a host has an unpaid card that used AI
--   translate, no other card of theirs may use it. Paying for that card lifts
--   the block, and the next card gets its one translate.
--
-- A CARD IS NAMED TWO WAYS, because it may not be saved yet. `draft_id` is the
-- id the editor mints for the card and keeps in its draft
-- (event_draft.autoTranslation.cardId), so it survives the sign-in stash and
-- the first save. `event_id` is the saved invitation when the translate ran on
-- one; null for a card still being made on /create. The route resolves a
-- null event_id through the draft id when it needs to know whether that card
-- has since been saved and paid.
--
-- `chars_sent` is what Sarvam was actually sent, for estimating cost. Never
-- the text itself.
--
-- ============================================================================
-- THE SECURITY SHAPE
--
-- RLS is enabled and FORCEd with ONE policy: a signed-in host may SELECT their
-- own rows. There is no insert, update or delete policy for anyone, so `anon`
-- and `authenticated` can write nothing, and the grants are revoked as well so
-- the answer is a permission error rather than an empty success. Rows are
-- written only by the route, through lib/supabase/admin.ts, whose service role
-- bypasses RLS. A host cannot erase their own usage to earn another translate.
-- ============================================================================

create table if not exists public.translation_usage (
  id          uuid primary key default gen_random_uuid(),

  -- on delete cascade: closing an account takes its usage with it.
  user_id     uuid not null references auth.users (id) on delete cascade,

  -- The saved invitation, when there is one. set null rather than cascade: a
  -- deleted card's row still counts towards "one per card" for its draft id.
  event_id    uuid references public.events (id) on delete set null,

  -- The editor's id for the card; see the header.
  draft_id    uuid not null,

  chars_sent  integer not null check (chars_sent >= 0),

  created_at  timestamptz not null default now()
);

-- One row per card per host. The route checks before calling Sarvam; this is
-- what makes two racing requests for the same card record once, not twice.
create unique index if not exists translation_usage_user_draft_key
  on public.translation_usage (user_id, draft_id);

create index if not exists translation_usage_user_id_idx
  on public.translation_usage (user_id);

create index if not exists translation_usage_event_id_idx
  on public.translation_usage (event_id);

alter table public.translation_usage enable row level security;
alter table public.translation_usage force row level security;

-- Belt and braces under RLS: no client role writes this table at all.
revoke insert, update, delete on public.translation_usage from anon, authenticated;
grant select on public.translation_usage to authenticated;

drop policy if exists "Hosts read their own translation usage"
  on public.translation_usage;

create policy "Hosts read their own translation usage"
  on public.translation_usage
  for select
  to authenticated
  using (auth.uid() = user_id);
