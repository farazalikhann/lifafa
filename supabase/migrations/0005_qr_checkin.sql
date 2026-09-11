-- ============================================================================
-- Lifafa — 0005: the host's switch for QR check-in at the door
--
-- WHAT THIS ADDS
--
-- One column on public.events:
--
--   qr_checkin_enabled  whether this event scans guests in on the day
--
-- Only the switch. Nothing reads it yet beyond the editor that sets it: the
-- door scanner and the code a guest would show are later work, and each will
-- decide what "off" means for it when it arrives.
--
-- WHY NOT NULL DEFAULT FALSE, WHERE 0004 CHOSE NULLABLE
--
-- 0004 left show_weather nullable so that "never asked" could stay apart from
-- "asked and said no". Here there is no such difference worth keeping: check-in
-- is off unless a host turns it on, for every event old or new, and a column
-- that can only be true or false is one every reader can take at its word.
-- Adding a NOT NULL column with a constant default is a catalogue change on
-- Postgres 11 and later rather than a table rewrite, so every existing row
-- reads false the moment this commits and no row is touched.
--
-- WHAT THIS DOES NOT CHANGE
--
-- No policy. events_update_own already lets a host write any column of their
-- own row and nobody else's, which is exactly who may flip this.
--
-- event_by_invite_code() is not reprojected. The guest's read has no use for
-- the switch until there is a guest-side code to show, and widening a function
-- anon can call is a decision for the step that needs it.
-- ============================================================================

begin;

alter table public.events
  add column if not exists qr_checkin_enabled boolean not null default false;

commit;
