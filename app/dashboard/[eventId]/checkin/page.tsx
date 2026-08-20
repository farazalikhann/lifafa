"use client";

import { use, useCallback, useState, type ReactElement } from "react";
import Link from "next/link";
import ArrivalCounter from "@/components/checkin/ArrivalCounter";
import CheckinResult, {
  type ScanResult,
} from "@/components/checkin/CheckinResult";
import ManualLookup from "@/components/checkin/ManualLookup";
import ScannerFrame from "@/components/checkin/ScannerFrame";
import { MOCK_GUESTS } from "@/lib/mockGuests";
import type { Guest } from "@/types/guest";

/* Static placeholder until events come from a real store. */
const EVENT_TITLE = "Aarav and Meera's Reception";

export default function CheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}): ReactElement {
  const { eventId } = use(params);

  /* Seeded from the mock list, then owned here so check-ins are live. */
  const [guests, setGuests] = useState<readonly Guest[]>(MOCK_GUESTS);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const allCheckedIn = guests.every((guest) => guest.checkedIn);

  const closeResult = useCallback((): void => {
    setScanResult(null);
  }, []);

  /**
   * Marks a guest arrived. The timestamp is generated here in the handler, not
   * during render, so nothing depends on the clock while rendering.
   */
  const checkIn = useCallback((guestId: string): void => {
    const arrivedAt = new Date().toISOString();

    setGuests((previous) =>
      previous.map((guest) =>
        guest.id === guestId
          ? { ...guest, checkedIn: true, checkedInAt: arrivedAt }
          : guest,
      ),
    );
    setScanResult(null);
  }, []);

  const handleSimulateScan = useCallback((): void => {
    const next = guests.find((guest) => !guest.checkedIn);

    if (next === undefined) {
      return;
    }

    /* `next` is by definition not checked in yet. */
    setScanResult({ kind: "valid", guest: next });
  }, [guests]);

  const handleSimulateUnknown = useCallback((): void => {
    setScanResult({ kind: "notFound" });
  }, []);

  /** Tapping an arrived guest surfaces when they came in. */
  const handleLookupCheckIn = useCallback(
    (guestId: string): void => {
      const guest = guests.find((candidate) => candidate.id === guestId);

      if (guest === undefined) {
        return;
      }

      if (guest.checkedIn) {
        setScanResult({ kind: "already", guest });
        return;
      }

      checkIn(guestId);
    },
    [guests, checkIn],
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3 px-5 py-3">
          <Link
            href={`/dashboard/${eventId}`}
            className="min-h-11 shrink-0 rounded py-2 text-sm font-medium text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            &larr; Back to dashboard
          </Link>
          <p className="min-w-0 truncate text-right text-xs text-[var(--lifafa-muted)]">
            {EVENT_TITLE}
          </p>
        </div>
      </header>

      {/* Phone first by design — this is used one handed at a door. */}
      <main className="mx-auto flex max-w-[520px] flex-col gap-6 px-5 py-6">
        <ArrivalCounter guests={guests} />

        {scanResult !== null ? (
          <CheckinResult
            result={scanResult}
            onConfirm={checkIn}
            onClose={closeResult}
          />
        ) : null}

        <ScannerFrame
          onSimulateScan={handleSimulateScan}
          onSimulateUnknown={handleSimulateUnknown}
          allCheckedIn={allCheckedIn}
        />

        <ManualLookup guests={guests} onCheckIn={handleLookupCheckIn} />
      </main>
    </div>
  );
}
