import Link from "next/link";
import type { ReactElement } from "react";
import { PageHeading } from "@/components/admin/AdminShell";
import { EmptyState, ErrorNotice } from "@/components/admin/Feedback";
import HelpMessageCard, { type HelpMessageCardData } from "@/components/admin/HelpMessageCard";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatCount, formatIst } from "@/lib/admin/format";
import {
  HELP_PAGE_SIZE,
  HELP_STATUS_TABS,
  emailReplyUrl,
  firstLine,
  getHelpMessagePage,
  helpHref,
  indianMobile,
  parseHelpQuery,
  replyEmail,
  timeAgo,
  whatsAppReplyUrl,
  type AdminHelpMessage,
  type HelpQuery,
} from "@/lib/admin/helpMessages";

/**
 * The Help inbox: messages sent through the Help bot on the home page and the
 * host dashboard. Newest first, 25 a page, filtered by status (New by default)
 * and searchable by name, contact or message. Each row opens to the full
 * message, the reply links, the status buttons and a private note.
 *
 * Built for a phone first: one column of cards, no table.
 */
export const dynamic = "force-dynamic";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";

function toCard(message: AdminHelpMessage, now: number): HelpMessageCardData {
  const fullDate = formatIst(message.createdAt);
  const mobile = indianMobile(message.contact);
  const email = replyEmail(message.contact, message.userEmail);

  return {
    id: message.id,
    name: message.name,
    contact: message.contact,
    message: message.message,
    firstLine: firstLine(message.message),
    page: message.page,
    userEmail: message.userEmail,
    status: message.status,
    adminNote: message.adminNote,
    createdAt: message.createdAt,
    ago: timeAgo(message.createdAt, now, fullDate),
    fullDate,
    whatsAppUrl: mobile === null ? null : whatsAppReplyUrl(mobile, message.name),
    emailUrl: email === null ? null : emailReplyUrl(email),
    eventHref: message.eventId === null ? null : `/admin/events/${message.eventId}`,
  };
}

export default async function AdminHelpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactElement> {
  await requireAdminSession();

  const query = parseHelpQuery(await searchParams);
  const result = await getHelpMessagePage(query);
  const now = Date.now();

  return (
    <>
      <PageHeading
        title="Help messages"
        description="Sent from the Help button on the home page and host dashboards. Times are IST."
      />

      <nav aria-label="Filter by status" className="mt-5 flex gap-1 overflow-x-auto">
        {HELP_STATUS_TABS.map((tab) => {
          const current = tab.id === query.status;

          return (
            <Link
              key={tab.id}
              href={helpHref(query, { status: tab.id, page: 0 })}
              aria-current={current ? "page" : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm whitespace-nowrap transition-colors ${FOCUS} ${
                current
                  ? "bg-zinc-900 font-semibold text-white"
                  : "border border-zinc-200 bg-white font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <form method="get" action="/admin/help" role="search" className="mt-3 flex gap-2">
        {query.status !== "new" ? <input type="hidden" name="status" value={query.status} /> : null}
        <label htmlFor="help-search" className="sr-only">
          Search name, contact or message
        </label>
        <input
          id="help-search"
          name="search"
          type="search"
          defaultValue={query.rawSearch}
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          placeholder="Name, contact or message"
          className="min-h-10 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 sm:text-sm"
        />
        <button
          type="submit"
          className={`min-h-10 shrink-0 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 ${FOCUS}`}
        >
          Search
        </button>
        {query.rawSearch.length > 0 ? (
          <Link
            href={helpHref(query, { search: "", rawSearch: "", page: 0 })}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-md px-2 text-sm text-zinc-600 underline underline-offset-4 hover:text-zinc-900 ${FOCUS}`}
          >
            Clear
          </Link>
        ) : null}
      </form>

      {!result.ok ? (
        <div className="mt-4">
          <ErrorNotice message={result.error} />
        </div>
      ) : result.data.messages.length === 0 ? (
        <div className="mt-4">
          <EmptyState {...emptyText(query, result.data.outOfRange)} />
        </div>
      ) : (
        <>
          <ul className="mt-4 flex flex-col gap-2">
            {result.data.messages.map((message) => (
              <HelpMessageCard key={message.id} data={toCard(message, now)} />
            ))}
          </ul>
          <Pagination
            query={query}
            total={result.data.total}
            page={result.data.page}
            pageCount={result.data.pageCount}
            shown={result.data.messages.length}
          />
        </>
      )}
    </>
  );
}

function emptyText(query: HelpQuery, outOfRange: boolean): { title: string; hint?: string } {
  if (outOfRange) {
    return { title: "That page is past the end of the results.", hint: "Use Previous, or go back to the first page." };
  }

  if (query.search.length > 0 || query.rawSearch.length > 0) {
    return { title: "No messages match this search.", hint: "Try a shorter search, or the All tab." };
  }

  switch (query.status) {
    case "new":
      return { title: "No new messages.", hint: "Everything has been answered." };
    case "replied":
      return { title: "No replied messages." };
    case "closed":
      return { title: "No closed messages." };
    default:
      return { title: "No help messages yet.", hint: "Messages appear here when someone uses the Help button." };
  }
}

function Pagination({
  query,
  total,
  page,
  pageCount,
  shown,
}: {
  query: HelpQuery;
  total: number;
  page: number;
  pageCount: number;
  shown: number;
}): ReactElement {
  const first = page * HELP_PAGE_SIZE + 1;
  const last = page * HELP_PAGE_SIZE + shown;

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-zinc-500">
        {`Showing ${formatCount(first)}–${formatCount(last)} of ${formatCount(total)}`}
        {pageCount > 1 ? ` · page ${page + 1} of ${formatCount(pageCount)}` : ""}
      </p>
      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          <PageLink href={helpHref(query, { page: page - 1 })} enabled={page > 0} label="Previous" />
          <PageLink href={helpHref(query, { page: page + 1 })} enabled={page + 1 < pageCount} label="Next" />
        </div>
      ) : null}
    </div>
  );
}

function PageLink({ href, enabled, label }: { href: string; enabled: boolean; label: string }): ReactElement {
  if (!enabled) {
    return (
      <span aria-hidden="true" className="inline-flex min-h-10 items-center rounded-md border border-zinc-200 px-3 text-sm text-zinc-300">
        {label}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`inline-flex min-h-10 items-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium transition-colors hover:bg-zinc-100 ${FOCUS}`}
    >
      {label}
    </Link>
  );
}
