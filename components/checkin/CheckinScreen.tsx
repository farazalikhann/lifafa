"use client";

import { useCallback, useState, type ReactElement } from "react";
import Link from "next/link";
import ArrivalCounter from "@/components/checkin/ArrivalCounter";
import CheckinResult from "@/components/checkin/CheckinResult";
import ManualLookup from "@/components/checkin/ManualLookup";
import ScannerFrame from "@/components/checkin/ScannerFrame";
import { tokenFromScan } from "@/lib/checkinPass";
import { checkInPass, setCheckedIn, type PassCheckIn } from "@/lib/db/guests";
import type { Guest } from "@/types/guest";

/**
 * The door screen: the count, the camera, and the guest list underneath.
 *
 * Seeded from the server's read, then owned here so a check-in shows at once.
 * The database stays the authority: every change is written first and the
 * local copy is replaced with the row that came back, so a refused or failed
 * write leaves the list showing the truth rather than an optimistic lie.
 *
 * A scan checks the guest in straight away — no confirm step, because at a
 * busy entrance a second tap per guest is a queue — and the result sits above
 * the camera while the camera keeps looking for the next pass. The event id
 * travels with every scan, so a pass for one of the host's other invitations
 * is turned away rather than checked in to the wrong day.
 *
 * The list works with the camera refused, broken or absent: it needs nothing
 * from the scanner and writes through the same host-scoped path.
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
  const [result, setResult] = useState<PassCheckIn | null>(null);
  const [error, setError] = useState<string | null>(loadError);
  /** A check-in is in flight; the scanner holds the next code until it lands. */
  const [busy, setBusy] = useState(false);

  const closeResult = useCallback((): void => {
    setResult(null);
  }, []);

  /** The database's copy of a guest, into the list — added if they replied after this page loaded. */
  const remember = useCallback((guest: Guest): void => {
    setGuests((previous) =>
      previous.some((candidate) => candidate.id === guest.id)
        ? previous.map((candidate) => (candidate.id === guest.id ? guest : candidate))
        : [...previous, guest],
    );
  }, []);

  const handleDecode = useCallback(
    (text: string): void => {
      setError(null);

      /* Not a Lifafa pass at all — a menu, a payment code — is simply not recognised. */
      const token = tokenFromScan(text);

      if (token === null) {
        setResult({ kind: "not_found" });
        return;
      }

      setBusy(true);

      void checkInPass(token, eventId)
        .then((outcome) => {
          if (!outcome.ok) {
            setError(outcome.error);
            return;
          }

          if (outcome.data.kind === "success" || outcome.data.kind === "already") {
            remember(outcome.data.guest);
          }

          setResult(outcome.data);
        })
        .catch((cause: unknown) => {
          console.error("[checkin] scan failed:", cause);
          setError("Could not check this pass, please try again.");
        })
        .finally(() => setBusy(false));
    },
    [eventId, remember],
  );

  const handleLookupCheckIn = useCallback(
    (guestId: string): void => {
      const guest = guests.find((candidate) => candidate.id === guestId);

      if (guest === undefined) {
        return;
      }

      if (guest.checkedIn) {
        setResult({ kind: "already", guest, eventId });
        return;
      }

      setError(null);
      setBusy(true);

      void setCheckedIn(guestId, true)
        .then((outcome) => {
          if (!outcome.ok) {
            setError(outcome.error);
            return;
          }

          remember(outcome.data);
          setResult({ kind: "success", guest: outcome.data, eventId });
        })
        .catch((cause: unknown) => {
          console.error("[checkin] manual check-in failed:", cause);
          setError("Could not update this guest, please try again.");
        })
        .finally(() => setBusy(false));
    },
    [guests, eventId, remember],
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

        {result !== null ? (
          <CheckinResult result={result} onClose={closeResult} />
        ) : null}

        <ScannerFrame onDecode={handleDecode} busy={busy} />

        <ManualLookup guests={guests} onCheckIn={handleLookupCheckIn} busy={busy} />
      </main>
    </div>
  );
}
