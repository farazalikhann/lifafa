-- ============================================================================
-- Lifafa — 0008: only the payment path may say an invitation is paid
--
-- Run after 0007_optional_phone.sql. Paste it into the Supabase SQL editor once;
-- it is safe to run again.
--
-- THE HOLE THIS CLOSES
--
-- events_insert_own and events_update_own (0001) decide which ROWS a host may
-- write, and say nothing about which COLUMNS. So a signed-in host holding the
-- public anon key and their own session token could call the REST API directly
-- — `PATCH /rest/v1/events?id=eq.<theirs>` with `{"is_paid": true}` — and the
-- policy would let it through, because the row is theirs. That is a card with
-- no watermark and no payment behind it.
--
-- The application no longer sends is_paid on either path (createEvent writes
-- false, updateEvent never names it), but the application is not the only
-- client this table has. The database has to hold the line itself.
--
-- WHY A TRIGGER AND NOT A COLUMN GRANT
--
-- Supabase grants table-wide INSERT and UPDATE to anon and authenticated, and
-- in Postgres a table-wide privilege covers every column: a column-level REVOKE
-- beneath it does nothing. Reshaping those grants column by column would have
-- to be kept in step with every column a future migration adds. A trigger reads
-- the one fact that matters — who is writing — and needs no upkeep.
--
-- WHO IS STILL ALLOWED
--
-- PostgREST switches to the `anon` or `authenticated` role for requests made
-- with the anon key, and to `service_role` for the secret key. So a payment
-- webhook using lib/supabase/admin.ts, and anyone working in the SQL editor as
-- `postgres`, can set both columns exactly as before. Only a host's own session
-- — or a guest's — has its values replaced.
-- ============================================================================

begin;

create or replace function public.events_guard_payment_columns()
returns trigger
language plpgsql
-- Not SECURITY DEFINER: current_user has to be the caller's role, which is the
-- entire test below. A pinned search_path regardless, as every function here has.
set search_path = public, pg_temp
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      -- A row that did not exist a moment ago cannot have been paid for.
      new.is_paid    := false;
      new.payment_id := null;
    else
      -- Whatever the request said, the payment state stays what it was.
      new.is_paid    := old.is_paid;
      new.payment_id := old.payment_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists events_guard_payment_columns on public.events;

create trigger events_guard_payment_columns
  before insert or update on public.events
  for each row
  execute function public.events_guard_payment_columns();

commit;
