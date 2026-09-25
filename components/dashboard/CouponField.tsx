"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { previewCoupon } from "@/lib/db/payments";
import { formatInr } from "@/lib/pricing";

/**
 * "Have a coupon?", above the publish button.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * WHAT THIS COMPONENT KNOWS ABOUT MONEY: nothing it was not told by the server,
 * and nothing anything downstream believes. It holds a code string and a price
 * to display. When the host publishes, PublishButton sends the CODE — not the
 * price shown here — and the server prices it again from the database.
 *
 * So the numbers on this screen are a preview in the strict sense: editing them
 * in devtools changes what this host reads and cannot change what they are
 * charged. That is a deliberate property of the shape, not an assurance about
 * this file: there is no path from here to the order amount at all.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * The applied code is lifted to the parent rather than kept here, because the
 * parent is what opens the checkout and it must send exactly the code that was
 * applied — not whatever is sitting in the input when the button is pressed.
 * Typing after applying clears the applied code for the same reason: a host who
 * edits the field has changed their mind, and publishing with a stale code
 * would charge a price the screen no longer shows.
 */

/** Paise to the rupee string the rest of the dashboard uses. */
function paiseToInr(paise: number): string {
  return formatInr(Math.round(paise / 100));
}

/** What the field has settled on, if anything. */
export interface AppliedCoupon {
  code: string;
  discountPaise: number;
  finalPaise: number;
}

export default function CouponField({
  eventId,
  applied,
  onApplied,
  /** True while the checkout is opening, so the field cannot be edited mid-flight. */
  locked,
}: {
  eventId: string;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
  locked: boolean;
}): ReactElement {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async (event: FormEvent): Promise<void> => {
    /*
      A nested <form> is impossible and this sits inside the banner, so the
      submit is on this element and prevented here. Keeping it a form at all is
      what makes Enter apply the code, which is what a host will press.
    */
    event.preventDefault();

    if (checking || code.trim().length === 0) {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const result = await previewCoupon(eventId, code);

      if (!result.ok) {
        onApplied(null);
        setError(result.error);
        return;
      }

      onApplied({
        code: result.code,
        discountPaise: result.discountPaise,
        finalPaise: result.finalPaise,
      });

      /* Shown back uppercase, as stored, so the host sees what was matched. */
      setCode(result.code);
    } catch (cause: unknown) {
      /*
        Caught as well as checked: a server action whose request never leaves
        the device rejects rather than returning a value, and without this the
        button would sit on "Checking…" for good.
      */
      console.error("[coupon] could not check the code:", cause);
      onApplied(null);
      setError("Could not check that code, please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleChange = (value: string): void => {
    setCode(value);
    setError(null);

    /*
      Any edit drops the applied code. See the note at the top: the price on
      screen and the code that will be sent must never disagree.
    */
    if (applied !== null) {
      onApplied(null);
    }
  };

  const handleRemove = (): void => {
    setCode("");
    setError(null);
    onApplied(null);
  };

  return (
    <form onSubmit={(event) => void handleApply(event)} className="w-full">
      <label
        htmlFor={`coupon-${eventId}`}
        className="block text-xs font-medium text-[var(--lifafa-muted)]"
      >
        Have a coupon?
      </label>

      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <input
          id={`coupon-${eventId}`}
          name="coupon"
          type="text"
          value={code}
          onChange={(event) => handleChange(event.target.value)}
          disabled={locked}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={32}
          placeholder="Enter code"
          aria-invalid={error !== null}
          aria-describedby={
            error !== null
              ? `coupon-${eventId}-error`
              : applied !== null
                ? `coupon-${eventId}-applied`
                : undefined
          }
          className="min-h-10 w-[11rem] rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-3 text-sm tracking-wide text-[var(--lifafa-cream)] uppercase placeholder:text-[var(--lifafa-muted)]/60 placeholder:normal-case focus:border-[var(--lifafa-marigold)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--lifafa-marigold)] disabled:opacity-50"
        />

        {applied === null ? (
          <button
            type="submit"
            disabled={checking || locked || code.trim().length === 0}
            aria-busy={checking}
            className="min-h-10 rounded-xl border border-[var(--lifafa-hairline)] px-3 text-xs font-semibold text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? "Checking…" : "Apply"}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleRemove}
            disabled={locked}
            className="min-h-10 rounded-xl px-2 text-xs font-medium text-[var(--lifafa-muted)] underline underline-offset-4 transition-colors hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {applied !== null ? (
        <p
          id={`coupon-${eventId}-applied`}
          role="status"
          className="mt-1.5 text-xs text-[var(--lifafa-marigold)]"
        >
          {applied.finalPaise === 0
            ? `${applied.code} applied. Your invitation is free.`
            : `${applied.code} applied: ${paiseToInr(applied.discountPaise)} off. You pay ${paiseToInr(applied.finalPaise)}.`}
        </p>
      ) : null}

      {error !== null ? (
        <p
          id={`coupon-${eventId}-error`}
          role="alert"
          className="mt-1.5 text-xs text-[var(--lifafa-rose)]"
        >
          {error}
        </p>
      ) : null}
    </form>
  );
}
