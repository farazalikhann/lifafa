"use client";

import { useCallback, useState, type ReactElement } from "react";
import Link from "next/link";
import ArrivalCounter from "@/components/checkin/ArrivalCounter";
import CheckinResult, {
  type ScanResult,
} from "@/components/checkin/CheckinResult";
import ManualLookup from "@/components/checkin/ManualLookup";
import ScannerFrame from "@/components/checkin/ScannerFrame";
import { setCheckedIn } from "@/lib/db/guests";
import type { Guest } from "@/types/guest";

/**
 * The door screen.
 *
 * Seeded from the server's read, then owned here so a check-in shows instantly.
 * The database is still the authority: the row is written first and the local
 * copy is replaced with whatever came back, so a refused or failed write leaves
 * the list showing the truth rather than an optimistic lie.
 */
export default function CheckinScreen({
  eventId,
  eventTitle,
  initialGuests,
  loadError,
}: {
  eventId: string;
  eventTitle: string;
  initialGuests: readonly Guest[];
  loadError: string | null;
}): ReactElement {
  const [guests, setGuests] = useState<readonly Guest[]>(initialGuests);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(loadError);

  const allCheckedIn = guests.every((guest) => guest.checkedIn);

  const closeResult = useCallback((): void => {
    setScanResult(null);
  }, []);

  /**
   * Marks a guest arrived.
   *
   * The timestamp is set by the database call in the same statement as the
   * flag, so the two cannot disagree — nothing here reads the clock.
   */
  const checkIn = useCallback((guestId: string): void => {
    setError(null);
    setScanResult(null);

    void setCheckedIn(guestId, true)
      .then((result) => {
        if (!result.ok) {
          setError(result.error);
          return;
        }

        setGuests((previous) =>
          previous.map((guest) =>
            guest.id === result.data.id ? result.data : guest,
          ),
        );
      })
      .catch((cause: unknown) => {
        console.error("[checkin] failed:", cause);
        setError("Could not update this guest, please try again.");
      });
  }, []);

  const handleSimulateScan = useCallback((): void => {
    const next = guests.find((guest) => !guest.checkedIn);

    if (next === undefined) {
      return;
    }

    setScanResult({ kind: "valid", guest: next });
  }, [guests]);

  const handleSimulateUnknown = useCallback((): void => {
    setScanResult({ kind: "notFound" });
  }, []);

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
            {eventTitle}
          </p>
        </div>
      </header>

      {/* Phone first by design — this is used one handed at a door. */}
      <main className="mx-auto flex max-w-[520px] flex-col gap-6 px-5 py-6">
        {error !== null ? (
          <p
            role="alert"
            className="rounded-2xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-4 py-3 text-sm text-[var(--lifafa-cream)]"
          >
            {error}
          </p>
        ) : null}

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
