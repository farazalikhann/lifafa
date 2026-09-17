import type { ReactElement } from "react";
import { PageHeading } from "@/components/admin/AdminShell";
import EventsTable from "@/components/admin/EventsTable";
import {
  EventFilters,
  EventsPagination,
  hasFilters,
} from "@/components/admin/EventFilters";
import { ErrorNotice } from "@/components/admin/Feedback";
import { requireAdminSession } from "@/lib/admin/auth";
import { parseEventsQuery } from "@/lib/admin/eventsQuery";
import { getAdminEventPage } from "@/lib/admin/stats";

/**
 * Every event, searchable and paged fifty at a time.
 *
 * THE FILTERS LIVE IN THE URL, not in a component's state. The form on this
 * page is a plain GET form and the pager is a pair of links, so the query is
 * bookmarkable, survives the Back button after opening an event, and works
 * before hydration. See components/admin/EventFilters.tsx.
 *
 * `force-dynamic` because the whole point of it is to be current, and because
 * the result depends on a cookie: a cached copy of this would be a copy of
 * every host's events sitting in a store that knows nothing about who is
 * allowed to read it.
 */
export const dynamic = "force-dynamic";

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactElement> {
  /*
    Before any query runs. middleware.ts has already refused an unauthenticated
    request, and this is the check that does not depend on a matcher staying
    correct — see the note in lib/admin/auth.ts.
  */
  await requireAdminSession();

  /*
    Narrowed before it goes anywhere near a query built with the service role
    key. parseEventsQuery reduces every field to a closed set and scrubs the
    one free-text field; nothing downstream of it accepts a raw parameter.
  */
  const query = parseEventsQuery(await searchParams);
  const result = await getAdminEventPage(query);

  return (
    <>
      <PageHeading
        title="Events"
        description="Every invitation, across every host. Times are IST."
      />

      <div className="mt-6">
        <EventFilters query={query} />
      </div>

      {!result.ok ? (
        <div className="mt-4">
          <ErrorNotice message={result.error} />
        </div>
      ) : (
        <div className="mt-4">
          <EventsTable
            events={result.data.events}
            /*
              Two different emptinesses, told apart. "No events yet" is the
              product being young and there is nothing to do about it; "nothing
              matched" is something the reader just did and can undo, so it
              says which control to reach for.
            */
            emptyTitle={
              result.data.outOfRange
                ? "That page is past the end of the results."
                : hasFilters(query)
                  ? "No events match these filters."
                  : "No events yet."
            }
            emptyHint={
              result.data.outOfRange
                ? "Use Previous, or clear the filters to start again."
                : hasFilters(query)
                  ? "Try a broader search, or clear the filters."
                  : "Invitations appear here as hosts create them."
            }
          />

          <EventsPagination
            query={query}
            total={result.data.total}
            page={result.data.page}
            pageCount={result.data.pageCount}
            shown={result.data.events.length}
          />
        </div>
      )}
    </>
  );
}
