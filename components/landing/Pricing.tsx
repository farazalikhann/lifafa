import type { ReactElement } from "react";
import Link from "next/link";
import LinkPending from "@/components/landing/LinkPending";
import {
  CARD,
  EYEBROW,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SECTION_HEADING,
  SECTION_LEAD,
  SECTION_X,
  SECTION_Y,
} from "@/components/landing/styles";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPrice,
} from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

interface Plan {
  name: string;
  price: number;
  summary: string;
  featured: boolean;
}

const PLANS: readonly Plan[] = [
  {
    name: "Traditions",
    price: TRADITIONS_PRICE_PAISE,
    summary: "A design in your own tradition, or one for any occasion.",
    featured: false,
  },
  {
    name: "Premium",
    price: PREMIUM_PRICE_PAISE,
    summary: "Our signature designs, each a card of its own, for any wedding.",
    featured: true,
  },
];

/* The same in both: no feature is held back by collection. */
const INCLUDED: readonly string[] = [
  "RSVP and live headcount",
  "Guest pass and QR check-in",
  "Hindi and English",
  "Edit after sharing",
];

/** The two prices, from lib/pricing.ts. A server component. */
export default function Pricing(): ReactElement {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className={`${SECTION_X} ${SECTION_Y}`}
    >
      <div className="mx-auto max-w-[56rem]">
        <div className="text-center">
          <p className={EYEBROW}>Pricing</p>
          <h2 id="pricing-heading" className={`mt-3 ${SECTION_HEADING}`}>
            One price, no subscription
          </h2>
          <p className={`mx-auto mt-4 max-w-[30rem] ${SECTION_LEAD}`}>
            One payment covers one event.
          </p>
        </div>

        <ul role="list" className="mt-10 grid list-none gap-5 sm:grid-cols-2 lg:mt-14">
          {PLANS.map((plan) => (
            <li
              key={plan.name}
              className={`${CARD} flex flex-col p-7 sm:p-8 ${
                plan.featured ? "border-[1.5px] border-[var(--paper-emerald)]" : ""
              }`}
            >
              <h3 className="text-sm font-bold tracking-[0.16em] text-[var(--paper-gold-ink)] uppercase">
                {plan.name}
              </h3>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-[family-name:var(--paper-display)] text-5xl font-bold tracking-[-0.02em] text-[var(--paper-ink)]">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-base text-[var(--paper-muted)]">per event</span>
              </p>
              <p className="mt-3 text-base leading-[1.6] text-[var(--paper-muted)]">
                {plan.summary}
              </p>

              <ul role="list" className="mt-6 flex list-none flex-col gap-2.5 border-t border-[var(--paper-hairline)] pt-6">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-base text-[var(--paper-ink)]">
                    <svg
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                      className="mt-1 h-4 w-4 shrink-0 text-[var(--paper-emerald)]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 10.5 L8 14.5 L16 6" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex-1" />
              <Link
                href={NEW_CARD_HREF}
                className={plan.featured ? PRIMARY_BUTTON : SECONDARY_BUTTON}
                aria-label={`Choose a ${plan.name} design`}
              >
                <LinkPending>Choose a design</LinkPending>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-sm text-[var(--paper-muted)]">
          One time payment. No charge per guest.
        </p>
      </div>
    </section>
  );
}
