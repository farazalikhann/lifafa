import { createAdminClient } from "@/lib/supabase/admin";
import { OCCASIONS } from "@/lib/occasions";
import {
  EVENTS_PAGE_SIZE,
  OVERVIEW_EVENT_LIMIT,
  type EventsQuery,
} from "@/lib/admin/eventsQuery";
import { INVITATION_PRICE_INR } from "@/lib/pricing";
import { eventEndDate, hasEnded } from "@/lib/eventLock";
import { toStoredEvent } from "@/types/database";
import {
  dbFailure,
  dbSuccess,
  postgresError,
  type DbResult,
} from "@/lib/db/result";
import type { PaymentMethod } from "@/types/database";
import type { OccasionId } from "@/types/occasion";
import type { RsvpStatus } from "@/types/guest";

/**
 * Every read the admin dashboard performs.
 *
 * WHY THE SERVICE CLIENT AND NOT THE HOST CLIENT. Every other read in this app
 * goes through lib/supabase/server.ts, carrying a host's session so that Row
 * Level Security scopes it to their own rows. That is exactly what the owner's
 * dashboard cannot use: its whole job is to count across every host at once,
 * and events_select_own would show it one account's events — the owner's own,
 * or nobody's. So it goes through lib/supabase/admin.ts, which bypasses RLS.
 *
 * WHICH MAKES THIS FILE A BOUNDARY. Nothing here is exported to a client
 * component, nothing here takes a filter from the browser, and every caller is
 * a server component that has already been past requireAdminSession(). The
 * service key can read every host's guest list; what keeps it from doing so on
 * anyone's behalf is that these functions are only ever called from behind the
 * gate.
 *
 * COUNTS RATHER THAN ROWS, wherever a count is what is wanted. `head: true`
 * with an exact count asks PostgREST for the Content-Range header and no body
 * at all, so a tally of ten thousand events costs one small response instead of
 * ten thousand rows of jsonb.
 */

/** India has no daylight saving, so a fixed offset is exact rather than a guess. */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** One day, in milliseconds. Named because it appears in date arithmetic below. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** PostgREST's default page size. Anything paged has to step in these. */
const PAGE_SIZE = 1000;

/**
 * How many pages of guests the dashboard will walk before giving up.
 *
 * A ceiling rather than a limit anybody should reach: two hundred pages is two
 * hundred thousand replies. It is here so that a mistake in the paging below
 * cannot become an unbounded loop against Supabase.
 */
const MAX_PAGES = 200;

/** How many events the recent table shows. */
const RECENT_LIMIT = 50;

/** The moment "today" began in Indian Standard Time, as an ISO timestamp. */
function startOfTodayIst(): string {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);

  const midnightIst = Date.UTC(
    nowIst.getUTCFullYear(),
    nowIst.getUTCMonth(),
    nowIst.getUTCDate(),
  );

  return new Date(midnightIst - IST_OFFSET_MS).toISOString();
}

/** `days` times twenty-four hours ago, as an ISO timestamp. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/* ─────────────────────────── Shapes ─────────────────────────── */

/**
 * One row of the recent-events table.
 *
 * Plain values only. This crosses into a client component so the table can be
 * sorted and filtered without a round trip, which means everything on it is
 * serialised — and means nothing that is not already safe to show may be added
 * to it. No host id, no phone number, no invite code.
 */
export interface AdminEventSummary {
  id: string;
  /** The event's own title, or the best name available when it has none. */
  title: string;
  occasionId: string;
  occasionLabel: string;
  /** ISO timestamp. Formatted where it is displayed. */
  createdAt: string;
  isPaid: boolean;
  guestCount: number;
  acceptedCount: number;
}

export interface AdminOverview {
  events: {
    total: number;
    today: number;
    last7Days: number;
    last30Days: number;
    paid: number;
    /**
     * Paid invitations times the LIST price. Gross, before any discount.
     *
     * Kept because it answers "what would these have been worth at full price",
     * which is the question a coupon's cost is measured against. It is NOT what
     * was received — see netReceivedInr, which is summed from the payments
     * themselves and is the figure to trust once codes are in use.
     */
    revenueInr: number;
    /**
     * Paise taken off, summed across every captured payment, shown in rupees.
     *
     * From payments.discount_amount, which records what one order's coupon
     * actually did at the moment it was placed — so this stays correct even
     * after a coupon is deactivated or the list price changes.
     */
    discountGivenInr: number;
    /**
     * What was actually received: payments.amount summed over captured rows.
     *
     * NOT DERIVED FROM A COUNT, unlike revenueInr, and that is the point of
     * having both. The moment one discounted payment exists, a count times a
     * price overstates receipts; this reads what was charged.
     */
    netReceivedInr: number;
  };
  guests: {
    total: number;
    accepted: number;
    declined: number;
    maybe: number;
    pending: number;
    checkedIn: number;
  };
  /** Every occasion the registry knows, in registry order, plus an "Unknown" bucket. */
  byOccasion: readonly { id: string; label: string; count: number }[];
  /** Events created per day over the last fourteen IST days, oldest first. */
  dailyEvents: readonly DailyCount[];
  recentEvents: readonly AdminEventSummary[];
}

/** One bar on the fourteen-day chart. */
export interface DailyCount {
  /** The day as an ISO timestamp at IST midnight, for formatting at the label. */
  date: string;
  count: number;
}

/* ─────────────────────────── Query helpers ─────────────────────────── */

type AdminClient = ReturnType<typeof createAdminClient>;

/** A head-only exact count over events, ready for filters to be chained on. */
function eventCountQuery(supabase: AdminClient) {
  return supabase.from("events").select("id", { count: "exact", head: true });
}

/** The same, over guests. */
function guestCountQuery(supabase: AdminClient) {
  return supabase.from("guests").select("id", { count: "exact", head: true });
}

/**
 * The number out of a count query, or a throw.
 *
 * Throws rather than returning a result, because getAdminOverview below wraps
 * the lot in one try and reports a single failure: a dashboard that rendered
 * eight numbers and a blank where the ninth should be would be worse than one
 * that says it could not load.
 */
async function countRows(
  query: PromiseLike<{
    count: number | null;
    error: { message: string } | null;
  }>,
): Promise<number> {
  const { count, error } = await query;

  if (error !== null) {
    throw error;
  }

  /* Null when PostgREST sends no range header; no rows is 0 either way. */
  return count ?? 0;
}

/**
 * Every row of a select, a page at a time.
 *
 * PostgREST caps a response at a thousand rows by default and says nothing
 * about having done so — the query simply answers with a thousand and the
 * caller quietly under-counts. That is the failure this exists to avoid: an
 * under-count on a dashboard is worse than an error, because nothing about it
 * looks wrong.
 */
async function fetchAllPages<Row>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: Row[] | null;
    error: { message: string } | null;
  }>,
): Promise<Row[]> {
  const rows: Row[] = [];

  for (let index = 0; index < MAX_PAGES; index += 1) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);

    if (error !== null) {
      throw error;
    }

    const batch = data ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return rows;
    }
  }

  console.error(
    `[admin] stopped paging after ${MAX_PAGES} pages (${rows.length} rows). The tallies drawn from this are short.`,
  );

  return rows;
}

const OCCASION_LABELS = new Map<string, string>(
  OCCASIONS.map((occasion) => [occasion.id, occasion.label]),
);

/**
 * The best name for an event in a list.
 *
 * The card itself has an elaborate answer to this — see CoverSection, which
 * weighs the pair of party names against the host line against the title. This
 * is the list view's much smaller version: the title the host gave it, then the
 * two people being celebrated, then whatever they wrote on the host line, then
 * an honest placeholder. Never blank, because a blank row in a table of fifty
 * is a row nobody can click with any confidence.
 */
function summaryTitle(row: {
  title: string | null;
  partyOne: string | null;
  partyTwo: string | null;
  hostNames: string | null;
}): string {
  const title = (row.title ?? "").trim();

  if (title.length > 0) {
    return title;
  }

  const partyOne = (row.partyOne ?? "").trim();
  const partyTwo = (row.partyTwo ?? "").trim();

  if (partyOne.length > 0 && partyTwo.length > 0) {
    return `${partyOne} & ${partyTwo}`;
  }

  const fallback = [partyOne, partyTwo, (row.hostNames ?? "").trim()].find(
    (value) => value.length > 0,
  );

  return fallback === undefined || fallback.length === 0 ? "Untitled" : fallback;
}

/* ─────────────────────────── The dashboard read ─────────────────────────── */

/**
 * Everything the dashboard shows, in one call.
 *
 * Returns a DbResult rather than throwing, for the reason lib/db/result.ts
 * gives at length: a query that rejects inside a server component takes the
 * whole render with it, and a page that says what went wrong is worth more
 * than Next's error screen.
 */
export async function getAdminOverview(): Promise<DbResult<AdminOverview>> {
  const supabase = createAdminClient();

  try {
    const todayStart = startOfTodayIst();
    const weekStart = daysAgo(7);
    const monthStart = daysAgo(30);

    /*
      Every count in flight at once. Each is a separate request because
      PostgREST offers no GROUP BY to lean on, and a dozen parallel head
      requests still cost about one round trip of waiting.
    */
    const [
      totalEvents,
      todayEvents,
      weekEvents,
      monthEvents,
      paidEvents,
      totalGuests,
      accepted,
      declined,
      maybe,
      pending,
      checkedIn,
    ] = await Promise.all([
      countRows(eventCountQuery(supabase)),
      countRows(eventCountQuery(supabase).gte("created_at", todayStart)),
      countRows(eventCountQuery(supabase).gte("created_at", weekStart)),
      countRows(eventCountQuery(supabase).gte("created_at", monthStart)),
      countRows(eventCountQuery(supabase).eq("is_paid", true)),
      countRows(guestCountQuery(supabase)),
      countRows(guestCountQuery(supabase).eq("rsvp", "accepted")),
      countRows(guestCountQuery(supabase).eq("rsvp", "declined")),
      countRows(guestCountQuery(supabase).eq("rsvp", "maybe")),
      countRows(guestCountQuery(supabase).eq("rsvp", "pending")),
      countRows(guestCountQuery(supabase).eq("checked_in", true)),
    ]);

    const [byOccasion, recentEvents, money, dailyEvents] = await Promise.all([
      countByOccasion(supabase, totalEvents),
      getRecentEvents(supabase),
      sumCapturedPayments(supabase),
      getDailyEvents(supabase),
    ]);

    return dbSuccess({
      events: {
        total: totalEvents,
        today: todayEvents,
        last7Days: weekEvents,
        last30Days: monthEvents,
        paid: paidEvents,
        revenueInr: paidEvents * INVITATION_PRICE_INR,
        /* Paise on the row, rupees on the tile. Rounded once, here. */
        discountGivenInr: Math.round(money.discountPaise / 100),
        netReceivedInr: Math.round(money.receivedPaise / 100),
      },
      guests: {
        total: totalGuests,
        accepted,
        declined,
        maybe,
        pending,
        checkedIn,
      },
      byOccasion,
      dailyEvents,
      recentEvents,
    });
  } catch (cause: unknown) {
    return dbFailure(
      "admin/getAdminOverview",
      cause,
      "Could not load the dashboard.",
    );
  }
}

/**
 * Events per occasion.
 *
 * One head count per occasion rather than one pass over every row, because the
 * occasion lives inside the card_config jsonb and PostgREST cannot group by it.
 * Eight small parallel requests beat dragging every card's whole configuration
 * across the wire to count one field out of it.
 *
 * The "Unknown" bucket is the difference rather than a ninth query: a row whose
 * card_config carries no occasionId, or one this build has never heard of,
 * matches none of the eight and would otherwise vanish out of a breakdown that
 * is meant to add up to the total.
 */
async function countByOccasion(
  supabase: AdminClient,
  totalEvents: number,
): Promise<AdminOverview["byOccasion"]> {
  const counted = await Promise.all(
    OCCASIONS.map(async (occasion) => ({
      id: occasion.id as string,
      label: occasion.label,
      count: await countRows(
        eventCountQuery(supabase).eq("card_config->>occasionId", occasion.id),
      ),
    })),
  );

  const accountedFor = counted.reduce((sum, row) => sum + row.count, 0);
  const unknown = totalEvents - accountedFor;

  return unknown > 0
    ? [...counted, { id: "unknown", label: "Unknown", count: unknown }]
    : counted;
}

/**
 * What was actually received, and what was given away, across captured payments.
 *
 * ROWS RATHER THAN A COUNT, which is the exception in this file and needs a
 * reason. Everything else here asks "how many", and PostgREST answers that with
 * a header and no body. This asks "how much", and PostgREST has no SUM: the
 * choices are to add an aggregate function to the schema or to read the two
 * integer columns and add them up here. Two integers per paid order is a small
 * read, and it keeps the arithmetic somewhere a person can see it.
 *
 * Paged, for the reason fetchAllPages exists: PostgREST stops at a thousand
 * rows without saying so, and a revenue figure that silently stops counting at
 * the thousandth payment is the worst kind of wrong — it looks fine.
 *
 * `status = 'paid'` is the whole filter. A payments row is written when an
 * order is created, so abandoned checkouts are in this table; counting their
 * amounts would report money that was never taken.
 */
async function sumCapturedPayments(
  supabase: AdminClient,
): Promise<{ receivedPaise: number; discountPaise: number }> {
  /*
    DROPS THE DISCOUNT COLUMN RATHER THAN FAILING WITHOUT IT.

    A deploy reaches production before somebody pastes 0010 into the SQL
    editor, and in that window `discount_amount` does not exist. Naming it in
    a select is not a partial failure — PostgREST refuses the whole request —
    so without this the entire dashboard would report "could not load" over a
    column that only one tile needs. The first read asks for both; a read that
    comes back complaining about the column asks again for the one that has
    always been there, and the discount reads as zero, which before the
    migration it genuinely is.
  */
  try {
    const rows = await fetchAllPages<{
      amount: number;
      discount_amount: number | null;
    }>((from, to) =>
      supabase
        .from("payments")
        .select("amount, discount_amount")
        .eq("status", "paid")
        /* A stable order, or two pages can hand back the same row twice. */
        .order("id", { ascending: true })
        .range(from, to),
    );

    return rows.reduce(
      (totals, row) => ({
        receivedPaise: totals.receivedPaise + row.amount,
        /* Null on a row written before 0010; no discount was given either way. */
        discountPaise: totals.discountPaise + (row.discount_amount ?? 0),
      }),
      { receivedPaise: 0, discountPaise: 0 },
    );
  } catch (cause: unknown) {
    const pg = postgresError(cause);

    if (
      pg === null ||
      (pg.code !== "42703" && pg.code !== "PGRST204") ||
      !pg.message.includes("discount_amount")
    ) {
      throw cause;
    }

    console.error(
      "[admin] payments.discount_amount does not exist. Apply supabase/migrations/0010_coupons.sql. Reporting no discounts given.",
    );

    const rows = await fetchAllPages<{ amount: number }>((from, to) =>
      supabase
        .from("payments")
        .select("amount")
        .eq("status", "paid")
        .order("id", { ascending: true })
        .range(from, to),
    );

    return {
      receivedPaise: rows.reduce((sum, row) => sum + row.amount, 0),
      discountPaise: 0,
    };
  }
}

/** How many days the overview's bar chart covers. */
const DAILY_WINDOW_DAYS = 14;

/**
 * Events created per IST day over the last fortnight, oldest first.
 *
 * ROWS, NOT FOURTEEN COUNTS. Fourteen head-count queries would each be a round
 * trip to learn one small number, and the alternative is one query returning a
 * single timestamp column for a fortnight of events — which for this product is
 * a handful of rows and for a much larger one is still only a fortnight's
 * worth. PostgREST has no GROUP BY, so the bucketing happens here either way.
 *
 * EVERY DAY IS PRESENT, including the ones with nothing in them. A chart that
 * skips empty days is a chart that silently redraws its own axis — three bars
 * in a row look like three consecutive days when they might be a fortnight
 * apart. The zeroes are the shape of the data.
 *
 * Bucketed by shifting each timestamp into IST and taking its date part, which
 * is the same arithmetic startOfTodayIst does, so the last bar and the "Today"
 * tile cannot disagree about where the day begins.
 */
async function getDailyEvents(
  supabase: AdminClient,
): Promise<readonly DailyCount[]> {
  /*
    The window starts at IST midnight DAILY_WINDOW_DAYS - 1 days ago, not
    fourteen times twenty-four hours ago. A rolling window would put a partial
    day at the far end of the chart and make the oldest bar shorter than it
    should be for reasons no reader could guess.
  */
  const todayMidnightIst = new Date(startOfTodayIst()).getTime();
  const windowStart = todayMidnightIst - (DAILY_WINDOW_DAYS - 1) * DAY_MS;

  const rows = await fetchAllPages<{ created_at: string }>((from, to) =>
    supabase
      .from("events")
      .select("created_at")
      .gte("created_at", new Date(windowStart).toISOString())
      /* A stable order, or two pages can hand back the same row twice. */
      .order("created_at", { ascending: true })
      .range(from, to),
  );

  /* Seeded with every day at zero, so a quiet fortnight still draws a chart. */
  const buckets = new Map<number, number>();

  for (let index = 0; index < DAILY_WINDOW_DAYS; index += 1) {
    buckets.set(windowStart + index * DAY_MS, 0);
  }

  for (const row of rows) {
    const created = new Date(row.created_at).getTime();

    if (Number.isNaN(created)) {
      continue;
    }

    /*
      Which IST day this fell in: shift into IST, floor to the day, shift back.
      A row from the future — a clock skew, a hand-edited timestamp — lands
      outside the seeded range and is dropped rather than growing the chart a
      fifteenth bar.
    */
    const dayStart =
      Math.floor((created + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS;

    const current = buckets.get(dayStart);

    if (current !== undefined) {
      buckets.set(dayStart, current + 1);
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, count]) => ({ date: new Date(day).toISOString(), count }));
}

/**
 * The fifty most recent events, each with its reply tally.
 *
 * TWO QUERIES, NOT FIFTY-ONE. The events come back first; their guests are
 * then read in one filtered query and tallied here. An embedded aggregate
 * would be neater SQL and is not available through PostgREST without a view,
 * and fifty count-per-event requests would be fifty round trips to draw one
 * table.
 *
 * The select names jsonb *fields* rather than the columns holding them. A
 * card_config is a large object — every section, every ornament, every style
 * override — and this table needs one string out of it.
 */
async function getRecentEvents(
  supabase: AdminClient,
): Promise<readonly AdminEventSummary[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECT)
    .order("created_at", { ascending: false })
    .limit(OVERVIEW_EVENT_LIMIT);

  if (error !== null) {
    throw error;
  }

  return withReplyCounts(supabase, data ?? []);
}

/**
 * The columns every event list reads.
 *
 * Named once because three call sites want exactly these, and a select string
 * copied three times is three chances for one list to show a title the others
 * resolve differently. It names jsonb FIELDS rather than the columns holding
 * them: a card_config is a large object — every section, every ornament, every
 * style override — and a list needs one string out of it.
 */
const EVENT_SUMMARY_SELECT =
  "id, created_at, is_paid, occasion:card_config->>occasionId, title:event_draft->>eventTitle, partyOne:event_draft->>partyOneName, partyTwo:event_draft->>partyTwoName, hostNames:event_draft->>hostNames";

/** What EVENT_SUMMARY_SELECT comes back as. */
interface EventSummaryRow {
  id: string;
  created_at: string;
  is_paid: boolean;
  occasion: string | null;
  title: string | null;
  partyOne: string | null;
  partyTwo: string | null;
  hostNames: string | null;
}

/**
 * Attaches each event's reply tally.
 *
 * TWO QUERIES, NOT ONE PER ROW. The events come in; their guests are read in
 * one filtered query and tallied here. An embedded aggregate would be neater
 * SQL and is not available through PostgREST without a view, and fifty
 * count-per-event requests would be fifty round trips to draw one table.
 */
async function withReplyCounts(
  supabase: AdminClient,
  events: readonly EventSummaryRow[],
): Promise<readonly AdminEventSummary[]> {
  if (events.length === 0) {
    return [];
  }

  const ids = events.map((event) => event.id);

  /*
    Paged, because fifty popular events can hold well over PostgREST's default
    thousand replies between them, and a silent truncation here would show the
    owner guest counts that are simply wrong.
  */
  const replies = await fetchAllPages<{ event_id: string; rsvp: RsvpStatus }>(
    (from, to) =>
      supabase
        .from("guests")
        .select("event_id, rsvp")
        .in("event_id", ids)
        /* A stable order, or two pages can hand back the same row twice. */
        .order("id", { ascending: true })
        .range(from, to),
  );

  const guestCounts = new Map<string, number>();
  const acceptedCounts = new Map<string, number>();

  for (const reply of replies) {
    guestCounts.set(reply.event_id, (guestCounts.get(reply.event_id) ?? 0) + 1);

    if (reply.rsvp === "accepted") {
      acceptedCounts.set(
        reply.event_id,
        (acceptedCounts.get(reply.event_id) ?? 0) + 1,
      );
    }
  }

  return events.map((event) => {
    /*
      Read defensively, although the select's inferred type is confident about
      it: `->>` answers null for a key the object does not carry, and a card
      saved by some future build could name an occasion this one has never
      heard of. Both land in the "Unknown" label rather than an empty cell.
    */
    const occasionId: string = event.occasion ?? "unknown";

    return {
      id: event.id,
      title: summaryTitle({
        title: event.title,
        partyOne: event.partyOne,
        partyTwo: event.partyTwo,
        hostNames: event.hostNames,
      }),
      occasionId,
      occasionLabel: OCCASION_LABELS.get(occasionId) ?? "Unknown",
      createdAt: event.created_at,
      isPaid: event.is_paid,
      guestCount: guestCounts.get(event.id) ?? 0,
      acceptedCount: acceptedCounts.get(event.id) ?? 0,
    };
  });
}

/* ─────────────────────────── One event ─────────────────────────── */

/** A guest as the detail page shows them. Plain values, no check-in token. */
export interface AdminGuest {
  id: string;
  name: string;
  phone: string;
  rsvp: RsvpStatus;
  accompanyingCount: number;
  message: string | null;
  respondedAt: string | null;
  checkedIn: boolean;
  checkedInAt: string | null;
}

/** One event in full, as the detail page shows it. */
export interface AdminEventDetail {
  id: string;
  title: string;
  occasionLabel: string;
  traditionId: string;
  hostId: string;
  inviteCode: string;
  isPaid: boolean;
  paymentId: string | null;
  language: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  subEventCount: number;
  qrCheckinEnabled: boolean;
  showWeather: boolean;
  coverAnimation: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * The payment that activated it, or null when unpaid — or when the row could
   * not be read, which costs this one field and not the page.
   */
  payment: {
    method: PaymentMethod;
    amountPaise: number;
    couponCode: string | null;
    reason: string | null;
    grantedBy: string | null;
    paidAt: string | null;
  } | null;
  /** The lock after the event and the change limits (lib/eventLock.ts). */
  lock: {
    endDate: string | null;
    originalEndDate: string | null;
    dateChangeCount: number;
    nameChangeCount: number;
    editUnlockedUntil: string | null;
    ended: boolean;
  };
  guests: readonly AdminGuest[];
  tally: {
    total: number;
    accepted: number;
    declined: number;
    maybe: number;
    pending: number;
    checkedIn: number;
    /** Everyone expected at the door: acceptances plus the people they bring. */
    headcount: number;
  };
}

/**
 * One event and its whole guest list, or null when no such event exists.
 *
 * Null rather than a failure for an unknown id, the way getEventById is null
 * for one: a dead link from a bookmark is a not-found, not an error worth a
 * red box.
 *
 * THE FULL ROW, DELIBERATELY. Unlike every host-facing read, this one takes
 * host_id and payment_id too. They are the questions the owner actually has —
 * whose event is this, what paid for it — and this page is the only place in
 * the app where asking them is legitimate.
 */
export async function getAdminEventDetail(
  id: string,
): Promise<DbResult<AdminEventDetail | null>> {
  /*
    Checked before the round trip. Postgres refuses a malformed uuid with error
    22P02 rather than an empty result, which would surface as "could not load"
    where the honest answer is "no such event".
  */
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    return dbSuccess(null);
  }

  const supabase = createAdminClient();

  try {
    const { data: event, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error !== null) {
      throw error;
    }

    if (event === null) {
      return dbSuccess(null);
    }

    const guests = await fetchAllPages<{
      id: string;
      name: string;
      phone: string | null;
      rsvp: RsvpStatus;
      accompanying_count: number;
      message: string | null;
      responded_at: string | null;
      checked_in: boolean;
      checked_in_at: string | null;
    }>((from, to) =>
      supabase
        .from("guests")
        .select(
          "id, name, phone, rsvp, accompanying_count, message, responded_at, checked_in, checked_in_at",
        )
        .eq("event_id", id)
        /*
          Newest reply first, with a stable tiebreak so paging cannot repeat a
          row. responded_at is null for a seeded pending guest, and Postgres
          sorts nulls last on a descending order by default — which puts the
          people who have not replied at the bottom, where they belong.
        */
        .order("responded_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    );

    const rows: AdminGuest[] = guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      phone: guest.phone ?? "",
      rsvp: guest.rsvp,
      accompanyingCount: guest.accompanying_count,
      message: guest.message,
      respondedAt: guest.responded_at,
      checkedIn: guest.checked_in,
      checkedInAt: guest.checked_in_at,
    }));

    const tally = rows.reduce(
      (totals, guest) => ({
        total: totals.total + 1,
        accepted: totals.accepted + (guest.rsvp === "accepted" ? 1 : 0),
        declined: totals.declined + (guest.rsvp === "declined" ? 1 : 0),
        maybe: totals.maybe + (guest.rsvp === "maybe" ? 1 : 0),
        pending: totals.pending + (guest.rsvp === "pending" ? 1 : 0),
        checkedIn: totals.checkedIn + (guest.checkedIn ? 1 : 0),
        headcount:
          totals.headcount +
          (guest.rsvp === "accepted" ? 1 + guest.accompanyingCount : 0),
      }),
      {
        total: 0,
        accepted: 0,
        declined: 0,
        maybe: 0,
        pending: 0,
        checkedIn: 0,
        headcount: 0,
      },
    );

    const occasionId: string = event.card_config.occasionId ?? "unknown";
    const draft = event.event_draft;
    const payment = event.is_paid ? await activatingPayment(supabase, id) : null;

    return dbSuccess({
      id: event.id,
      title: summaryTitle({
        title: draft.eventTitle ?? null,
        partyOne: draft.partyOneName ?? null,
        partyTwo: draft.partyTwoName ?? null,
        hostNames: draft.hostNames ?? null,
      }),
      occasionLabel: OCCASION_LABELS.get(occasionId) ?? "Unknown",
      traditionId: event.card_config.traditionId ?? "none",
      hostId: event.host_id,
      inviteCode: event.invite_code,
      isPaid: event.is_paid,
      paymentId: event.payment_id,
      payment,
      language: event.card_config.language ?? "en",
      eventDate: draft.eventDate ?? "",
      eventTime: draft.eventTime ?? "",
      venueName: draft.venueName ?? "",
      venueAddress: draft.venueAddress ?? "",
      subEventCount: Array.isArray(draft.subEvents) ? draft.subEvents.length : 0,
      qrCheckinEnabled: event.qr_checkin_enabled === true,
      showWeather: event.show_weather === true,
      coverAnimation: event.cover_animation,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      lock: {
        endDate: eventEndDate(toStoredEvent(event).draft),
        originalEndDate: event.original_end_date ?? null,
        dateChangeCount: event.date_change_count ?? 0,
        nameChangeCount: event.name_change_count ?? 0,
        editUnlockedUntil: event.edit_unlocked_until ?? null,
        ended: hasEnded(event.is_paid, toStoredEvent(event).draft),
      },
      guests: rows,
      tally,
    });
  } catch (cause: unknown) {
    return dbFailure(
      "admin/getAdminEventDetail",
      cause,
      "Could not load this event.",
    );
  }
}

/**
 * The latest captured payment row for one event: how it was paid for.
 *
 * Null rather than a throw on error, so a deployment without 0014's `method`
 * column still shows the rest of the event.
 */
async function activatingPayment(
  supabase: AdminClient,
  eventId: string,
): Promise<AdminEventDetail["payment"]> {
  const { data, error } = await supabase
    .from("payments")
    .select("method, amount, coupon_code, reason, granted_by, paid_at")
    .eq("event_id", eventId)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error !== null) {
    console.error(`[admin] could not read the payment for event ${eventId}:`, error);
    return null;
  }

  return data === null
    ? null
    : {
        method: data.method,
        amountPaise: data.amount,
        couponCode: data.coupon_code,
        reason: data.reason,
        grantedBy: data.granted_by,
        paidAt: data.paid_at,
      };
}

/* ─────────────────────── Finding one event ─────────────────────── */

/** One search result on the free activation page. */
export interface AdminFoundEvent {
  id: string;
  title: string;
  inviteCode: string;
  hostEmail: string | null;
  isPaid: boolean;
  createdAt: string;
}

/** The longest search worth sending: an email address is at most 254. */
const MAX_FIND_LENGTH = 254;

/**
 * Events matching an invite code, an event id or a host's email, exactly.
 *
 * Exact rather than partial on purpose: this page exists to find the one event
 * about to be given away, not to browse. admin_find_events (0014) runs the
 * match, because the email is in auth.users, which only the database can join.
 */
export async function findAdminEvents(
  rawQuery: string,
): Promise<DbResult<readonly AdminFoundEvent[]>> {
  const query = rawQuery.trim().slice(0, MAX_FIND_LENGTH);

  if (query.length === 0) {
    return dbSuccess([]);
  }

  const { data, error } = await createAdminClient().rpc("admin_find_events", {
    p_query: query,
  });

  if (error !== null) {
    return dbFailure("admin/findAdminEvents", error, "Could not search events.");
  }

  return dbSuccess(
    (data ?? []).map((row) => ({
      id: row.id,
      title: summaryTitle({
        title: row.title,
        partyOne: row.party_one,
        partyTwo: row.party_two,
        hostNames: row.host_names,
      }),
      inviteCode: row.invite_code,
      hostEmail: row.host_email,
      isPaid: row.is_paid,
      createdAt: row.created_at,
    })),
  );
}

/* ─────────────────────── The events list page ─────────────────────── */

/** One page of events, plus what the pagination controls need to know. */
export interface AdminEventPage {
  events: readonly AdminEventSummary[];
  /** How many events match the filters, ignoring the page. */
  total: number;
  /** Zero-based, echoed back so the controls need not re-parse the URL. */
  page: number;
  /** How many pages the filters produce. At least 1, even when empty. */
  pageCount: number;
  /** True when the page asked for is past the end, so the page can say so. */
  outOfRange: boolean;
}

/**
 * Every filter the events list applies, as data rather than as calls.
 *
 * Described once and applied twice, because the page needs a count and a slice
 * and the two MUST agree. Expressed as a list rather than as a function over a
 * query builder because postgrest-js gives a head-count builder and a row
 * builder different types, and a generic that satisfied both would be more
 * type gymnastics than the three filters are worth.
 */
type EventFilter =
  | { kind: "eq"; column: string; value: string | boolean }
  | { kind: "or"; expression: string };

/**
 * The filters for one query.
 *
 * EVERYTHING HERE COMES OUT OF A NARROWED VALUE OBJECT. parseEventsQuery in
 * lib/admin/eventsQuery.ts has already reduced the sort and paid filters to
 * unions, checked the type against the occasion registry, clamped the page and
 * scrubbed the search of the punctuation that would change the meaning of the
 * `or` expression below. That module carries the argument; this one cannot
 * accept anything else, because its parameter type will not hold it.
 */
function eventFilters(query: EventsQuery): readonly EventFilter[] {
  const filters: EventFilter[] = [];

  if (query.paid !== "all") {
    filters.push({ kind: "eq", column: "is_paid", value: query.paid === "paid" });
  }

  if (query.type !== "all") {
    /*
      The occasion lives inside the card_config jsonb, so this filters on the
      extracted text. `query.type` is a MEMBER of the occasion registry —
      checked by membership, not by shape — so nothing arbitrary reaches the
      right-hand side.
    */
    filters.push({
      kind: "eq",
      column: "card_config->>occasionId",
      value: query.type,
    });
  }

  if (query.search.length > 0) {
    /*
      FOUR COLUMNS, because that is what the list displays: summaryTitle falls
      back from the event's title to the two party names to the host line, and
      a search that only looked at the title would fail to find a row shown to
      the reader as "Aarav & Meera".

      `*` is PostgREST's wildcard in an `ilike` pattern, not `%`. The search has
      had `*`, `%` and `_` scrubbed out of it, so the only wildcards in this
      expression are the two this line puts there.
    */
    const pattern = `*${query.search}*`;

    filters.push({
      kind: "or",
      expression: [
        `event_draft->>eventTitle.ilike.${pattern}`,
        `event_draft->>partyOneName.ilike.${pattern}`,
        `event_draft->>partyTwoName.ilike.${pattern}`,
        `event_draft->>hostNames.ilike.${pattern}`,
      ].join(","),
    });
  }

  return filters;
}

/**
 * One page of events, filtered and sorted by the database.
 *
 * WHY SERVER-SIDE AT ALL, when the old table sorted fifty rows in the browser:
 * fifty rows WAS the whole table. Paginating means the browser no longer holds
 * the rows it would need to sort or filter, and pretending otherwise would mean
 * loading every event in order to show fifty — which is the thing being moved
 * away from. The safety that the old arrangement bought is not lost, it is
 * concentrated: see lib/admin/eventsQuery.ts.
 */
export async function getAdminEventPage(
  query: EventsQuery,
): Promise<DbResult<AdminEventPage>> {
  const supabase = createAdminClient();
  const filters = eventFilters(query);

  try {
    let countQuery = supabase
      .from("events")
      .select("id", { count: "exact", head: true });

    for (const filter of filters) {
      countQuery =
        filter.kind === "eq"
          ? countQuery.eq(filter.column, filter.value)
          : countQuery.or(filter.expression);
    }

    const total = await countRows(countQuery);
    const pageCount = Math.max(1, Math.ceil(total / EVENTS_PAGE_SIZE));

    /*
      A page past the end is reported rather than silently snapped back to the
      last one. Someone who bookmarked page 4 and then narrowed the filter
      should be told their page is empty, not shown page 2 as though that had
      been what they asked for.
    */
    const outOfRange = total > 0 && query.page >= pageCount;

    if (outOfRange) {
      return dbSuccess({
        events: [],
        total,
        page: query.page,
        pageCount,
        outOfRange,
      });
    }

    let rowQuery = supabase.from("events").select(EVENT_SUMMARY_SELECT);

    for (const filter of filters) {
      rowQuery =
        filter.kind === "eq"
          ? rowQuery.eq(filter.column, filter.value)
          : rowQuery.or(filter.expression);
    }

    const from = query.page * EVENTS_PAGE_SIZE;

    const { data, error } = await rowQuery
      .order("created_at", { ascending: query.sort === "oldest" })
      /*
        A tiebreak on id. Two events created in the same millisecond — a seed
        script, an import — would otherwise be ordered arbitrarily, and an
        arbitrary order across two pages can show one row twice and skip
        another entirely.
      */
      .order("id", { ascending: true })
      .range(from, from + EVENTS_PAGE_SIZE - 1);

    if (error !== null) {
      throw error;
    }

    return dbSuccess({
      events: await withReplyCounts(supabase, data ?? []),
      total,
      page: query.page,
      pageCount,
      outOfRange,
    });
  } catch (cause: unknown) {
    return dbFailure(
      "admin/getAdminEventPage",
      cause,
      "Could not load the events.",
    );
  }
}
