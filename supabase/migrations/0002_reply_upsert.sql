-- ============================================================================
-- Lifafa — 0002: the guest reply write path
--
-- Run after 0001_initial.sql.
--
-- WHY THIS EXISTS
--
-- A guest has no account. The invite link is their whole credential, so the
-- anon role is what writes their reply — and 0001 gives anon INSERT on
-- public.guests and nothing else. No SELECT, no UPDATE, deliberately: the guest
-- list is names and phone numbers, and anon UPDATE would let anyone holding the
-- link rewrite another guest's reply or flip their checked_in flag.
--
-- But a guest who replies twice — changed their mind, or is adding a companion
-- — must update their existing row rather than insert beside it, because
-- guests_event_phone_unique forbids the second insert and two rows for one
-- phone would double-count them in the caterer's headcount either way.
--
-- INSERT-only plus a required UPDATE is the deadlock. This function is the way
-- through: SECURITY DEFINER, so the upsert runs with the owner's rights, while
-- the caller is confined to exactly the one row their phone number identifies
-- on exactly the one event their invite code names. Nothing is returned, so it
-- cannot be used to read the list it writes to.
-- ============================================================================

create or replace function public.submit_reply(
  p_invite_code        text,
  p_name               text,
  p_phone              text,
  p_rsvp               text,
  p_accompanying_count integer,
  p_message            text
)
returns void
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
begin
  -- --------------------------------------------------------------------------
  -- Validate before touching anything.
  --
  -- The table's own CHECK constraints would catch all of this, but a constraint
  -- violation surfaces as a Postgres error string. Raising here keeps the
  -- failure legible and keeps the column definitions as the backstop rather
  -- than the interface.
  -- --------------------------------------------------------------------------

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

  -- Re-normalise server side. The browser already strips this down to ten
  -- digits (normalisePhone in components/invite/RsvpPanel.tsx), but the browser
  -- is not a trust boundary and the phone number is the key this upsert matches
  -- on — a stray space would land as a second row for the same person.
  v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if length(v_phone) <> 10 then
    raise exception 'phone must be 10 digits';
  end if;

  -- Empty message and no message are the same thing; store one of them.
  v_message := nullif(btrim(coalesce(p_message, '')), '');

  -- --------------------------------------------------------------------------
  -- Resolve the event from the invite code.
  --
  -- The code is the argument, never the event id: it is what the guest was
  -- actually given, and it means a caller cannot aim this function at an event
  -- whose link they were never sent.
  -- --------------------------------------------------------------------------
  select id into v_event_id
  from public.events
  where invite_code = p_invite_code;

  if v_event_id is null then
    raise exception 'unknown invite code';
  end if;

  -- --------------------------------------------------------------------------
  -- Insert, or update the one row this phone already owns on this event.
  --
  -- checked_in and checked_in_at are absent from the DO UPDATE list on purpose.
  -- Arrival is the host's fact, recorded at the door; a guest editing their
  -- reply from the car park must not be able to reset it — nor to set it.
  -- --------------------------------------------------------------------------
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
    responded_at       = excluded.responded_at;
end;
$$;

-- Returns void, so there is nothing here for a guest to read back. Granting
-- execute is not granting any view of public.guests.
revoke all on function public.submit_reply(text, text, text, text, integer, text) from public;
grant execute on function public.submit_reply(text, text, text, text, integer, text) to anon, authenticated;
