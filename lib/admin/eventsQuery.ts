import { OCCASIONS } from "@/lib/occasions";

/**
 * The events list's URL parameters, and the validation that makes them safe to
 * put in a query.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHY THIS FILE EXISTS AT ALL.
 *
 * The events table used to load fifty rows and sort them in the browser, and
 * the note on that component said why: sorting on the server means taking a
 * sort key out of a URL and feeding it to a query built with the service role
 * key, which bypasses Row Level Security entirely.
 *
 * Paginating properly means doing exactly that. So the risk does not go away,
 * it gets concentrated here: this module is the only place a URL parameter
 * becomes part of an admin query, every field is narrowed to a closed set
 * before it leaves, and the one free-text field is scrubbed against the
 * grammar it is about to be embedded in.
 *
 * NOTHING HERE TOUCHES THE DATABASE. It takes strings and returns a value
 * object. That is what makes it testable without a connection, and what keeps
 * the parsing honest — a parser that could also run a query would be tempted
 * to skip a step.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Rows per page. The figure the "next"/"previous" controls step by. */
export const EVENTS_PAGE_SIZE = 50;

/** How many rows the compact list on the overview shows. */
export const OVERVIEW_EVENT_LIMIT = 8;

/** The longest search anybody types into a title box. */
const MAX_SEARCH_LENGTH = 64;

export type EventSort = "newest" | "oldest";
export type PaidFilter = "all" | "paid" | "unpaid";

/** Everything the list route accepts, already narrowed. */
export interface EventsQuery {
  /** Zero-based. Clamped at 0; there is no upper bound until the count is known. */
  page: number;
  sort: EventSort;
  paid: PaidFilter;
  /** An OccasionId, or "all". Never an arbitrary string. */
  type: string;
  /** Scrubbed; see `scrubSearch`. Empty means no search. */
  search: string;
  /** What the reader actually typed, for putting back in the input. */
  rawSearch: string;
}

/** The ids the type filter will accept, plus the catch-all. */
const OCCASION_IDS = new Set<string>(OCCASIONS.map((occasion) => occasion.id));

/**
 * Strips what would change the meaning of a PostgREST `or=(…)` expression, and
 * what would change the meaning of a LIKE pattern.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * THE SEARCH IS THE ONE FREE-TEXT VALUE THAT REACHES A QUERY, so it gets the
 * paragraph.
 *
 * Title search has to look in four places — the event's title and, for a card
 * that never got one, the two party names and the host line, because that is
 * what the list actually displays. Four columns means PostgREST's `or`, and
 * `or` takes ONE STRING of the form `or=(col.op.val,col.op.val)`. A comma or a
 * bracket inside `val` is not data, it is punctuation: it ends the condition
 * early and whatever follows is read as another one. That is the injection.
 *
 * So the characters that are punctuation in that grammar are removed rather
 * than escaped — `,` `(` `)` `"` `\` — along with `%` and `_`, which are LIKE's
 * own wildcards and would otherwise let a search for "100_" match far more than
 * it looks like it should. A dot survives on purpose: PostgREST splits
 * `col.op.val` on the first two dots only, so "Dr. Sharma" is a perfectly good
 * search and refusing it would be cargo cult.
 *
 * What this costs: a literal comma or bracket cannot be searched for. In a box
 * that filters event titles in an internal tool, that is not a loss worth
 * carrying a proper escaper for.
 * ────────────────────────────────────────────────────────────────────────────
 */
function scrubSearch(raw: string): string {
  return raw
    .slice(0, MAX_SEARCH_LENGTH)
    .replace(/[,()"\\%_*]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** One value out of Next's searchParams, which may be a string or an array. */
function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    /*
      `?paid=paid&paid=unpaid` arrives as an array. Taking the first is
      arbitrary but deterministic, and every branch below re-validates it
      anyway — the point is only that an array never reaches a comparison
      expecting a string.
    */
    return value[0] ?? "";
  }

  return value ?? "";
}

/**
 * Narrows raw search params to the closed sets above.
 *
 * EVERY FIELD FAILS TO A DEFAULT rather than to an error. A hand-edited URL is
 * not worth a 400 in an internal tool, and "?sort=drop table" quietly meaning
 * "newest first" is both safer and more useful than a page that refuses to
 * render.
 */
export function parseEventsQuery(
  params: Record<string, string | string[] | undefined>,
): EventsQuery {
  const rawSort = one(params.sort);
  const rawPaid = one(params.paid);
  const rawType = one(params.type);
  const rawSearch = one(params.search).slice(0, MAX_SEARCH_LENGTH);

  /*
    ONE-BASED IN THE URL, ZERO-BASED IN HERE, and the conversion is this minus
    one. "Page 1" is what a person says and `?page=0` reads like a bug, while
    the offset handed to `.range()` counts from zero — so exactly one of the
    two has to do the arithmetic, and doing it here means eventsHref below is
    the only other place that knows about the difference.

    `Number.parseInt` on "3abc" is 3, which is fine, and on "abc" is NaN, which
    the guard catches. Clamped at zero so a negative or zero page cannot produce
    a negative `.range()` offset, which PostgREST answers with an error rather
    than an empty page.
  */
  const parsedPage = Number.parseInt(one(params.page), 10);

  return {
    page:
      Number.isFinite(parsedPage) && parsedPage > 1
        ? Math.floor(parsedPage) - 1
        : 0,
    sort: rawSort === "oldest" ? "oldest" : "newest",
    paid: rawPaid === "paid" || rawPaid === "unpaid" ? rawPaid : "all",
    /* Membership in the registry, not a shape test. An unknown id is "all". */
    type: OCCASION_IDS.has(rawType) ? rawType : "all",
    search: scrubSearch(rawSearch),
    rawSearch,
  };
}

/**
 * The query as a URL, for the pagination links and the filter form.
 *
 * Only the parameters that differ from the default are written, so the common
 * case is a clean `/admin/events` rather than a URL restating every default.
 * `page` is one-based in the URL and zero-based in the object: "page 1" is what
 * a person says, and `?page=0` reads like a bug.
 */
export function eventsHref(
  query: EventsQuery,
  overrides: Partial<EventsQuery> = {},
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (next.sort !== "newest") {
    params.set("sort", next.sort);
  }

  if (next.paid !== "all") {
    params.set("paid", next.paid);
  }

  if (next.type !== "all") {
    params.set("type", next.type);
  }

  /*
    The raw text, not the scrubbed one. What goes back in the URL is what the
    reader typed, so the box still shows their words after a page change; the
    scrub happens again on the way into the query.
  */
  if (next.rawSearch.length > 0) {
    params.set("search", next.rawSearch);
  }

  if (next.page > 0) {
    params.set("page", String(next.page + 1));
  }

  const queryString = params.toString();

  return queryString.length === 0
    ? "/admin/events"
    : `/admin/events?${queryString}`;
}
