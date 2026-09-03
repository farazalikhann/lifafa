"use client";

import { use, type ReactElement } from "react";
import Link from "next/link";
import ExportCsvButton from "@/components/dashboard/ExportCsvButton";
import GuestTable from "@/components/dashboard/GuestTable";
import HeadcountSummary from "@/components/dashboard/HeadcountSummary";
import ShareBar from "@/components/dashboard/ShareBar";
import { useGuests } from "@/hooks/useGuests";

/* Static placeholders until events come from a real store. */
const EVENT_TITLE = "Aarav and Meera's Reception";
const EVENT_DATE = "Monday, 14 December 2026 at 7:00 PM";

export default function DashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): ReactElement {
  const { eventId } = use(params);
  const inviteUrl = `https://getlifafa.co.in/i/${eventId}`;

  /*
    One source for the whole page. Every figure below is derived from this
    array, so a reply that lands in the store moves the headcount, the filter
    counts and the CSV together.
  */
  const guests = useGuests();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4 px-5 py-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Lifafa
          </Link>

          <div className="min-w-0 text-right">
            <p className="truncate text-[0.8125rem] font-medium text-[var(--lifafa-cream)] sm:text-sm">
              {EVENT_TITLE}
            </p>
            <p className="truncate text-xs text-[var(--lifafa-muted)]">
              {EVENT_DATE}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1100px] flex-col gap-8 px-5 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {/* Share the link, or take the list away with you. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            <ShareBar inviteUrl={inviteUrl} />
          </div>
          <ExportCsvButton guests={guests} eventId={eventId} />
        </div>

        <HeadcountSummary guests={guests} />
        <GuestTable guests={guests} />
      </main>
    </div>
  );
}
