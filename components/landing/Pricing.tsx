import type { ReactElement } from "react";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPriceRs,
} from "@/lib/pricing";

const PLANS: readonly { name: string; price: number }[] = [
  { name: "Traditions", price: TRADITIONS_PRICE_PAISE },
  { name: "Premium", price: PREMIUM_PRICE_PAISE },
];

/** The two prices, on one compact line. A server component: no script. */
export default function Pricing(): ReactElement {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="px-5 py-12 sm:px-8 sm:py-16"
    >
      <div className="mx-auto flex max-w-xl flex-col items-center rounded-3xl border border-[var(--lifafa-hairline)] px-5 py-7 text-center sm:px-8">
        <h2
          id="pricing-heading"
          className="text-[0.6875rem] font-semibold tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase"
        >
          Pricing
        </h2>
        <ul
          role="list"
          className="mt-4 flex list-none flex-wrap items-baseline justify-center gap-x-8 gap-y-2"
        >
          {PLANS.map((plan) => (
            <li key={plan.name} className="text-[var(--lifafa-cream)]">
              <span className="text-base text-[var(--lifafa-cream-soft)]">
                {plan.name}
              </span>{" "}
              <span className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-[-0.02em]">
                {formatPriceRs(plan.price)}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-[var(--lifafa-muted)]">
          One-time payment per event. No subscription and no charge per guest.
        </p>
      </div>
    </section>
  );
}
