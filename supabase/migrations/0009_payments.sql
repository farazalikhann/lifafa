-- ============================================================================
-- Lifafa — 0009: payments
--
-- Run after 0008_payment_columns_guard.sql. Paste it into the Supabase SQL
-- editor once; it is safe to run again.
--
-- WHAT THIS IS FOR
--
-- 0008 closed the door on is_paid: a trigger resets that column for anyone
-- writing as `anon` or `authenticated`, so only `service_role` — the webhook —
-- can say an invitation is paid for. This table is the evidence behind that
-- word. Until now `events.is_paid` was a boolean with nothing behind it and
-- `events.payment_id` was a text column nobody ever wrote; a row here records
-- which order was placed, for how much, and which Razorpay payment settled it.
--
-- WHY A SEPARATE TABLE AND NOT MORE COLUMNS ON events
--
-- An order has a life of its own. A host can start a checkout, dismiss it, and
-- start another: that is two orders against one invitation, at most one of
-- which is ever paid. Columns on events could hold one order and would quietly
-- lose the first the moment a second began — along with any record that the
-- host had tried. `lib/pricing.ts` also says revenue is currently *derived*
-- from "paid invitations times the price", which stops being true the day the
-- price changes; `amount` here is what was actually charged, per order.
--
-- THE MONEY IS AN INTEGER OF PAISE, never rupees and never a float. ₹999 is
-- 99900. Razorpay's API speaks paise, so storing anything else would mean two
-- conversions and a rounding argument; and a float cannot hold money at all.
-- ============================================================================

begin;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),

  -- on delete cascade, matching guests: deleting an invitation takes its
  -- payment attempts with it. The alternative — orphaned rows pointing at
  -- nothing — would survive only to confuse a future revenue query.
  event_id uuid not null references public.events (id) on delete cascade,

  -- The order we asked Razorpay to create. Unique because it is what the
  -- webhook looks a row up BY: a second row sharing an order id would make
  -- "which payment settled this order" ambiguous at exactly the wrong moment.
  razorpay_order_id text not null unique,

  -- The payment that settled the order. Null until one does.
  --
  -- UNIQUE, AND THAT IS THE IDEMPOTENCY KEY AS FAR AS THE DATABASE IS
  -- CONCERNED. Postgres allows many NULLs under a unique constraint, so every
  -- unsettled order coexists happily; the moment two rows would claim the same
  -- Razorpay payment, the insert or update is refused rather than silently
  -- double-counted.
  razorpay_payment_id text unique,

  -- Paise. See the note above.
  amount integer not null check (amount > 0),

  -- created → paid, or created → failed. A check constraint rather than an
  -- enum: adding a value to an enum is a migration and a lock, adding one here
  -- is an edit to this line.
  status text not null default 'created'
         check (status in ('created', 'paid', 'failed')),

  created_at timestamptz not null default now(),

  -- Set by the webhook, at the same moment status becomes 'paid'. Null
  -- otherwise, so "paid with no paid_at" is a state that cannot be reached by
  -- the write path in lib/db/payments.ts.
  paid_at timestamptz
);

-- The dashboard asks "what has happened to this event's payments", and the
-- webhook asks by order id (already indexed by its unique constraint). This is
-- the other question.
create index if not exists payments_event_id_idx
  on public.payments (event_id);


-- ============================================================================
-- ROW LEVEL SECURITY
--
-- Enabled and FORCEd, on the same terms as events and guests in 0001: with RLS
-- on and no policy matching, the answer is "no rows", so this table fails
-- closed and the single policy below is the one exception to that.
-- ============================================================================

alter table public.payments enable row level security;
alter table public.payments force row level security;

-- ----------------------------------------------------------------------------
-- SELECT: a host reads the payments for their own invitations, and no others.
--
-- The subquery reads public.events, which has RLS of its own, and runs as the
-- SAME role as the outer query. So events_select_own (0001) applies inside it:
-- a host can only find their own event there, and therefore only their own
-- payment rows here. The ownership rule is written once, in 0001, and this
-- policy inherits it rather than restating it — a restatement is a thing that
-- can drift.
-- ----------------------------------------------------------------------------
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.events e
      where e.id = payments.event_id
    )
  );

-- ----------------------------------------------------------------------------
-- THERE ARE NO INSERT, UPDATE OR DELETE POLICIES, and that is the design.
--
-- RLS denies what no policy permits, so a browser holding the anon key and a
-- host's session token cannot create a payment row, change one's status, or
-- delete the evidence — whatever it sends, and whoever it says it is. Every
-- write happens server side through lib/supabase/admin.ts, whose service_role
-- key bypasses RLS entirely; the ownership check happens in the server action
-- BEFORE that client is ever reached.
--
-- The REVOKE below is belt and braces against a future migration adding a
-- permissive policy by habit. 0008 is the cautionary tale: table-wide grants
-- plus a row policy that says nothing about columns was a hole big enough to
-- drive a free invitation through. SELECT is deliberately left granted —
-- PostgREST needs the privilege as well as the policy for the read above.
-- ----------------------------------------------------------------------------
revoke insert, update, delete on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

commit;
