import Link from "next/link";
import type { ReactElement } from "react";
import { OCCASIONS } from "@/lib/occasions";
import {
  EVENTS_PAGE_SIZE,
  eventsHref,
  type EventsQuery,
} from "@/lib/admin/eventsQuery";
import { formatCount } from "@/lib/admin/format";

/**
 * Search, filters and pagination for the events list.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * A PLAIN GET FORM, AND SERVER COMPONENTS THROUGHOUT. No `useState`, no
 * `useRouter`, no client bundle at all. Three things follow from that, and each
 * is worth more here than the polish of a select that re-queries as it changes:
 *
 *  1. The state is in the URL, so the page can be bookmarked, shared and — the
 *     one that matters daily — reached with the browser's Back button. A
 *     client-state table forgets the filter the moment you open an event and
 *     come back.
 *  2. It works before hydration and without JavaScript. An internal tool opened
 *     on a phone with one bar of signal is exactly where that stops being
 *     theoretical.
 *  3. Paging is a link. A link can be middle-clicked, opened in a tab and
 *     prefetched; a button wired to a router cannot.
 *
 * The cost is one press of "Apply" rather than a filter that fires on change.
 * That is the trade, and for a table read far more often than it is filtered,
 * it is the right way round.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * EVERY CONTROL IS LABELLED. `htmlFor`/`id` pairs rather than placeholder text:
 * a placeholder disappears the moment anything is typed, which leaves a screen
 * reader — and anyone returning to a half-filled form — with an unnamed box.
 */

const CONTROL_CLASS =
  "min-h-9 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900";

const LABEL_CLASS = "text-xs font-medium text-zinc-600";

export function EventFilters({ query }: { query: EventsQuery }): ReactElement {
  return (
    <form
      method="get"
      action="/admin/events"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3"
    >
      <div className="flex min-w-[12rem] flex-1 flex-col gap-1">
        <label htmlFor="events-search" className={LABEL_CLASS}>
          Search by title
        </label>
        <input
          id="events-search"
          name="search"
          type="search"
          defaultValue={query.rawSearch}
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          placeholder="Wedding, Aarav…"
          className={`${CONTROL_CLASS} w-full`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="events-paid" className={LABEL_CLASS}>
          Payment
        </label>
        <select
          id="events-paid"
          name="paid"
          defaultValue={query.paid}
          className={CONTROL_CLASS}
        >
          <option value="all">All</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="events-type" className={LABEL_CLASS}>
          Event type
        </label>
        <select
          id="events-type"
          name="type"
          defaultValue={query.type}
          className={CONTROL_CLASS}
        >
          <option value="all">All types</option>
          {OCCASIONS.map((occasion) => (
            <option key={occasion.id} value={occasion.id}>
              {occasion.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="events-sort" className={LABEL_CLASS}>
          Created
        </label>
        <select
          id="events-sort"
          name="sort"
          defaultValue={query.sort}
          className={CONTROL_CLASS}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <button
        type="submit"
        className="min-h-9 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
      >
        Apply
      </button>

      {/*
        Only when something is set, so the row is not permanently carrying a
        control that does nothing. A link rather than a reset button: reset
        would clear the inputs and leave the URL — and therefore the results —
        exactly as they were.
      */}
      {hasFilters(query) ? (
        <Link
          href="/admin/events"
          className="min-h-9 rounded-md px-2 py-2 text-sm text-zinc-600 underline underline-offset-4 transition-colors hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Clear
        </Link>
      ) : null}
    </form>
  );
}

/** Whether anything is narrowing the list right now. */
export function hasFilters(query: EventsQuery): boolean {
  return (
    query.paid !== "all" ||
    query.type !== "all" ||
    query.search.length > 0 ||
    query.rawSearch.length > 0
  );
}

/**
 * Which rows are on screen, and the way to the next and previous ones.
 *
 * "51–100 of 214" rather than "page 2 of 5". Both are true; the first is the
 * one that answers "have I scrolled past the thing I am looking for", which is
 * the question somebody paging a table is actually asking.
 */
export function EventsPagination({
  query,
  total,
  page,
  pageCount,
  shown,
}: {
  query: EventsQuery;
  total: number;
  page: number;
  pageCount: number;
  /** How many rows this page actually rendered. */
  shown: number;
}): ReactElement | null {
  /* One page and nothing to step to: the controls would be decoration. */
  if (total === 0) {
    return null;
  }

  const first = page * EVENTS_PAGE_SIZE + 1;
  const last = page * EVENTS_PAGE_SIZE + shown;
  const hasPrevious = page > 0;
  const hasNext = page + 1 < pageCount;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-zinc-500" aria-live="polite">
        {shown === 0
          ? `No rows on this page. ${formatCount(total)} match in total.`
          : `Showing ${formatCount(first)}–${formatCount(last)} of ${formatCount(total)}`}
        {pageCount > 1 ? ` · page ${page + 1} of ${formatCount(pageCount)}` : ""}
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <PageLink
            href={eventsHref(query, { page: page - 1 })}
            enabled={hasPrevious}
            label="Previous"
          />
          <PageLink
            href={eventsHref(query, { page: page + 1 })}
            enabled={hasNext}
            label="Next"
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One step of the pager.
 *
 * A disabled edge renders as a <span>, not a greyed-out <a>. A link that goes
 * nowhere is still focusable and still announced as a link, which puts two
 * dead stops in the keyboard path on every first and last page.
 */
function PageLink({
  href,
  enabled,
  label,
}: {
  href: string;
  enabled: boolean;
  label: string;
}): ReactElement {
  if (!enabled) {
    return (
      <span
        aria-hidden="true"
        className="min-h-9 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-300"
      >
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="min-h-9 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
    >
      {label}
    </Link>
  );
}
