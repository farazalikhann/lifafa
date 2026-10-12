import type { ReactElement } from "react";
import Link from "next/link";
import PaymentBanner from "@/components/dashboard/PaymentBanner";
import WizardProgress from "@/components/wizard/WizardProgress";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { templatePricePaise } from "@/templates/registry";
import type { StoredEvent } from "@/types/database";

const LINK_CLASS =
  "flex min-h-12 items-center justify-center rounded-full border border-[var(--lifafa-hairline)] px-5 text-[0.9375rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

/**
 * The end of the wizard: the card is saved, and this is where it is paid for.
 *
 * A server component, drawn from the row that was just written, and the
 * payment is the dashboard's own PaymentBanner: the same button, the same
 * coupon field, the same order and webhook behind it. Nothing here is a second
 * way to pay.
 *
 * Reached at /create?step=preview&event=<id>, so a reload stays on it
 * and the card is not saved twice. The steps are no longer open from here: the
 * card is a saved invitation now, and changing it is the editor's job.
 */
export default function WizardSaved({
  event,
  underReview = false,
}: {
  event: StoredEvent;
  /** A payment for it is being verified; see lib/paymentReview.ts. */
  underReview?: boolean;
}): ReactElement {
  const names = resolveCoverNames(
    event.draft,
    event.config.occasionId,
    event.config.language,
  );

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]">
        <div className="mx-auto max-w-2xl px-4 pt-2.5 pb-1 sm:px-5">
          <WizardProgress
            brand={
              <Link
                href="/"
                className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                Lifafa
              </Link>
            }
            current="preview"
            done
          />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-5 lg:pt-10">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.01em] text-balance text-[var(--lifafa-cream)]">
            Your invitation is saved
          </h1>
          <p className="text-[0.9375rem] leading-relaxed break-words text-[var(--lifafa-muted)]">
            {coverNameLine(names)}
          </p>
        </div>

        <PaymentBanner
          isPaid={event.isPaid}
          eventId={event.id}
          pricePaise={templatePricePaise(event.config.templateId)}
          underReview={underReview}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          {/* The host's own preview of the real link, watermarked until it is published. */}
          <Link href={`/i/${event.inviteCode}`} className={LINK_CLASS}>
            Open my invitation
          </Link>
          <Link href={`/dashboard/${event.id}/edit`} className={LINK_CLASS}>
            Edit it
          </Link>
          <Link href={`/dashboard/${event.id}`} className={LINK_CLASS}>
            Go to my dashboard
          </Link>
        </div>

        {underReview ? null : (
          <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
            You can also publish later from your dashboard. Your invitation and
            everything in it is kept.
          </p>
        )}
      </main>
    </div>
  );
}
