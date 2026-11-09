"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { previewCoupon } from "@/lib/db/payments";
import type { OfferBanner } from "@/lib/offers";
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
  offer = null,
}: {
  eventId: string;
  applied: AppliedCoupon | null;
  onApplied: (coupon: AppliedCoupon | null) => void;
  locked: boolean;
  /**
   * The offer to show over the field, or null. Only ever handed down by the
   * server while the offer is on and its code works (lib/coupons/offer.ts);
   * this component decides nothing about dates.
   */
  offer?: OfferBanner | null;
}): ReactElement {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* The offer's Apply was pressed: the banner gives way to the field it filled. */
  const [offerTaken, setOfferTaken] = useState(false);

  /** Asks the server what a code is worth here, and settles on it or says why not. */
  const apply = async (value: string): Promise<void> => {
    if (checking || value.trim().length === 0) {
      return;
    }

    setChecking(true);
    setError(null);

    try {
      const result = await previewCoupon(eventId, value);

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

  const handleApply = (event: FormEvent): void => {
    /*
      A nested <form> is impossible and this sits inside the banner, so the
      submit is on this element and prevented here. Keeping it a form at all is
      what makes Enter apply the code, which is what a host will press.
    */
    event.preventDefault();
    void apply(code);
  };

  /*
    The offer's Apply: the code goes into the field and is applied in the same
    tap, the way a host typing it and pressing Apply would. The banner goes at
    once, in the tap itself, so the field it filled takes its place without
    anything moving later; the price follows as it does for any code.
  */
  const handleOffer = (offered: OfferBanner): void => {
    setOfferTaken(true);
    setCode(offered.code);
    void apply(offered.code);
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
    setOfferTaken(false);
    onApplied(null);
  };

  /* Not once a code is applied, nor once its own Apply has been pressed. */
  const showOffer = offer !== null && applied === null && !offerTaken;

  return (
    <form onSubmit={handleApply} className="w-full">
      {showOffer ? (
        <OfferNote
          offer={offer}
          fieldId={`coupon-${eventId}`}
          disabled={checking || locked}
          onApply={() => handleOffer(offer)}
        />
      ) : null}

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
          className="min-h-10 w-[11rem] rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-3 text-sm tracking-wide text-[var(--lifafa-cream)] uppercase placeholder:text-[var(--lifafa-muted)] placeholder:normal-case focus:border-[var(--lifafa-marigold)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--lifafa-marigold)] disabled:opacity-50"
        />

        {applied === null ? (
          <button
            type="submit"
            disabled={checking || locked || code.trim().length === 0}
            aria-busy={checking}
            className="min-h-10 rounded-full border border-[var(--lifafa-hairline)] px-3 text-xs font-semibold text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:opacity-50"
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
      ) : offerTaken && checking ? (
        /*
          The line the answer will be written on, put there in the offer's tap,
          so the answer changes its words and not the height of the step: the
          price and the button under it do not move when the server replies.
        */
        <p role="status" className="mt-1.5 text-xs text-[var(--lifafa-muted)]">
          Applying {code}…
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

/**
 * The offer over the coupon field: its title, its line with the code picked
 * out, and an Apply that puts the code in the field and applies it.
 *
 * In the field's own palette and sizes (the card's hairline, the raised ink
 * of the input, the marigold of an applied code), so it reads as part of the
 * payment step and not as an advert over it. Drawn in the server's HTML when
 * the offer is on, so the page does not move when it loads.
 */
function OfferNote({
  offer,
  fieldId,
  disabled,
  onApply,
}: {
  offer: OfferBanner;
  /** The coupon input it fills, which a screen reader is pointed to. */
  fieldId: string;
  disabled: boolean;
  onApply: () => void;
}): ReactElement {
  const titleId = `${fieldId}-offer`;
  /* The code in bold where the line says it; the line itself is the offer's. */
  const [before, after] = offer.text.includes(offer.code)
    ? offer.text.split(offer.code, 2)
    : [offer.text, null];

  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="mb-3 flex items-center gap-3 rounded-xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-ink-raised)] px-3 py-2.5"
    >
      <div className="min-w-0 flex-1">
        <p id={titleId} className="text-xs font-semibold text-[var(--lifafa-marigold)]">
          {offer.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--lifafa-cream)]">
          {before}
          {after === null ? null : (
            <>
              <span className="font-semibold tracking-wide">{offer.code}</span>
              {after}
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        aria-controls={fieldId}
        aria-label={`Apply ${offer.code}`}
        className="min-h-10 shrink-0 rounded-full border border-[var(--lifafa-marigold)] px-4 text-xs font-semibold text-[var(--lifafa-marigold)] transition-colors duration-150 hover:bg-[var(--lifafa-marigold)]/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  );
}
