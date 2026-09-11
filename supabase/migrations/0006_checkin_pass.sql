-- ============================================================================
-- Lifafa — 0006: a check-in pass for every guest who says yes
--
-- RUN 0005_qr_checkin.sql FIRST. This migration recreates
-- event_by_invite_code() with qr_checkin_enabled in its projection, so applying
-- it against a database without that column fails and the transaction below
-- rolls the whole file back.
--
-- WHERE A REPLY LIVES
--
-- There is no replies table. A guest's reply is their row in public.guests —
-- rsvp, party size, message — written by submit_reply() from 0002. That row
-- already has checked_in_at (0001), so the only new column is the token.
--
-- WHAT THIS ADDS
--
--   guests.checkin_token   text, unique. The secret a guest's QR code carries.
--
-- Minted by a trigger rather than by any one write path, so every route into
-- the table gets the same rule: a row that becomes accepted is issued a token,
-- once. A caller cannot choose one — whatever an insert supplies is replaced —
-- and nobody, the host included, can change or clear one after it is issued.
-- A guest who declines keeps their token; submit_reply() simply stops handing
-- it back until they accept again, and then it is the same pass as before.
--
-- WHO CAN READ IT
--
-- No policy changes. anon still has no SELECT on public.guests, so a guest can
-- never read the table. The token reaches a guest only as the return value of
-- submit_reply(), for the one row their invite code and phone number identify,
-- and only when that row is accepted. A host reads their own guests' tokens
-- through guests_select_host, which the door scanner will need.
--
-- RESIDUAL RISK, stated rather than hidden: the phone number is the only thing
-- that identifies a guest. Anyone with the link and another guest's number can
-- already overwrite that guest's reply through submit_reply(); from here they
-- could also be handed that guest's pass. Closing that needs a guest to prove
-- the number is theirs — a one-time code — which is a feature, not a policy.
-- ============================================================================

begin;


-- ----------------------------------------------------------------------------
-- The column
--
-- Nullable: a declined, maybe or pending reply has no pass. Unique, so a token
-- names exactly one guest and the scanner can look it up without an event id.
-- ----------------------------------------------------------------------------
alter table public.guests
  add column if not exists checkin_token text unique;


-- ----------------------------------------------------------------------------
-- The trigger that issues it
--
-- BEFORE, so the token is in the row that is written and in whatever RETURNING
-- hands back. Not SECURITY DEFINER: it only edits the row already being
-- written, with the rights of whoever is writing it.
-- ----------------------------------------------------------------------------
create or replace function public.guests_issue_checkin_token()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.checkin_token is not null then
    -- Issued once, kept for good: a later decline, a host's edit or a direct
    -- UPDATE naming the column all leave the pass exactly as it was.
    new.checkin_token := old.checkin_token;
  elsif new.rsvp = 'accepted' then
    new.checkin_token := gen_random_uuid()::text;
  else
    -- Not accepted and never issued: no pass, whatever the caller sent.
    new.checkin_token := null;
  end if;

  return new;
end;
$$;

drop trigger if exists guests_issue_checkin_token on public.guests;

create trigger guests_issue_checkin_token
  before insert or update on public.guests
  for each row
  execute function public.guests_issue_checkin_token();


-- ----------------------------------------------------------------------------
-- Backfill
--
-- Every guest who had already accepted gets a pass now. The trigger above is
-- what actually mints it on this UPDATE — old.checkin_token is null and the row
-- is accepted — so the value named here and the one stored are both a fresh
-- gen_random_uuid(), and re-running this file touches nothing new.
-- ----------------------------------------------------------------------------
update public.guests
set checkin_token = gen_random_uuid()::text
where rsvp = 'accepted'
  and checkin_token is null;


-- ----------------------------------------------------------------------------
-- submit_reply(), now answering with the pass
--
-- Dropped rather than replaced: `create or replace function` cannot change a
-- return type, and void to text is exactly that. The grants go with the drop,
-- so they are restated.
--
-- Unchanged apart from the return: the same validation, the same upsert on
-- (event_id, phone), and checked_in / checked_in_at still absent from the
-- DO UPDATE list, because arrival is the host's fact.
-- ----------------------------------------------------------------------------
drop function if exists public.submit_reply(text, text, text, text, integer, text);

create function public.submit_reply(
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
-- Not optional on a definer function: without a pinned search_path, a caller
-- who can create objects could shadow public.guests with their own table and
-- have this function write there with the owner's privileges.
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_phone    text;
  v_message  text;
  v_token    text;
begin
  -- 'pending' is the absence of a reply and is not something a guest can send.
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

  -- Re-normalised server side: the phone number is the key this upsert matches
  -- on, and the browser is not a trust boundary.
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if length(v_phone) <> 10 then
    raise exception 'phone must be 10 digits';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');

  select id into v_event_id
  from public.events
  where invite_code = p_invite_code;

  if v_event_id is null then
    raise exception 'unknown invite code';
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

  -- The pass goes back only with a yes. A declined or maybe reply keeps any
  -- token it was issued — the trigger never clears one — but is not shown it.
  if p_rsvp = 'accepted' then
    return v_token;
  end if;

  return null;
end;
$$;

-- Returns the caller's own token or null, never a row: granting execute is
-- still not granting any view of public.guests.
revoke all on function public.submit_reply(text, text, text, text, integer, text) from public;
grant execute on function public.submit_reply(text, text, text, text, integer, text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- event_by_invite_code(), reprojected for the switch
--
-- The guest's page reads the event only through this function, so the card
-- cannot know whether to show a pass until qr_checkin_enabled is projected.
-- Dropped rather than replaced for the same reason as 0003 and 0004: adding to
-- RETURNS TABLE changes the return type. Still guest-facing columns only.
-- ----------------------------------------------------------------------------
drop function if exists public.event_by_invite_code(text);

create function public.event_by_invite_code(p_invite_code text)
returns table (
  id                 uuid,
  invite_code        text,
  card_config        jsonb,
  event_draft        jsonb,
  is_paid            boolean,
  cover_animation    text,
  show_weather       boolean,
  latitude           double precision,
  longitude          double precision,
  weather_theme      text,
  qr_checkin_enabled boolean
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select e.id, e.invite_code, e.card_config, e.event_draft, e.is_paid,
         e.cover_animation, e.show_weather, e.latitude, e.longitude,
         e.weather_theme, e.qr_checkin_enabled
  from public.events e
  where e.invite_code = p_invite_code
  limit 1;
$$;

revoke all on function public.event_by_invite_code(text) from public;
grant execute on function public.event_by_invite_code(text) to anon, authenticated;


commit;
