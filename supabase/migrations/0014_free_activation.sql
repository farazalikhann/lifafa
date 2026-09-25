-- ============================================================================
-- Lifafa — 0014: free activation — complimentary invitations and 100% coupons
--
-- Run after 0013_event_lock.sql. Paste it into the Supabase SQL editor once; it
-- is safe to run again.
--
-- WHAT THIS IS FOR
--
-- Razorpay cannot create a ₹0 order, so until now the only way an invitation
-- became paid was a captured payment, and a coupon could take at most ₹998 off
-- (lib/coupons/quote.ts clamped the rest). This adds the two ways an invitation
-- becomes paid with no money moving:
--
--   COMPLIMENTARY. An admin activates an event for free, with a reason
--   ("Friend", "Testing", "Influencer"). grant_complimentary() below.
--
--   A FREE COUPON. A code that takes the whole price off. The host applies it
--   and the invitation is activated without Razorpay. redeem_free_coupon().
--
-- Both leave a payments row with amount 0 and a `method` that says which, so
-- the accounting shows plainly that nothing was received. Both mark the event
-- paid the way the webhook does: as the server, so 0008's trigger lets is_paid
-- through and 0013's trigger records original_end_date at that moment.
--
-- WHY FUNCTIONS. Each of these is several writes — the payment row, the event,
-- and for a coupon its use count — that must all happen or none. PostgREST has
-- no transaction spanning two requests; a function body is one transaction.
-- For a coupon it is also what stops one code being used twice at once: the
-- coupon row is locked (FOR UPDATE) before its use count is read, so a second
-- redemption waits, then sees the first one's count.
--
-- Neither function is SECURITY DEFINER. They run as the caller, and only the
-- server's service role may call them — the same role the webhook writes as.
-- Were one ever granted to a browser role by mistake, 0008's trigger would put
-- is_paid back and 0009's RLS would refuse the payment row.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- payments: how an invitation was paid for
--
--   method      'razorpay' (every row until now), 'complimentary' or 'coupon'.
--   reason      Why an admin gave it away. Complimentary rows only.
--   granted_by  The admin username that did it. Complimentary rows only.
--
-- A free row has no Razorpay order, so razorpay_order_id becomes nullable. It
-- stays UNIQUE, which in Postgres allows any number of NULLs, and the webhook
-- still matches only on a real order id, so it can never find a free row.
--
-- discount_amount on a free row is the full list price. amount (0) plus
-- discount_amount is the list price on every paid row, so the admin overview's
-- "list price times paid invitations" minus "discount given" still equals "net
-- received".
-- ----------------------------------------------------------------------------
alter table public.payments
  add column if not exists method     text not null default 'razorpay',
  add column if not exists reason     text,
  add column if not exists granted_by text;

alter table public.payments
  alter column razorpay_order_id drop not null;

-- 0009's `check (amount > 0)`. A free row is 0; the shape check below keeps
-- every Razorpay row above 0.
alter table public.payments drop constraint if exists payments_amount_check;

alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments
  add constraint payments_method_check
  check (method in ('razorpay', 'complimentary', 'coupon'));

alter table public.payments drop constraint if exists payments_method_shape;
alter table public.payments
  add constraint payments_method_shape check (
    case method
      when 'razorpay' then
        razorpay_order_id is not null
        and amount > 0
      when 'complimentary' then
        razorpay_order_id is null
        and amount = 0
        and status = 'paid'
        and reason is not null and length(btrim(reason)) between 1 and 80
        and granted_by is not null and length(btrim(granted_by)) > 0
      when 'coupon' then
        razorpay_order_id is null
        and amount = 0
        and status = 'paid'
        and coupon_code is not null
      else false
    end
  );

-- ----------------------------------------------------------------------------
-- What a host may read of their own payment rows
--
-- 0009 lets a host select their own rows (nothing in the app does, but the REST
-- API allows it). reason and granted_by are the admin's notes — granted_by is
-- the admin's login name — and are not the host's to read. RLS chooses rows,
-- not columns, so the table-wide SELECT is replaced with a column list. A
-- column added later is hidden from hosts until it is added here.
-- ----------------------------------------------------------------------------
revoke select on public.payments from anon, authenticated;
grant select (
  id, event_id, razorpay_order_id, razorpay_payment_id, amount, status,
  created_at, paid_at, coupon_code, discount_amount, method
) on public.payments to authenticated;


-- ----------------------------------------------------------------------------
-- coupons: a 100% code must have a usage limit
--
-- An unlimited free code is an unlimited supply of free invitations to anyone
-- it is passed to. The admin form and createCoupon refuse one; this is the
-- database refusing it too. A FLAT code that covers the whole price cannot be
-- caught here, because the price lives in the app (lib/pricing.ts), so
-- redeem_free_coupon() refuses any free redemption of a code with no limit.
-- ----------------------------------------------------------------------------
alter table public.coupons drop constraint if exists coupons_free_needs_limit;
alter table public.coupons
  add constraint coupons_free_needs_limit check (
    discount_type <> 'percent'
    or discount_value < 100
    or max_uses is not null
  );


-- ----------------------------------------------------------------------------
-- grant_complimentary(): an admin activates an invitation for free
--
-- Returns 'ok', or why not: 'not_found', 'already_paid', 'no_date',
-- 'bad_reason'. The admin session is checked by the server action before this
-- is called; p_granted_by is that session's username.
--
-- 'no_date' for the same reason createPaymentOrder refuses one: the lock after
-- the event is measured from the end date an invitation is paid with, and one
-- paid with no date would never lock.
-- ----------------------------------------------------------------------------
create or replace function public.grant_complimentary(
  p_event_id   uuid,
  p_reason     text,
  p_granted_by text,
  p_list_price integer
)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reason     text := btrim(coalesce(p_reason, ''));
  v_is_paid    boolean;
  v_draft      jsonb;
  v_payment_id uuid;
begin
  if length(v_reason) not between 1 and 80 then
    return 'bad_reason';
  end if;

  if p_granted_by is null or length(btrim(p_granted_by)) = 0 then
    raise exception 'granted_by is required';
  end if;

  if p_list_price is null or p_list_price <= 0 then
    raise exception 'invalid list price';
  end if;

  -- Locked, so a payment captured in the same moment waits, then finds the
  -- invitation already paid.
  select is_paid, event_draft into v_is_paid, v_draft
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_is_paid then
    return 'already_paid';
  end if;

  if public.event_end_date(v_draft) is null then
    return 'no_date';
  end if;

  insert into public.payments (
    event_id, method, amount, discount_amount, status, paid_at, reason, granted_by
  )
  values (
    p_event_id, 'complimentary', 0, p_list_price, 'paid', now(), v_reason, btrim(p_granted_by)
  )
  returning id into v_payment_id;

  -- As the webhook does. Run as the service role, so 0008's trigger lets
  -- is_paid through and 0013's records original_end_date.
  update public.events
  set is_paid = true,
      payment_id = v_payment_id::text
  where id = p_event_id;

  return 'ok';
end;
$$;

revoke all on function public.grant_complimentary(uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.grant_complimentary(uuid, text, text, integer)
  to service_role;


-- ----------------------------------------------------------------------------
-- redeem_free_coupon(): a host activates an invitation with a 100% code
--
-- Returns 'ok', or why not: 'unknown', 'inactive', 'expired', 'no_limit',
-- 'exhausted', 'not_free', 'not_found', 'already_paid', 'no_date'. Nothing is
-- written unless it returns 'ok'. The server action has checked that the event
-- is the signed-in host's before calling.
--
-- The discount is worked out here from the coupon row and the list price, the
-- same arithmetic as lib/coupons/quote.ts (percent rounded down), so a code
-- that does not cover the whole price cannot be redeemed this way whatever the
-- caller believes.
--
-- The use is counted here, in the same transaction as the activation. A paid
-- coupon's use is counted by redeem_coupon() when the money arrives (0010);
-- a free code has no money to wait for.
-- ----------------------------------------------------------------------------
create or replace function public.redeem_free_coupon(
  p_event_id   uuid,
  p_code       text,
  p_list_price integer
)
returns text
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_code       text := upper(btrim(coalesce(p_code, '')));
  v_coupon     public.coupons%rowtype;
  v_discount   integer;
  v_is_paid    boolean;
  v_draft      jsonb;
  v_payment_id uuid;
begin
  if p_list_price is null or p_list_price <= 0 then
    raise exception 'invalid list price';
  end if;

  if v_code = '' then
    return 'unknown';
  end if;

  -- THE LOCK. A second redemption of this code waits here until the first
  -- commits, then reads the use count the first one wrote.
  select * into v_coupon
  from public.coupons
  where code = v_code
  for update;

  if not found then
    return 'unknown';
  end if;

  if not v_coupon.is_active then
    return 'inactive';
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
    return 'expired';
  end if;

  if v_coupon.max_uses is null then
    return 'no_limit';
  end if;

  if v_coupon.used_count >= v_coupon.max_uses then
    return 'exhausted';
  end if;

  v_discount := case v_coupon.discount_type
    when 'percent' then floor(p_list_price::numeric * v_coupon.discount_value / 100)::integer
    else v_coupon.discount_value
  end;

  if v_discount < p_list_price then
    return 'not_free';
  end if;

  select is_paid, event_draft into v_is_paid, v_draft
  from public.events
  where id = p_event_id
  for update;

  if not found then
    return 'not_found';
  end if;

  if v_is_paid then
    return 'already_paid';
  end if;

  if public.event_end_date(v_draft) is null then
    return 'no_date';
  end if;

  insert into public.payments (
    event_id, method, amount, discount_amount, status, paid_at, coupon_code
  )
  values (
    p_event_id, 'coupon', 0, p_list_price, 'paid', now(), v_coupon.code
  )
  returning id into v_payment_id;

  update public.events
  set is_paid = true,
      payment_id = v_payment_id::text
  where id = p_event_id;

  update public.coupons
  set used_count = used_count + 1
  where id = v_coupon.id;

  return 'ok';
end;
$$;

revoke all on function public.redeem_free_coupon(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.redeem_free_coupon(uuid, text, integer)
  to service_role;


-- ----------------------------------------------------------------------------
-- admin_find_events(): the admin's search by invite code, event id or email
--
-- The host's email is in auth.users, which PostgREST does not expose, so this
-- one IS security definer: it reads auth.users as its owner. Only the service
-- role may call it, from the admin page, behind the admin session.
-- ----------------------------------------------------------------------------
create or replace function public.admin_find_events(p_query text)
returns table (
  id          uuid,
  invite_code text,
  is_paid     boolean,
  created_at  timestamptz,
  title       text,
  party_one   text,
  party_two   text,
  host_names  text,
  host_email  text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    e.id,
    e.invite_code,
    e.is_paid,
    e.created_at,
    e.event_draft ->> 'eventTitle',
    e.event_draft ->> 'partyOneName',
    e.event_draft ->> 'partyTwoName',
    e.event_draft ->> 'hostNames',
    u.email::text
  from public.events e
  left join auth.users u on u.id = e.host_id
  where length(btrim(coalesce(p_query, ''))) > 0
    and (
      e.invite_code = btrim(p_query)
      or e.id::text = lower(btrim(p_query))
      or lower(u.email) = lower(btrim(p_query))
    )
  order by e.created_at desc
  limit 25;
$$;

revoke all on function public.admin_find_events(text) from public, anon, authenticated;
grant execute on function public.admin_find_events(text) to service_role;

commit;
