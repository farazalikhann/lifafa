import type { ReactElement } from "react";
import Link from "next/link";
import GuestTable from "@/components/dashboard/GuestTable";
import HeadcountSummary from "@/components/dashboard/HeadcountSummary";
import ShareBar from "@/components/dashboard/ShareBar";
import { MOCK_GUESTS } from "@/lib/mockGuests";

/* Static placeholders until events come from a real store. */
const EVENT_TITLE = "Aarav and Meera's Reception";
const EVENT_DATE = "Monday, 14 December 2026 at 7:00 PM";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): Promise<ReactElement> {
  const { eventId } = await params;
  const inviteUrl = `https://getlifafa.co.in/i/${eventId}`;

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
        <ShareBar inviteUrl={inviteUrl} />
        <HeadcountSummary guests={MOCK_GUESTS} />
        <GuestTable guests={MOCK_GUESTS} />
      </main>
    </div>
  );
}
