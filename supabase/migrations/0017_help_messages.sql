-- ============================================================================
-- Lifafa — 0017: help_messages
--
-- Run after 0016_ribbon_seal_cover.sql. Paste it into the Supabase SQL editor
-- once; it is safe to run again.
--
-- One row per message sent through the Help bot, from the home page or a
-- host's dashboard. Written by lib/help/actions.ts and read in /admin/help.
--
-- THE SECURITY SHAPE
--
-- RLS is enabled and FORCEd with NO policies, and every grant to anon and
-- authenticated is revoked. No browser can read or write a row. Only the
-- server, through lib/supabase/admin.ts (whose service role bypasses RLS),
-- touches this table.
-- ============================================================================

create table if not exists public.help_messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),

  name        text not null check (char_length(name) between 1 and 80),
  -- An email address or a phone number; the action checks which.
  contact     text not null check (char_length(contact) between 1 and 120),
  message     text not null check (char_length(message) between 1 and 2000),

  -- Where it was sent from.
  page        text check (page in ('home', 'dashboard')),

  -- The signed-in host, if any. Filled from the session, never from the form.
  -- set null: closing an account keeps the message but drops the link.
  user_id     uuid references auth.users (id) on delete set null,
  user_email  text,

  -- The event dashboard it was sent from, if any.
  event_id    uuid references public.events (id) on delete set null,

  status      text not null default 'new'
                check (status in ('new', 'replied', 'closed')),
  admin_note  text
);

-- The admin list: newest first within a status.
create index if not exists help_messages_status_created_at_idx
  on public.help_messages (status, created_at desc);

-- The per-host rate limit counts a host's recent messages.
create index if not exists help_messages_user_id_created_at_idx
  on public.help_messages (user_id, created_at desc)
  where user_id is not null;

alter table public.help_messages enable row level security;
alter table public.help_messages force row level security;

-- No policies on purpose. Belt and braces: no client role has any grant either.
revoke all on public.help_messages from anon, authenticated;
