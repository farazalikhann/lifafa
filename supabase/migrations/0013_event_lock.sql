-- ============================================================================
-- Lifafa — 0013: paid invitations lock after the event, and cannot be reused
--
-- Run after 0012_unpaid_invites_closed.sql — this file redefines submit_reply()
-- with 0012's unpaid check kept in it, so running 0012 after this one would
-- undo the ended check. Paste it into the Supabase SQL editor once; it is safe
-- to run again.
--
-- THE RULES (the app holds the same ones in lib/eventLock.ts)
--
--   ENDED. A paid invitation's end date is the latest of its main date and its
--   timeline functions' dates. From 00:00 India time on the day after it, the
--   invitation is ended: the host can no longer change it, and it takes no
--   replies and no check-ins. Guests can still open it. An admin can unlock
--   one for a while (edit_unlocked_until).
--
--   NO REUSE. When an invitation is paid for, its end date is kept as
--   original_end_date. After that, a save that changes any date counts as one
--   date change: at most two, and never to an end date more than 180 days past
--   the original. A save that changes the names on the cover — in the card's
--   language or any translation — counts as one name change: at most three.
--
-- Unpaid invitations are untouched by all of it.
--
-- WHERE IT IS ENFORCED. A trigger on events, for writes made as `anon` or
-- `authenticated` — which is every write a host can make, through the app or
-- straight to the REST API. The server's own writes (the payment webhook, the
-- admin's unlock and reset) run as the service role and pass through, and the
-- trigger is also what records original_end_date at the moment of payment.
-- A refused write raises SQLSTATE 'PT403', which the REST API returns as HTTP
-- 403; its message names the rule ('event_ended', 'date_limit',
-- 'date_required', 'name_limit') for the app to explain.
--
-- Guests: submit_reply() and the guests insert policy refuse an unpaid or an
-- ended invitation, and a check-in on one is refused by a trigger on guests.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- The columns
-- ----------------------------------------------------------------------------
alter table public.events
  add column if not exists original_end_date   date,
  add column if not exists date_change_count   integer not null default 0,
  add column if not exists name_change_count   integer not null default 0,
  add column if not exists edit_unlocked_until timestamptz;

alter table public.events drop constraint if exists events_date_change_count_check;
alter table public.events
  add constraint events_date_change_count_check check (date_change_count >= 0);
alter table public.events drop constraint if exists events_name_change_count_check;
alter table public.events
  add constraint events_name_change_count_check check (name_change_count >= 0);


-- ----------------------------------------------------------------------------
-- Reading the card's dates and names out of event_draft
-- ----------------------------------------------------------------------------

-- A real YYYY-MM-DD date, or null: "2026-02-30" or a stray string is not one.
create or replace function public.try_iso_date(p_value text)
returns date
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  if p_value is null or p_value !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;

  return p_value::date;
exception
  when others then
    return null;
end;
$$;

-- Every date on the card: the main one and each function's.
create or replace function public.event_dates(p_draft jsonb)
returns table (d date)
language sql
immutable
set search_path = public, pg_temp
as $$
  select x.d
  from (
    select public.try_iso_date(p_draft ->> 'eventDate') as d
    union all
    select public.try_iso_date(s ->> 'date')
    from jsonb_array_elements(
      case when jsonb_typeof(p_draft -> 'subEvents') = 'array'
           then p_draft -> 'subEvents' else '[]'::jsonb end
    ) as s
  ) as x
  where x.d is not null;
$$;

-- The latest date on the card, or null when it has none.
create or replace function public.event_end_date(p_draft jsonb)
returns date
language sql
immutable
set search_path = public, pg_temp
as $$
  select max(d) from public.event_dates(p_draft);
$$;

-- The dates as one string (same as dateSignature in lib/eventLock.ts).
create or replace function public.event_date_signature(p_draft jsonb)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(string_agg(to_char(d, 'YYYY-MM-DD'), ',' order by d), '')
  from public.event_dates(p_draft);
$$;

-- One set of cover names (same as nameTriple in lib/eventLock.ts).
create or replace function public.event_name_triple(p_words jsonb)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select concat_ws('|',
    btrim(coalesce(p_words ->> 'partyOneName', ''), E' \t\n\r'),
    btrim(coalesce(p_words ->> 'partyTwoName', ''), E' \t\n\r'),
    btrim(coalesce(p_words ->> 'hostNames', ''), E' \t\n\r'));
$$;

-- The names in the card's language and every translation (same as
-- nameSignature in lib/eventLock.ts).
create or replace function public.event_name_signature(p_draft jsonb)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select concat_ws(';',
    public.event_name_triple(p_draft),
    (select string_agg(t.key || ':' || public.event_name_triple(t.value), ';' order by t.key)
     from jsonb_each(
       case when jsonb_typeof(p_draft -> 'translations') = 'object'
            then p_draft -> 'translations' else '{}'::jsonb end
     ) as t
     where jsonb_typeof(t.value) = 'object'));
$$;

-- Today in India. India keeps no daylight saving.
create or replace function public.ist_today()
returns date
language sql
stable
set search_path = public, pg_temp
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- Paid and past its end date in India.
create or replace function public.event_has_ended(p_is_paid boolean, p_draft jsonb)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce(p_is_paid, false)
     and public.event_end_date(p_draft) is not null
     and public.ist_today() > public.event_end_date(p_draft);
$$;


-- ----------------------------------------------------------------------------
-- Existing paid invitations: the end date they carry now, and no changes yet
--
-- updated_at is left alone: nobody edited these cards.
-- ----------------------------------------------------------------------------
alter table public.events disable trigger events_set_updated_at;

update public.events
set original_end_date = public.event_end_date(event_draft)
where is_paid
  and original_end_date is null;

alter table public.events enable trigger events_set_updated_at;


-- ----------------------------------------------------------------------------
-- The trigger on events
-- ----------------------------------------------------------------------------
create or replace function public.events_guard_card_edits()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_old_end date;
  v_new_end date;
begin
  -- The server (payment webhook, admin): through, recording the end date an
  -- invitation is paid with at the moment it is paid.
  if current_user not in ('anon', 'authenticated') then
    if tg_op = 'UPDATE' and not old.is_paid and new.is_paid then
      new.original_end_date := public.event_end_date(new.event_draft);
      new.date_change_count := 0;
      new.name_change_count := 0;
    end if;

    return new;
  end if;

  -- A host never writes these four.
  if tg_op = 'INSERT' then
    new.original_end_date   := null;
    new.date_change_count   := 0;
    new.name_change_count   := 0;
    new.edit_unlocked_until := null;
    return new;
  end if;

  new.original_end_date   := old.original_end_date;
  new.date_change_count   := old.date_change_count;
  new.name_change_count   := old.name_change_count;
  new.edit_unlocked_until := old.edit_unlocked_until;

  if not old.is_paid then
    return new;
  end if;

  -- Ended, and not unlocked by an admin: no change at all.
  v_old_end := public.event_end_date(old.event_draft);

  if v_old_end is not null
     and public.ist_today() > v_old_end
     and (old.edit_unlocked_until is null or old.edit_unlocked_until <= now()) then
    raise sqlstate 'PT403' using message = 'event_ended';
  end if;

  -- Dates: one change per save that touches any of them.
  if public.event_date_signature(new.event_draft)
     is distinct from public.event_date_signature(old.event_draft) then
    v_new_end := public.event_end_date(new.event_draft);

    if v_new_end is null then
      raise sqlstate 'PT403' using message = 'date_required';
    end if;

    if old.date_change_count >= 2 then
      raise sqlstate 'PT403' using message = 'date_limit';
    end if;

    if old.original_end_date is not null
       and v_new_end > old.original_end_date + 180 then
      raise sqlstate 'PT403' using message = 'date_limit';
    end if;

    new.date_change_count := old.date_change_count + 1;

    -- Paid before it had a date: the first date it is given is its original.
    if old.original_end_date is null then
      new.original_end_date := v_new_end;
    end if;
  end if;

  -- Names: one change per save that touches any of them.
  if public.event_name_signature(new.event_draft)
     is distinct from public.event_name_signature(old.event_draft) then
    if old.name_change_count >= 3 then
      raise sqlstate 'PT403' using message = 'name_limit';
    end if;

    new.name_change_count := old.name_change_count + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists events_guard_card_edits on public.events;

create trigger events_guard_card_edits
  before insert or update on public.events
  for each row
  execute function public.events_guard_card_edits();


-- ----------------------------------------------------------------------------
-- Guests: no replies and no check-ins for an unpaid or an ended invitation
-- ----------------------------------------------------------------------------

-- Whether an invitation takes replies: it exists, is paid, and has not ended.
create or replace function public.event_accepts_replies(p_event_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.is_paid
      and not public.event_has_ended(e.is_paid, e.event_draft)
  );
$$;

revoke all on function public.event_accepts_replies(uuid) from public;
grant execute on function public.event_accepts_replies(uuid) to anon, authenticated;

-- The direct insert path (0001) followed only event_exists(), so a reply could
-- be written straight to the table for any invitation, round submit_reply().
drop policy if exists "guests_insert_anon" on public.guests;
create policy "guests_insert_anon"
  on public.guests
  for insert
  to anon, authenticated
  with check (public.event_accepts_replies(event_id));

-- Check-in, which is a host's update of checked_in.
create or replace function public.guests_guard_checkin()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_is_paid boolean;
  v_draft   jsonb;
begin
  if current_user not in ('anon', 'authenticated')
     or not coalesce(new.checked_in, false)
     or coalesce(old.checked_in, false) then
    return new;
  end if;

  select e.is_paid, e.event_draft into v_is_paid, v_draft
  from public.events e
  where e.id = new.event_id;

  if not coalesce(v_is_paid, false) then
    raise sqlstate 'PT403' using message = 'not_active';
  end if;

  if public.event_has_ended(v_is_paid, v_draft) then
    raise sqlstate 'PT403' using message = 'event_ended';
  end if;

  return new;
end;
$$;

drop trigger if exists guests_guard_checkin on public.guests;

create trigger guests_guard_checkin
  before update on public.guests
  for each row
  execute function public.guests_guard_checkin();


-- ----------------------------------------------------------------------------
-- submit_reply(): 0012's function, refusing an ended invitation as well
--
-- Same signature and return type, so replaced in place. The only change from
-- 0012 is the ended check after the unpaid one.
-- ----------------------------------------------------------------------------
create or replace function public.submit_reply(
  p_invite_code        text,
  p_name               text,
  p_phone              text,
  p_rsvp               text,
  p_accompanying_count integer,
  p_message            text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_is_paid  boolean;
  v_draft    jsonb;
  v_phone    text;
  v_message  text;
  v_token    text;
begin
  if p_rsvp not in ('accepted', 'declined', 'maybe') then
    raise exception 'invalid rsvp value';
  end if;

  if p_accompanying_count is null
     or p_accompanying_count < 0
     or p_accompanying_count > 9 then
    raise exception 'invalid accompanying count';
  end if;

  if p_name is null or length(btrim(p_name)) = 0 then
    raise exception 'name is required';
  end if;

  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if p_rsvp = 'accepted' then
    if length(v_phone) <> 10 then
      raise exception 'phone must be 10 digits for an acceptance';
    end if;
  elsif length(v_phone) = 0 then
    v_phone := null;
  elsif length(v_phone) <> 10 then
    raise exception 'phone must be 10 digits';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');

  select id, is_paid, event_draft into v_event_id, v_is_paid, v_draft
  from public.events
  where invite_code = p_invite_code;

  if v_event_id is null then
    raise exception 'unknown invite code';
  end if;

  -- An unpaid invitation takes no replies (0012).
  if not v_is_paid then
    raise sqlstate 'PT403' using message = 'This invitation is not active yet.';
  end if;

  -- Nor does one whose event is over.
  if public.event_has_ended(v_is_paid, v_draft) then
    raise sqlstate 'PT403' using message = 'This event has ended.';
  end if;

  insert into public.guests (
    event_id, name, phone, rsvp, accompanying_count, message, responded_at
  )
  values (
    v_event_id, btrim(p_name), v_phone, p_rsvp, p_accompanying_count, v_message, now()
  )
  on conflict (event_id, phone) do update set
    name               = excluded.name,
    rsvp               = excluded.rsvp,
    accompanying_count = excluded.accompanying_count,
    message            = excluded.message,
    responded_at       = excluded.responded_at
  returning checkin_token into v_token;

  if p_rsvp = 'accepted' then
    return v_token;
  end if;

  return null;
end;
$$;

revoke all on function public.submit_reply(text, text, text, text, integer, text) from public;
grant execute on function public.submit_reply(text, text, text, text, integer, text) to anon, authenticated;

commit;
