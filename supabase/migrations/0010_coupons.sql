-- ============================================================================
-- Lifafa — 0010: coupons and affiliate codes
--
-- Run after 0009_payments.sql. Paste it into the Supabase SQL editor once; it
-- is safe to run again.
--
-- WHAT THIS IS FOR
--
-- Two things that happen to be the same table. A DISCOUNT code takes money off
-- the price of an invitation. An AFFILIATE code does that too, and additionally
-- records who sent the buyer, so a commission can be worked out later. They
-- share every field that matters — a code, a discount, a usage limit, an expiry
-- — and differ only in `owner_name` and `commission_per_sale`, which are the
-- affiliate's half. Two tables would mean two lookups on the checkout path and
-- two answers to "is this code real".
--
-- MONEY IS AN INTEGER OF PAISE, exactly as in 0009. `discount_value` is the one
-- exception and only when `discount_type = 'percent'`, where it is a whole
-- number of percent. `commission_per_sale` is paise.
--
-- ============================================================================
-- THE SECURITY SHAPE, WHICH IS THE POINT OF THIS FILE
--
-- RLS is enabled and FORCEd with NOT ONE POLICY. In Postgres, RLS denies what
-- no policy permits, so this table answers "no rows" to `anon` and
-- `authenticated` for every statement — select, insert, update and delete
-- alike. A browser holding the public anon key and a valid host session cannot
-- read a coupon, cannot list the codes that exist, and cannot invent one.
--
-- That is stricter than public.payments, which at least lets a host read their
-- own rows (0009). Nothing in the browser has any business knowing what codes
-- exist: a readable coupons table is a page where anyone can help themselves to
-- the largest discount on offer, and an enumerable one is worse, because an
-- affiliate code that leaks is revenue paid to somebody who sent no one.
--
-- So every read and write goes through lib/supabase/admin.ts (service_role,
-- which bypasses RLS) from server code that has already established who is
-- asking. The REVOKE below is the second lock, for the same reason 0009 has
-- one: it stops a future migration adding a permissive policy by habit and
-- quietly opening the table. 0008 is the cautionary tale.
-- ============================================================================

begin;

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),

  -- UPPERCASE, AND THE DATABASE IS WHAT GUARANTEES IT. The application
  -- normalises a typed code before every lookup, but "the application
  -- normalises it" is a promise made in one language about code written in
  -- another. With this check, a row holding 'save50' cannot exist, so a lookup
  -- on upper(input) cannot miss a row that differs only in case — which would
  -- present to a host as a perfectly good code being refused.
  --
  -- The length floor is not cosmetic either: a one-character code is one an
  -- attacker guesses on their first try.
  code text not null unique
       check (code = upper(code) and code ~ '^[A-Z0-9-]{4,32}$'),

  -- 'discount' is a plain price reduction. 'affiliate' is a price reduction
  -- that also owes somebody a commission. A check constraint rather than an
  -- enum, on the same grounds as payments.status in 0009: adding a value to an
  -- enum is a migration and a lock; adding one here is an edit to this line.
  type text not null check (type in ('discount', 'affiliate')),

  discount_type text not null check (discount_type in ('percent', 'flat')),

  -- Percent when discount_type is 'percent', paise when it is 'flat'.
  --
  -- ONE COLUMN FOR TWO UNITS is a compromise, and the check below is what keeps
  -- it honest: a percent over 100 is not a discount, it is the shop paying the
  -- customer, and without this line a typo of 1000 for 100 would do exactly
  -- that. There is no equivalent ceiling for 'flat' because the floor lives in
  -- the application — see the clamp in lib/coupons/quote.ts, which never lets a
  -- final amount fall below what Razorpay will accept.
  discount_value integer not null
       check (
         discount_value > 0
         and (discount_type <> 'percent' or discount_value <= 100)
       ),

  -- Null means unlimited. Deliberately nullable rather than a sentinel like 0
  -- or -1: "no limit" is the absence of a limit, and a sentinel is a number
  -- some future query will compare against by accident.
  max_uses integer check (max_uses is null or max_uses > 0),

  -- Incremented ONLY by redeem_coupon() below, and only from the webhook, when
  -- money has actually been captured. Never when a code is applied in the form,
  -- never when an order is created — both of those are intentions, and an
  -- intention that consumes a limited code is a code exhausted by window
  -- shoppers.
  used_count integer not null default 0 check (used_count >= 0),

  -- Null means it never expires.
  expires_at timestamptz,

  -- The off switch. There is no delete in the admin UI, deliberately: a
  -- deactivated code keeps its history, and the payments rows that reference it
  -- by text keep meaning something.
  is_active boolean not null default true,

  -- The affiliate's half. Both null for a plain discount code.
  owner_name text,

  -- Paise owed to the affiliate per captured sale. Not a percentage of the
  -- sale: a flat figure is what an affiliate agreement usually says, and it is
  -- the one that survives the price changing.
  commission_per_sale integer
       check (commission_per_sale is null or commission_per_sale >= 0),

  created_at timestamptz not null default now(),

  -- An affiliate code with no owner is a commission nobody can be paid. Checked
  -- here rather than left to the form, because the form is one caller and this
  -- is the invariant.
  constraint coupons_affiliate_has_owner check (
    type <> 'affiliate'
    or (owner_name is not null and length(btrim(owner_name)) > 0)
  )
);

-- The checkout looks a coupon up by code, which the unique constraint already
-- indexes. This is the other question the admin list asks: "what is still
-- live", newest first.
create index if not exists coupons_active_created_idx
  on public.coupons (is_active, created_at desc);


-- ============================================================================
-- public.payments gains the two columns that record what a coupon actually did
--
-- ON THE PAYMENT ROW, NOT ONLY ON THE COUPON. The coupon's used_count says how
-- many times a code worked; these say what it did to one specific order, at the
-- moment that order was created. That matters because a coupon can be edited or
-- deactivated afterwards and the history must not move with it — an affiliate's
-- commission is worked out from the payments that carry their code, and a
-- report that changed every time somebody adjusted a discount would be useless.
--
-- `coupon_code` is TEXT and not a foreign key, and that is deliberate. A key
-- would tie a payment's fate to the coupon row continuing to exist, and the
-- thing being recorded here is historical fact: this order was placed with this
-- code, for this much off. Nothing should be able to rewrite that, including a
-- cascade.
-- ============================================================================

alter table public.payments
  add column if not exists coupon_code text;

alter table public.payments
  add column if not exists discount_amount integer not null default 0;

-- Added separately and guarded, because ADD CONSTRAINT has no IF NOT EXISTS and
-- this file has to be safe to run twice.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_discount_amount_non_negative'
  ) then
    alter table public.payments
      add constraint payments_discount_amount_non_negative
      check (discount_amount >= 0);
  end if;
end;
$$;

-- The affiliate report's question: "every payment carrying this code". Partial,
-- because the overwhelming majority of rows have no coupon at all and there is
-- no reason to index a column full of nulls.
create index if not exists payments_coupon_code_idx
  on public.payments (coupon_code)
  where coupon_code is not null;


-- ============================================================================
-- redeem_coupon(): the atomic increment, and the only thing that may count a use
--
-- WHY A FUNCTION AND NOT AN UPDATE FROM THE APPLICATION.
--
-- PostgREST cannot express `used_count = used_count + 1`. It sends values, not
-- expressions, so the application would have to read the count, add one and
-- write it back — and two captures arriving in the same second would both read
-- the same number, both write the same number, and one use would vanish. Worse,
-- with max_uses the check and the write would sit either side of a gap wide
-- enough for both to pass.
--
-- The statement below has no gap. The guard is in the WHERE clause of the
-- UPDATE itself, so Postgres evaluates it against the row it has locked: under
-- READ COMMITTED the second of two concurrent updates blocks, then re-checks
-- `used_count < max_uses` against the value the first one just wrote, and finds
-- no row to update. Exactly one of them wins.
--
-- RETURNS whether a use was actually counted, so the caller can log an overrun
-- rather than guess. See lib/db/applyPayment.ts on why a `false` here never
-- refuses a payment: the money has already moved.
-- ============================================================================

create or replace function public.redeem_coupon(p_code text)
returns boolean
language plpgsql
security definer
-- Not optional on a definer function: without a pinned search_path, a caller
-- able to create objects could shadow public.coupons with their own table and
-- have this run against it with the owner's privileges.
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  if p_code is null or btrim(p_code) = '' then
    return false;
  end if;

  update public.coupons
     set used_count = used_count + 1
   where code = upper(btrim(p_code))
     and is_active
     and (expires_at is null or expires_at > now())
     and (max_uses is null or used_count < max_uses);

  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

-- Nobody but the server. A coupon whose use count anyone could advance is a
-- coupon anyone can exhaust, and this function is reachable over PostgREST the
-- moment it is granted to a browser role.
revoke all on function public.redeem_coupon(text) from public, anon, authenticated;
grant execute on function public.redeem_coupon(text) to service_role;


-- ============================================================================
-- ROW LEVEL SECURITY — enabled, forced, and with no policy at all.
--
-- See the long note at the top. This is not an oversight and a future migration
-- should not "fix" it by adding a read policy: there is no browser code that
-- needs to see this table, and the checkout works by asking the server whether
-- one specific typed code is good, never by being handed the list.
-- ============================================================================

alter table public.coupons enable row level security;
alter table public.coupons force row level security;

revoke all on public.coupons from anon, authenticated;

commit;
