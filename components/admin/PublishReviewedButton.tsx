"use client";

import { useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { publishReviewedPaymentAction } from "@/app/admin/payments/actions";

/**
 * "Publish event", for a payment under review, in two deliberate steps.
 *
 * No browser confirm(), as with ActivateFreeButton: the first press asks, the
 * second publishes. The server checks the admin session and that the row is
 * still under review; see app/admin/payments/actions.ts.
 */

const PRIMARY =
  "min-h-10 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-400";

const SECONDARY =
  "min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50";

type Phase = "idle" | "confirming" | "saving" | "done";

export default function PublishReviewedButton({
  paymentRowId,
  alreadyLive,
}: {
  paymentRowId: string;
  /** The invitation is live already; the press only settles the payment's row. */
  alreadyLive: boolean;
}): ReactElement {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (): Promise<void> => {
    if (phase === "saving") {
      return;
    }

    setPhase("saving");
    setError(null);

    try {
      const result = await publishReviewedPaymentAction(paymentRowId);

      if (!result.ok) {
        setError(result.error);
        setPhase("confirming");
        return;
      }
    } catch (cause: unknown) {
      console.error("[admin] could not publish the reviewed payment:", cause);
      setError("Could not publish this invitation. Please try again.");
      setPhase("confirming");
      return;
    }

    setPhase("done");
    router.refresh();
  };

  if (phase === "done") {
    return (
      <p role="status" className="text-sm font-medium text-green-700">
        {alreadyLive ? "Marked as settled." : "Published."}
      </p>
    );
  }

  if (phase === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase("confirming")}
        className={PRIMARY}
      >
        {alreadyLive ? "Mark as settled" : "Publish event"}
      </button>
    );
  }

  const saving = phase === "saving";

  return (
    <div className="flex max-w-md flex-col gap-2 rounded-md border border-zinc-300 bg-zinc-50 p-3">
      <p className="text-sm text-zinc-700">
        {alreadyLive
          ? "The invitation is already live. This records the payment as paid and takes it off this list."
          : "The invitation becomes active straight away and guests can open it. The payment is recorded as paid, as it stands."}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={saving}
          aria-busy={saving}
          onClick={() => void handleConfirm()}
          className={PRIMARY}
        >
          {saving
            ? "Publishing…"
            : alreadyLive
              ? "Confirm"
              : "Confirm and publish"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setPhase("idle");
            setError(null);
          }}
          className={SECONDARY}
        >
          Cancel
        </button>
      </div>

      {error !== null ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
