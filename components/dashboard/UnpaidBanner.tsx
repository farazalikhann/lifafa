import type { ReactElement } from "react";
import Link from "next/link";
import { wizardStepPath } from "@/lib/wizardSteps";

/**
 * At the top of the host's list of invitations (app/dashboard/page.tsx), one
 * for each invitation not paid for yet: the card is ready, and paying is what
 * shares it.
 *
 * "Complete payment" opens that card's payment page, "Your card is ready"
 * (/create?step=preview&event=<id>, components/wizard/WizardSaved.tsx): the
 * same coupon field, order and Razorpay window as the invitation's own
 * dashboard. Nothing here is a second way to pay, and a card paid for
 * meanwhile is sent from that page to its dashboard (app/create/page.tsx).
 *
 * Not for a card whose payment is being checked by a person: its row says so
 * (PaymentBadge), and there is nothing left to pay.
 */
export default function UnpaidBanner({
  eventId,
  name,
}: {
  eventId: string;
  /** Which card, when the host has more than one waiting; null says nothing more. */
  name: string | null;
}): ReactElement {
  return (
    <section
      aria-label={name === null ? "Payment" : `Payment for ${name}`}
      data-unpaid-banner=""
      className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-marigold)]/[0.08] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <div className="min-w-0">
        <p className="text-[0.9375rem] leading-relaxed font-medium text-pretty text-[var(--lifafa-cream)]">
          Your card is ready. Complete payment to share it with your guests.
        </p>
        {name === null ? null : (
          <p
            data-clarity-mask="true"
            className="mt-0.5 truncate text-sm text-[var(--lifafa-muted)]"
          >
            {name}
          </p>
        )}
      </div>

      <Link
        href={`${wizardStepPath("preview")}&event=${encodeURIComponent(eventId)}`}
        prefetch={false}
        className="flex min-h-11 shrink-0 items-center justify-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.875rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        Complete payment
      </Link>
    </section>
  );
}
