import type { ReactElement } from "react";
import PublishButton from "@/components/dashboard/PublishButton";
import { isRazorpayTestMode, razorpayKeyId } from "@/lib/razorpay/keys";
import { INVITATION_PRICE_INR, formatInr } from "@/lib/pricing";

/**
 * The unpaid state of one invitation, on that invitation's own dashboard.
 *
 * Renders nothing at all once the event is paid for: a paid host has no
 * decision left to make here, and a banner reading "you are fine" is a banner
 * they learn to scroll past.
 *
 * WHAT UNPAID MEANS NOW. It used to mean a watermark over a card guests could
 * still read. It now means guests cannot read the card at all — they get the
 * "not published yet" screen in components/invite/NotPublished.tsx — so the
 * sentence below says that instead. This is the more honest arrangement and
 * also the more consequential one, which is why the banner leads with it.
 *
 * STILL A SERVER COMPONENT. The price, the key in use and whether it is a test
 * key are all settled on the server; only the button needs state, and only the
 * button crosses. See components/dashboard/PublishButton.tsx.
 */
export default function PaymentBanner({
  isPaid,
  eventId,
}: {
  isPaid: boolean;
  /** Which invitation this publishes. The server action re-checks ownership. */
  eventId: string;
}): ReactElement | null {
  if (isPaid) {
    return null;
  }

  const configured = razorpayKeyId() !== null;

  return (
    <section
      aria-labelledby="payment-banner-heading"
      className="flex flex-col gap-4 rounded-2xl border border-[var(--lifafa-marigold)]/30 bg-[var(--lifafa-marigold)]/[0.06] px-5 py-4"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p
          id="payment-banner-heading"
          className="max-w-[52ch] text-sm leading-relaxed text-[var(--lifafa-cream)]"
        >
          This invitation is not published yet. Guests who open the link will be
          told it is not ready. Publish it for{" "}
          {formatInr(INVITATION_PRICE_INR)} to share it.
        </p>

        <div className="shrink-0">
          {configured ? (
            <PublishButton eventId={eventId} />
          ) : (
            /*
              No key, so no checkout to open. A disabled button that says why
              beats one that opens a window and fails — and this state is a
              misconfigured deployment, which is a thing for whoever set it up
              to read rather than a thing to hide.
            */
            <p className="text-xs text-[var(--lifafa-muted)]">
              Payments are not set up on this deployment.
            </p>
          )}
        </div>
      </div>

      <TestModeNote show={configured && isRazorpayTestMode()} />
    </section>
  );
}

/**
 * The line that stops a test payment being mistaken for a real one.
 *
 * READ FROM THE KEY, not from NODE_ENV or VERCEL_ENV. The key is what actually
 * decides whether money moves: a production deployment holding an rzp_test key
 * takes nothing, and a preview holding a live key takes real money. Deriving
 * this from the environment would be a guess about which key is in use; see
 * lib/razorpay/keys.ts.
 *
 * Deliberately loud. Everything else in this palette is a hint; this is the one
 * thing on the page that must not be skimmed past, because the mistake it
 * prevents is only discovered later, in a bank statement that is missing ₹999.
 */
function TestModeNote({ show }: { show: boolean }): ReactElement | null {
  if (!show) {
    return null;
  }

  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-3 py-2 text-xs font-medium text-[var(--lifafa-cream)]"
    >
      <span
        aria-hidden="true"
        className="rounded-full bg-[var(--lifafa-rose)] px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide text-[var(--lifafa-ink)]"
      >
        TEST MODE
      </span>
      No real money will be taken. This deployment uses a Razorpay test key.
    </p>
  );
}
