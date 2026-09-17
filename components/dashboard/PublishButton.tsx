"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { useRouter } from "next/navigation";
import { createPaymentOrder } from "@/lib/db/payments";
import CouponField, {
  type AppliedCoupon,
} from "@/components/dashboard/CouponField";
import { INVITATION_PRICE_INR, formatInr } from "@/lib/pricing";
import type { RazorpayFailure } from "@/types/razorpay";

/**
 * Razorpay's checkout, loaded from Razorpay's own domain.
 *
 * The only supported way to open a checkout, and the reason no browser SDK
 * package is added: a wrapper on npm would still be fetching this same file at
 * runtime, while adding a dependency that can drift out of step with it.
 */
const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * How long to wait before admitting the webhook has not landed yet.
 *
 * The success callback fires the moment Razorpay's page is satisfied; the
 * webhook is a separate delivery over the public internet and usually arrives
 * within a second or two, but "usually" is not "always". This is how long the
 * button waits after refreshing before it stops saying "confirming" and offers
 * a way to check again.
 */
const CONFIRM_GRACE_MS = 4000;

/**
 * Loads checkout.js once per page, whatever asks for it.
 *
 * Module scope, not component state: a host who dismisses a checkout and opens
 * another should not download the script twice, and two buttons on one page
 * should not race to append two tags. The promise is the cache — a second
 * caller during the first load awaits the same one.
 *
 * Reset to null on failure, so a load that failed because the network was down
 * for a moment can be retried rather than cached as broken forever.
 */
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay !== undefined) {
    return Promise.resolve();
  }

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Could not load the payment window."));
    };
    document.body.append(script);
  });

  return scriptPromise;
}

/**
 * Everything the button can be showing. One union rather than four booleans,
 * because several of these are mutually exclusive and a pair of booleans is
 * how a screen ends up both "paying" and "failed" at once.
 */
type Phase =
  | { kind: "idle" }
  /** The server action is making an order. */
  | { kind: "starting" }
  /** Razorpay's window is open over the page. */
  | { kind: "open" }
  /** Paid, and waiting for the webhook to say so. */
  | { kind: "confirming" }
  /** Paid, refreshed, and still not published. The webhook is late. */
  | { kind: "pending" }
  /** Closed without paying. Not an error — say so gently. */
  | { kind: "dismissed" }
  /** Anything that went wrong, with a sentence for the host. */
  | { kind: "failed"; message: string };

/**
 * "Publish for ₹999", and everything that can happen after it is pressed.
 *
 * A CLIENT COMPONENT INSIDE A SERVER-RENDERED BANNER, on the same pattern as
 * DeleteEventButton: PaymentBanner stays a server component and only this
 * control crosses, because only this control needs state.
 *
 * IT NEVER MARKS ANYTHING PAID. createPaymentOrder makes an order; Razorpay
 * takes the money; the webhook publishes the invitation. This component's
 * success path calls router.refresh() and nothing else — see the note at the
 * top of app/api/razorpay/webhook/route.ts for why the browser is not allowed
 * a say in it.
 *
 * NO PATH ENDS ON A BLANK SCREEN, which is the whole reason Phase has six
 * members rather than two. A dismissed checkout, a declined card, a script that
 * would not load, a webhook that is late: each has its own sentence and each
 * leaves the host a way forward. The button is never left spinning at something
 * that has already finished.
 */
export default function PublishButton({
  eventId,
}: {
  eventId: string;
}): ReactElement {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  /*
    The applied coupon, held here rather than inside CouponField, because this
    is the component that opens the checkout and it must send exactly the code
    that was applied. A code still being typed is not an applied code.
  */
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);

  /*
    Whether this component is still on screen. A successful payment refreshes
    the page, which unmounts this — and the grace timer below would otherwise
    call setState on a component that is gone.
  */
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const handleClick = useCallback(async (): Promise<void> => {
    setPhase({ kind: "starting" });

    /*
      The order first, the script second, and both before the window opens.
      Loading the script while the order is still being created would open a
      checkout with nothing to pay for.
    */
    /*
      THE CODE, NOT THE PRICE. `coupon.finalPaise` is on this component's state
      and is never sent anywhere — it exists to render a number. The server
      reads the coupon row again and prices the order itself; see the note on
      createPaymentOrder.
    */
    const result = await createPaymentOrder(eventId, coupon?.code ?? null);

    if (!result.ok) {
      setPhase({ kind: "failed", message: result.error });
      return;
    }

    try {
      await loadCheckoutScript();
    } catch {
      setPhase({
        kind: "failed",
        message:
          "Could not open the payment window. Check your connection and try again.",
      });
      return;
    }

    const Checkout = window.Razorpay;

    /*
      The script loaded and the global is still not there. Should not happen,
      and "should not happen" is exactly the case that leaves a host staring at
      a button that did nothing.
    */
    if (Checkout === undefined) {
      setPhase({
        kind: "failed",
        message: "Could not open the payment window. Please try again.",
      });
      return;
    }

    const checkout = new Checkout({
      key: result.data.keyId,
      amount: result.data.amount,
      currency: result.data.currency,
      name: "Lifafa",
      description: "Publish your invitation",
      order_id: result.data.orderId,
      theme: { color: "#E8B54D" },
      handler: () => {
        /*
          Razorpay says the payment went through. That is a claim by this
          browser, so the only thing done with it is to go and ask the server.

          The refresh is fired immediately and the phase is set to "confirming"
          rather than "paid": if the webhook has already landed, the refreshed
          page comes back with the banner gone and this component unmounted. If
          it has not, the grace timer below moves to "pending" and the host is
          told plainly that the money arrived and the confirmation has not.
        */
        setPhase({ kind: "confirming" });
        router.refresh();

        window.setTimeout(() => {
          if (mounted.current) {
            setPhase({ kind: "pending" });
          }
        }, CONFIRM_GRACE_MS);
      },
      modal: {
        ondismiss: () => {
          /*
            Closed without paying. Not a failure and not worded as one — a host
            comparing prices, or fetching a different card, should not be told
            something went wrong.
          */
          setPhase({ kind: "dismissed" });
        },
      },
    });

    checkout.on("payment.failed", (failure: RazorpayFailure) => {
      /*
        Razorpay's own description when there is one: "card declined" or
        "insufficient funds" is more use than anything this component could
        invent, and the host is the one who has to act on it.
      */
      const described = failure.error?.description;

      setPhase({
        kind: "failed",
        message:
          described !== undefined && described.length > 0
            ? `${described} No money has been taken — you can try again.`
            : "The payment did not go through. No money has been taken — you can try again.",
      });
    });

    setPhase({ kind: "open" });
    checkout.open();
  }, [coupon, eventId, router]);

  const busy = phase.kind === "starting" || phase.kind === "open";

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      {/*
        Above the button, and hidden once there is nothing left to decide. A
        coupon field beside a checkout that has already been paid is a field
        offering to change a price that is settled.
      */}
      {phase.kind === "confirming" || phase.kind === "pending" ? null : (
        <div className="w-full sm:max-w-[18rem]">
          <CouponField
            eventId={eventId}
            applied={coupon}
            onApplied={setCoupon}
            locked={busy}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy || phase.kind === "confirming"}
        className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-50"
      >
        {buttonLabel(phase, coupon)}
      </button>

      <StatusLine phase={phase} onCheckAgain={() => router.refresh()} />
    </div>
  );
}

/**
 * What the button itself says.
 *
 * The price on it follows the applied coupon, because a button reading "Publish
 * for ₹999" above a line reading "you pay ₹499" is a button that contradicts
 * the screen it is on. It is still only a label: the figure charged is computed
 * server side from the code, never from this.
 */
function buttonLabel(phase: Phase, coupon: AppliedCoupon | null): string {
  const price = formatInr(
    coupon === null
      ? INVITATION_PRICE_INR
      : Math.round(coupon.finalPaise / 100),
  );

  switch (phase.kind) {
    case "starting":
      return "Starting…";
    case "open":
      return "Payment window open";
    case "confirming":
      return "Confirming…";
    case "dismissed":
    case "failed":
      /* A retry, and labelled as one, so the price is still in view. */
      return `Try again — ${price}`;
    case "pending":
    case "idle":
      return `Publish for ${price}`;
  }
}

/**
 * The sentence under the button.
 *
 * `role="status"` rather than `role="alert"`: these are progress reports, and
 * an alert interrupts whatever a screen reader is saying. The failed case is
 * the one that genuinely interrupts, so it is the one that gets `alert`.
 */
function StatusLine({
  phase,
  onCheckAgain,
}: {
  phase: Phase;
  onCheckAgain: () => void;
}): ReactElement | null {
  if (phase.kind === "idle" || phase.kind === "starting" || phase.kind === "open") {
    return null;
  }

  if (phase.kind === "confirming") {
    return (
      <p role="status" className="max-w-[40ch] text-xs text-[var(--lifafa-muted)]">
        Payment received. Confirming…
      </p>
    );
  }

  if (phase.kind === "pending") {
    /*
      The money arrived and the webhook has not. Said plainly, with the one
      thing the host can do about it, because the alternative is a host who
      paid and is looking at a page that still says they have not.
    */
    return (
      <div className="flex max-w-[44ch] flex-col items-start gap-1 sm:items-end">
        <p role="status" className="text-xs text-[var(--lifafa-muted)]">
          Payment received. Publishing can take a few seconds.
        </p>
        <button
          type="button"
          onClick={onCheckAgain}
          className="text-xs font-medium text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Check again
        </button>
      </div>
    );
  }

  if (phase.kind === "dismissed") {
    return (
      <p role="status" className="max-w-[40ch] text-xs text-[var(--lifafa-muted)]">
        Payment cancelled. Nothing has been charged.
      </p>
    );
  }

  return (
    <p
      role="alert"
      className="max-w-[44ch] text-xs text-[var(--lifafa-rose)] sm:text-right"
    >
      {phase.message}
    </p>
  );
}
