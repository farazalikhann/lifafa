import type { ReactElement } from "react";

/** Wired to nothing, deliberately. See the note below. */
const PRICE = "₹999";

/**
 * The unpaid state of one invitation, on that invitation's own dashboard.
 *
 * Renders nothing at all once the event is paid for: a paid host has no
 * decision left to make here, and a banner reading "you are fine" is a banner
 * they learn to scroll past.
 *
 * WHY THE BUTTON DOES NOTHING. There is no payment in Lifafa yet — no gateway,
 * no order, no webhook, no place for ₹999 to go. The structure and the sentence
 * are built now because the watermark on the guest's card is already real and a
 * host meeting it deserves to be told why, in the same words they will later be
 * charged in. A button that opened a half-built checkout would be worse than a
 * disabled one that says so.
 *
 * The price is stated in the button rather than only in the sentence, because a
 * host reading "until you pay" should not have to go and find out how much.
 *
 * A server component: nothing here is interactive, and the day it becomes so is
 * the day the checkout exists to make it so.
 */
export default function PaymentBanner({
  isPaid,
}: {
  isPaid: boolean;
}): ReactElement | null {
  if (isPaid) {
    return null;
  }

  return (
    <section
      aria-labelledby="payment-banner-heading"
      className="flex flex-col gap-4 rounded-2xl border border-[var(--lifafa-marigold)]/30 bg-[var(--lifafa-marigold)]/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <p
        id="payment-banner-heading"
        className="max-w-[52ch] text-sm leading-relaxed text-[var(--lifafa-cream)]"
      >
        This invitation is not paid for yet. Guests will see a watermark until
        you pay.
      </p>

      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          disabled
          /*
            A disabled button is not focusable, so `title` would never be
            announced. The "Coming soon" text beside it is a real element with
            an id, which is what aria-describedby needs to reach it in the
            reading order a screen reader browses in.
          */
          aria-describedby="payment-banner-status"
          className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] opacity-50"
        >
          Pay {PRICE}
        </button>
        <span
          id="payment-banner-status"
          className="text-xs font-medium whitespace-nowrap text-[var(--lifafa-muted)]"
        >
          Coming soon
        </span>
      </div>
    </section>
  );
}
