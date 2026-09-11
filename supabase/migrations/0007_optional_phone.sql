-- ============================================================================
-- 0007 — a phone number only where it earns one
--
-- WHAT CHANGES
--
-- guests.phone becomes nullable, and submit_reply() requires ten digits only
-- from a guest who is coming. A "no" or a "maybe" may now arrive without one.
--
-- WHY IT IS SPLIT THAT WAY, rather than optional for everybody
--
-- The phone number is not a contact detail here, it is the key. It is what
-- (event_id, phone) matches on, so it is what lets a guest change their reply
-- later, and what stops the same guest being counted twice in the headcount
-- this whole product exists to get right. A guest who is coming is exactly the
-- guest those two things matter for: they are in the caterer's number, and they
-- are the one who comes back a week later to add a companion.
--
-- A guest who is not coming is in neither. Nothing is catered for them, nobody
-- scans them at the door, and "declined" is not a figure anyone spends money
-- against. Asking them for a number to say no is a toll on the least willing
-- person in the list, and the commonest reason a reply never arrives at all.
--
-- WHAT THIS COSTS, stated rather than hidden
--
-- A null phone cannot be a conflict target — SQL considers two nulls distinct —
-- so a no-phone reply always inserts. Two consequences, both confined to
-- guests who are not coming:
--
--   1. A guest who declines twice without a number leaves two declined rows.
--      The host sees both and can delete one. Nothing they cater for moves.
--   2. A guest who declined without a number and later accepts with one leaves
--      the old declined row behind beside the new accepted one. Again the
--      attending count is right, and the stale row is visible and deletable.
--
-- Not worked around by matching on the name instead: two real guests called
-- Priya who both said maybe would be silently merged into one, and losing a
-- person is worse than showing a duplicate the host can see.
--
-- EXISTING ROWS are untouched. Every reply already taken has a number, and
-- dropping NOT NULL does not alter one.
-- ============================================================================

begin;


-- ----------------------------------------------------------------------------
-- The column
--
-- The unique constraint stays exactly as it is. (event_id, phone) still holds
-- a guest who gave a number to one row, which is the guarantee that matters;
-- rows with no number simply fall outside it, which is what nulls do in a
-- unique index and is the behaviour this relies on rather than works around.
-- ----------------------------------------------------------------------------
alter table public.guests
  alter column phone drop not null;


-- ----------------------------------------------------------------------------
-- The write path
--
-- Replaced whole, because a function cannot be patched. This is 0006's
-- submit_reply with one rule changed: the ten digit requirement now applies to
-- an acceptance and not to every reply. Everything else — the definer rights,
-- the pinned search_path, the rsvp check, the party size clamp, the token that
-- goes back only with a yes — is unchanged and is documented in 0002 and 0006.
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

  if p_rsvp = 'accepted' then
    -- The guests who are actually coming are the ones the key has to hold.
    if length(v_phone) <> 10 then
      raise exception 'phone must be 10 digits for an acceptance';
    end if;
  elsif length(v_phone) = 0 then
    -- Nothing given, and nothing required. Null rather than '', so the unique
    -- constraint treats these rows as unrelated instead of colliding every one
    -- of them onto a single empty string per event.
    v_phone := null;
  elsif length(v_phone) <> 10 then
    -- Given, but not a number anyone could dial. Half a phone number is a
    -- mistake worth reporting whichever way the guest replied.
    raise exception 'phone must be 10 digits';
  end if;

  v_message := nullif(btrim(coalesce(p_message, '')), '');

  select id into v_event_id
  from public.events
  where invite_code = p_invite_code;

  if v_event_id is null then
    raise exception 'unknown invite code';
  end if;

  -- With a number this is the upsert it always was. Without one the conflict
  -- target cannot match — see the note at the top — and the row inserts.
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


commit;
