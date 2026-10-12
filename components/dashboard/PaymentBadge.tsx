import type { ReactElement } from "react";

/**
 * Whether one invitation has been paid for, said in a word.
 *
 * One component rather than a span in each place, because the list and the
 * single event page must never disagree about what "paid" looks like — and
 * because payment is the thing this product will eventually charge for, so the
 * two words a host reads about it are worth keeping in one file.
 *
 * The state is read from events.is_paid, which is false on every row today. The
 * badge is therefore almost always "Not paid yet", and that is the honest
 * reading rather than a bug: nothing here pretends a payment has happened.
 *
 * No green. The palette has a marigold and a rose and nothing else with a
 * meaning attached, so paid is the marigold — the colour the product already
 * uses for "done, good" — and unpaid is muted rather than alarming. An unpaid
 * invitation is not broken; it simply carries a watermark.
 */
export default function PaymentBadge({
  isPaid,
  underReview = false,
}: {
  isPaid: boolean;
  /**
   * The host has paid and the payment is being checked by a person
   * (lib/paymentReview.ts). Never "Not paid yet": they have paid.
   */
  underReview?: boolean;
}): ReactElement {
  if (!isPaid && underReview) {
    return (
      <span className="shrink-0 rounded-full border border-[var(--lifafa-marigold)]/40 px-2.5 py-1 text-xs font-medium text-[var(--lifafa-cream)]">
        Verifying payment
      </span>
    );
  }

  return isPaid ? (
    <span className="shrink-0 rounded-full border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/10 px-2.5 py-1 text-xs font-medium text-[var(--lifafa-marigold)]">
      Paid
    </span>
  ) : (
    <span className="shrink-0 rounded-full border border-[var(--lifafa-hairline)] px-2.5 py-1 text-xs font-medium text-[var(--lifafa-muted)]">
      Not paid yet
    </span>
  );
}
