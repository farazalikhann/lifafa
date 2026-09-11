"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import Link from "next/link";
import CheckinResult from "@/components/checkin/CheckinResult";
import { checkInPass, type PassCheckIn } from "@/lib/db/guests";

type Outcome =
  | { kind: "pending" }
  | { kind: "done"; result: PassCheckIn }
  | { kind: "failed"; error: string };

const LINK_CLASS =
  "flex min-h-12 items-center justify-center rounded-xl border border-[var(--lifafa-hairline)] px-4 text-sm font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

/**
 * Checks one pass in, once, and shows what happened.
 *
 * The write is the checkInPass server action, sent from an effect after the
 * page is on screen. Sent exactly once per attempt: React runs effects twice
 * in development, and a second send would check the guest in and then report
 * them as already in — a door that seems to contradict itself.
 */
export default function PassCheckin({ token }: { token: string }): ReactElement {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "pending" });
  /** Bumped by Try again after a failure. */
  const [attempt, setAttempt] = useState(0);
  const sentRef = useRef<number | null>(null);

  useEffect(() => {
    if (sentRef.current === attempt) {
      return;
    }

    sentRef.current = attempt;
    setOutcome({ kind: "pending" });

    void checkInPass(token)
      .then((result) =>
        setOutcome(
          result.ok
            ? { kind: "done", result: result.data }
            : { kind: "failed", error: result.error },
        ),
      )
      .catch((cause: unknown) => {
        console.error("[checkin] pass page failed:", cause);
        setOutcome({
          kind: "failed",
          error: "Could not check this pass, please try again.",
        });
      });
  }, [token, attempt]);

  const eventId =
    outcome.kind === "done" &&
    (outcome.result.kind === "success" || outcome.result.kind === "already")
      ? outcome.result.eventId
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-[520px] flex-col justify-center gap-6 px-5 py-10">
      <p className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
        Guest check-in
      </p>

      {outcome.kind === "pending" ? (
        <p role="status" className="text-lg text-[var(--lifafa-cream)]">
          Checking this pass…
        </p>
      ) : null}

      {outcome.kind === "done" ? <CheckinResult result={outcome.result} /> : null}

      {outcome.kind === "failed" ? (
        <div className="flex flex-col gap-4">
          <p
            role="alert"
            className="rounded-2xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-4 py-3 text-sm text-[var(--lifafa-cream)]"
          >
            {outcome.error}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((count) => count + 1)}
            className={LINK_CLASS}
          >
            Try again
          </button>
        </div>
      ) : null}

      {outcome.kind === "done" ? (
        <div className="flex flex-col gap-3">
          {eventId !== null ? (
            <>
              <Link href={`/dashboard/${eventId}/checkin`} className={LINK_CLASS}>
                Open the scanner for the next guest
              </Link>
              <Link href={`/dashboard/${eventId}`} className={LINK_CLASS}>
                Guest list
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className={LINK_CLASS}>
              Your invitations
            </Link>
          )}
        </div>
      ) : null}
    </main>
  );
}
