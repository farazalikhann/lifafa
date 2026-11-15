import type { ReactElement } from "react";
import Link from "next/link";
import PaymentBanner from "@/components/dashboard/PaymentBanner";
import LegalFooter from "@/components/legal/LegalFooter";
import WizardProgress from "@/components/wizard/WizardProgress";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { getTemplate, templatePricePaise } from "@/templates/registry";
import type { StoredEvent } from "@/types/database";
import Logo from "@/components/Logo";
import SaveTimingReport from "@/components/wizard/SaveTimingReport";
import PayCardPreview from "@/components/wizard/PayCardPreview";
import PayPageShown from "@/components/wizard/PayPageShown";
import { LOGIN_PLACEHOLDERS } from "@/lib/loginPlaceholders";

/**
 * The end of the wizard, "Your card is ready": the payment page of a card
 * just saved. Reached straight after "Crafting your card…" (the crafting
 * screen goes once this page is here under it, PayPageShown).
 *
 * The card, its price, the coupon field and one main button, "Pay ₹699 and
 * share with your guests" (₹999 on a Premium design: the template's own
 * price, templatePricePaise). The payment is the dashboard's own
 * PaymentBanner and PublishButton: the same coupon field, the same order and
 * Razorpay window, the same webhook behind it. Nothing here is a second way
 * to pay. "Go to my dashboard" is there for a host who pays later.
 *
 * A server component, drawn from the row that was just written, at
 * /create?step=preview&event=<id>, so a reload stays on it and the card is not
 * saved twice. A card already paid for never reaches it: the page sends it to
 * its dashboard (app/create/page.tsx).
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
  const template = getTemplate(event.config.templateId);
  const namesLine = names.kind === "line" && names.isPlaceholder ? null : coverNameLine(names);

  return (
    <div className="min-h-screen">
      {/* Finishes the save clock, if this card was just saved here. */}
      <SaveTimingReport eventId={event.id} />
      {/* The crafting screen can go now; Clarity pay_page_shown. */}
      <PayPageShown eventId={event.id} />
      <header className="border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]">
        <div className="mx-auto max-w-2xl px-4 pt-2.5 pb-1 sm:px-5">
          <WizardProgress
            brand={
              <Link
                href="/"
                className="inline-flex items-center rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                <Logo compact />
              </Link>
            }
            current="preview"
            done
          />
        </div>
      </header>

      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 pt-6 pb-16 sm:px-5 lg:pt-10">
        <div className="flex min-w-0 flex-col items-center gap-1.5 text-center">
          <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] leading-tight font-semibold tracking-[-0.015em] text-balance text-[var(--lifafa-cream)]">
            Your card is ready
          </h1>
          {namesLine === null ? null : (
            <p
              data-clarity-mask="true"
              className="text-[0.9375rem] leading-relaxed break-words text-[var(--lifafa-muted)]"
            >
              {namesLine}
            </p>
          )}
        </div>

        <PayCardPreview
          draft={event.draft}
          config={event.config}
          placeholder={LOGIN_PLACEHOLDERS[template.id] ?? null}
          label={namesLine === null ? `Your ${template.name} card` : `Your card: ${namesLine}`}
        />

        <PaymentBanner
          isPaid={event.isPaid}
          eventId={event.id}
          pricePaise={templatePricePaise(event.config.templateId)}
          templateId={template.id}
          underReview={underReview}
          variant="checkout"
        />

        <Link
          href={`/dashboard/${event.id}`}
          className="mx-auto inline-flex min-h-11 items-center rounded px-3 text-sm font-medium text-[var(--lifafa-muted)] underline underline-offset-4 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Go to my dashboard
        </Link>
      </main>

      <LegalFooter />
    </div>
  );
}
