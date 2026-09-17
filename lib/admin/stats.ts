import { createAdminClient } from "@/lib/supabase/admin";
import { OCCASIONS } from "@/lib/occasions";
import { INVITATION_PRICE_INR } from "@/lib/pricing";
import {
  dbFailure,
  dbSuccess,
  postgresError,
  type DbResult,
} from "@/lib/db/result";
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
  recentEvents: readonly AdminEventSummary[];
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

    const [byOccasion, recentEvents, money] = await Promise.all([
      countByOccasion(supabase, totalEvents),
      getRecentEvents(supabase),
      sumCapturedPayments(supabase),
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
    .select(
      "id, created_at, is_paid, occasion:card_config->>occasionId, title:event_draft->>eventTitle, partyOne:event_draft->>partyOneName, partyTwo:event_draft->>partyTwoName, hostNames:event_draft->>hostNames",
    )
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  if (error !== null) {
    throw error;
  }

  const events = data ?? [];

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
