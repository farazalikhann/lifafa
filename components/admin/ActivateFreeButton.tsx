"use client";

import { useId, useState, type FormEvent, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { activateEventForFree } from "@/app/admin/events/actions";
import {
  COMPLIMENTARY_REASON_MAX_LENGTH,
  COMPLIMENTARY_REASON_SUGGESTIONS,
} from "@/lib/admin/complimentary";

/**
 * "Activate for free", with an inline confirmation that asks for a reason.
 *
 * No browser confirm(): pressing the button opens the reason box and a Confirm
 * beside it, so giving an invitation away is always two deliberate steps. The
 * server checks the admin session and the reason again; see
 * activateEventForFree in app/admin/events/actions.ts.
 */

const PRIMARY =
  "min-h-10 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-400";

const SECONDARY =
  "min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50";

type Phase =
  | { kind: "idle" }
  | { kind: "confirming" }
  | { kind: "saving" }
  | { kind: "done" };

export default function ActivateFreeButton({
  eventId,
}: {
  eventId: string;
}): ReactElement {
  const router = useRouter();
  const id = useId();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    if (phase.kind === "saving" || reason.trim().length === 0) {
      return;
    }

    setPhase({ kind: "saving" });
    setError(null);

    try {
      const result = await activateEventForFree(eventId, reason);

      if (!result.ok) {
        setError(result.error);
        setPhase({ kind: "confirming" });
        return;
      }
    } catch (cause: unknown) {
      console.error("[admin] could not activate for free:", cause);
      setError("Could not activate this event. Please try again.");
      setPhase({ kind: "confirming" });
      return;
    }

    setPhase({ kind: "done" });
    router.refresh();
  };

  if (phase.kind === "done") {
    return (
      <p role="status" className="text-sm font-medium text-green-700">
        Activated for free.
      </p>
    );
  }

  if (phase.kind === "idle") {
    return (
      <button
        type="button"
        onClick={() => setPhase({ kind: "confirming" })}
        className={SECONDARY}
      >
        Activate for free
      </button>
    );
  }

  const saving = phase.kind === "saving";

  return (
    <form
      onSubmit={(event) => void handleConfirm(event)}
      className="flex max-w-md flex-col gap-2 rounded-md border border-zinc-300 bg-zinc-50 p-3"
    >
      <label htmlFor={`${id}-reason`} className="text-sm font-medium">
        Reason
      </label>
      <input
        id={`${id}-reason`}
        type="text"
        list={`${id}-suggestions`}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        maxLength={COMPLIMENTARY_REASON_MAX_LENGTH}
        required
        autoFocus
        disabled={saving}
        placeholder="Friend, Testing, Influencer…"
        aria-describedby={`${id}-note`}
        aria-invalid={error !== null}
        className="min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900"
      />
      <datalist id={`${id}-suggestions`}>
        {COMPLIMENTARY_REASON_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <p id={`${id}-note`} className="text-xs text-zinc-500">
        The invitation becomes active straight away and guests can open it. It
        is recorded as a ₹0 complimentary payment with this reason and your
        name.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={saving || reason.trim().length === 0}
          aria-busy={saving}
          className={PRIMARY}
        >
          {saving ? "Activating…" : "Confirm free activation"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setPhase({ kind: "idle" });
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
    </form>
  );
}
