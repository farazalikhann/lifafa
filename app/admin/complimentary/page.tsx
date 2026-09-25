import Link from "next/link";
import type { ReactElement } from "react";
import ActivateFreeButton from "@/components/admin/ActivateFreeButton";
import { PageHeading } from "@/components/admin/AdminShell";
import { PaidPill } from "@/components/admin/EventsTable";
import { EmptyState, ErrorNotice } from "@/components/admin/Feedback";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatIst } from "@/lib/admin/format";
import { findAdminEvents } from "@/lib/admin/stats";

/**
 * Find one event and activate it for free.
 *
 * The search is a plain GET form, as on the events list, so a result can be
 * reloaded or linked. It matches exactly — an invite code, an event id or the
 * host's email — because this page gives an invitation away and should find
 * the one meant, not a page of near misses.
 *
 * The activation itself is ActivateFreeButton, which posts to
 * app/admin/events/actions.ts and is checked there against the admin session.
 */
export const dynamic = "force-dynamic";

const CONTROL_CLASS =
  "min-h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900";

export default async function AdminComplimentaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactElement> {
  await requireAdminSession();

  const raw = (await searchParams).q;
  const query = (Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "")).slice(0, 254);
  const result = query.trim().length === 0 ? null : await findAdminEvents(query);

  return (
    <>
      <PageHeading
        title="Free activation"
        description="Find an event by invite code, event id or host email, and activate it without payment."
      />

      <form
        method="get"
        action="/admin/complimentary"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-3"
      >
        <div className="flex min-w-[14rem] flex-1 flex-col gap-1">
          <label htmlFor="find-event" className="text-xs font-medium text-zinc-600">
            Invite code, event id or host email
          </label>
          <input
            id="find-event"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={254}
            autoComplete="off"
            spellCheck={false}
            className={CONTROL_CLASS}
          />
        </div>
        <button
          type="submit"
          className="min-h-9 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Find
        </button>
      </form>

      <div className="mt-4">
        {result === null ? null : !result.ok ? (
          <ErrorNotice message={result.error} />
        ) : result.data.length === 0 ? (
          <EmptyState
            title="No event matches that."
            hint="It has to be the whole invite code, event id or email address."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {result.data.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border border-zinc-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="font-medium text-blue-700 underline underline-offset-2 break-words"
                    >
                      {event.title}
                    </Link>
                    <p className="mt-1 text-xs break-words text-zinc-500">
                      <code>{event.inviteCode}</code> ·{" "}
                      {event.hostEmail ?? "no email"} · created{" "}
                      {formatIst(event.createdAt)}
                    </p>
                  </div>
                  <PaidPill isPaid={event.isPaid} />
                </div>

                <div className="mt-3">
                  {event.isPaid ? (
                    <p className="text-sm text-zinc-500">Already active.</p>
                  ) : (
                    <ActivateFreeButton eventId={event.id} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
