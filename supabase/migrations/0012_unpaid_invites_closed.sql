-- ============================================================================
-- Lifafa — 0012: unpaid invitations are closed at the database too
--
-- Run after 0011_translation_usage.sql. Paste it into the Supabase SQL editor
-- once; it is safe to run again. No table or data changes: three functions.
--
-- WHY THIS IS HERE AND NOT ONLY IN THE APP
--
-- The guest page, its preview metadata, the share image, the RSVP action and
-- check-in all refuse an unpaid invitation in the app (see
-- lib/db/inviteEvent.ts). But the two functions a guest's browser path goes
-- through are SECURITY DEFINER and granted to `anon`, and the anon key is
-- public: it ships in the browser bundle. So anyone holding an invite code
-- could call them straight through the REST API, round the app:
--
--   event_by_invite_code()  handed back an unpaid card's names, date and venue;
--   submit_reply()          wrote an RSVP to an unpaid card.
--
-- After this file, the database gives the same answer the app does.
--
-- event_by_invite_code()  returns the row only when the card is paid, or when
--                         the caller is its host (auth.uid()), which is what
--                         lets a host preview their own unpaid card.
-- invite_is_pending()     new: whether an unpaid card exists for a code, and
--                         nothing else, so the page can say "not active yet"
--                         rather than "not found". It reveals only what that
--                         page already says.
-- submit_reply()          refuses an unpaid card with SQLSTATE 'PT403', which
--                         PostgREST answers as HTTP 403. The rest of the
--                         function is 0007's, unchanged.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- event_by_invite_code(): paid, or the caller's own
--
-- Same signature and columns as 0006, so replaced in place.
-- ----------------------------------------------------------------------------
create or replace function public.event_by_invite_code(p_invite_code text)
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
    and (e.is_paid or e.host_id = auth.uid())
  limit 1;
$$;

revoke all on function public.event_by_invite_code(text) from public;
grant execute on function public.event_by_invite_code(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- invite_is_pending(): does an unpaid card exist for this code?
-- ----------------------------------------------------------------------------
create or replace function public.invite_is_pending(p_invite_code text)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.events e
    where e.invite_code = p_invite_code
      and not e.is_paid
  );
$$;

revoke all on function public.invite_is_pending(text) from public;
grant execute on function public.invite_is_pending(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- submit_reply(): 0007's function, refusing an unpaid card
--
-- Same signature and return type as 0007, so replaced in place. The only
-- change is the is_paid check after the event is found.
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

  select id, is_paid into v_event_id, v_is_paid
  from public.events
  where invite_code = p_invite_code;

  if v_event_id is null then
    raise exception 'unknown invite code';
  end if;

  -- An unpaid invitation takes no replies. PT403 is PostgREST's way of
  -- choosing the HTTP status: the caller gets a 403.
  if not v_is_paid then
    raise sqlstate 'PT403' using message = 'This invitation is not active yet.';
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
