import type { ReactElement } from "react";
import Link from "next/link";
import {
  EYEBROW,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SECTION_HEADING,
  SECTION_LEAD,
} from "@/components/landing/styles";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPriceRs,
} from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/*
  What every invitation includes, on either collection. Each line is
  something the product does today.
*/
const INCLUDED: readonly string[] = [
  "Unlimited guests and replies",
  "Your dashboard with an up-to-date headcount",
  "Every function: mehndi, sangeet, wedding, reception",
  "QR check-in at the venue",
  "English and Hindi",
  "Add to Calendar and directions to the venue",
  "Edits after sharing, on the same link",
  "Guest list download",
];

interface Plan {
  name: string;
  price: number;
  summary: string;
  /** What the card lists: everything included, or what this plan adds to the other. */
  lines: readonly string[];
  featured: boolean;
}

const PLANS: readonly Plan[] = [
  {
    name: "Traditions",
    price: TRADITIONS_PRICE_PAISE,
    summary:
      "Designs for Hindu, Muslim, Sikh, Jain, Buddhist and Christian weddings, and one for any occasion.",
    lines: INCLUDED,
    featured: false,
  },
  {
    name: "Premium",
    price: PREMIUM_PRICE_PAISE,
    summary:
      "Emerald Shahi or Gulab Mahal: our most detailed full-screen designs.",
    lines: [
      "Everything in Traditions",
      "Its own opening animation",
      "A full-screen design, page by page",
    ],
    featured: true,
  },
];

/** A marigold tick for an included line. */
function Tick(): ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-[0.2rem] h-[18px] w-[18px] shrink-0 text-[var(--lifafa-marigold)]"
    >
      <path d="M3.5 10.5 Q6 12.5 8 15 Q11.5 7.5 16.5 4" />
    </svg>
  );
}

function PlanCard({ plan }: { plan: Plan }): ReactElement {
  return (
    <li
      className={`flex flex-col rounded-3xl border bg-[var(--lifafa-ink-raised)] p-6 sm:p-8 ${
        plan.featured
          ? "border-[var(--lifafa-marigold)]/60"
          : "border-[var(--lifafa-hairline)]"
      }`}
    >
      <h3 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--lifafa-cream)]">
        {plan.name}
      </h3>
      <p className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-none font-semibold tracking-[-0.02em] text-[var(--lifafa-cream)]">
        {formatPriceRs(plan.price)}
      </p>
      <p className="mt-2 text-sm text-[var(--lifafa-muted)]">
        One-time payment per event
      </p>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--lifafa-cream-soft)]">
        {plan.summary}
      </p>

      <div aria-hidden="true" className="my-6 h-px w-full bg-[var(--lifafa-hairline)]" />

      <ul className="flex flex-1 flex-col gap-3">
        {plan.lines.map((line) => (
          <li key={line} className="flex items-start gap-3">
            <Tick />
            <span className="text-[0.9375rem] leading-relaxed text-[var(--lifafa-cream)]">
              {line}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={NEW_CARD_HREF}
        className={`mt-8 w-full ${plan.featured ? PRIMARY_BUTTON : SECONDARY_BUTTON}`}
      >
        Choose a {plan.name} design
      </Link>
    </li>
  );
}

/** Two prices, by collection. A server component: no script. */
export default function Pricing(): ReactElement {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="border-y border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]/50 px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-4xl">
        <div className="text-center">
          <p className={EYEBROW}>Pricing</p>
          <h2 id="pricing-heading" className={`mt-3 ${SECTION_HEADING}`}>
            One payment for each event
          </h2>
          <p className={`mx-auto mt-4 max-w-[40ch] ${SECTION_LEAD}`}>
            No subscription and no charge per guest. Make and preview your
            invitation first, and pay when you are ready to share it.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {PLANS.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </ul>
      </div>
    </section>
  );
}
