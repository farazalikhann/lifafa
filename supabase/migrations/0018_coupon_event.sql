-- ============================================================================
-- Lifafa — 0018: a coupon for one invitation
--
-- Run after 0017_help_messages.sql. Paste it into the Supabase SQL editor
-- once; it is safe to run again.
--
-- coupons.event_id: the one invitation a code works on, or null for a code
-- that works on any. Null on every code that exists, so each goes on working
-- as it did. The application refuses a code on any other invitation ("This
-- code is not valid for this card."; lib/coupons/usable.ts), in the price
-- preview and again when the order is made, and redeem_free_coupon() below
-- refuses it for a free activation.
--
-- NO FOREIGN KEY, ON PURPOSE. If the invitation is deleted, "on delete set
-- null" would turn a code for one card into a code for every card, and
-- "restrict" would stop a host deleting their own draft. A dangling id matches
-- no invitation, so the code simply works nowhere, which is the safe end.
-- ============================================================================

begin;

alter table public.coupons
  add column if not exists event_id uuid;

-- ----------------------------------------------------------------------------
-- redeem_free_coupon(): as in 0014, with one more refusal, 'wrong_event', for
-- a code made for another invitation. Everything else is 0014's, unchanged.
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

  -- A code made for one invitation works on that one alone (event_id, above).
  if v_coupon.event_id is not null and v_coupon.event_id <> p_event_id then
    return 'wrong_event';
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
-- One code, locked now: SHAILESH300, for the invitation it was made for.
-- ----------------------------------------------------------------------------

update public.coupons
set event_id = '6b5be479-97a4-42f0-8bf9-3a890e89b5c9'
where code = 'SHAILESH300';

commit;
