import type { ReactElement } from "react";
import Link from "next/link";
import { PRIMARY_BUTTON, SECTION_HEADING } from "@/components/landing/styles";
import { LOWEST_PRICE_PAISE, formatPriceRs } from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/** The last word before the footer: one button, the same as the hero's. */
export default function CallToAction(): ReactElement {
  return (
    <section
      aria-labelledby="closing-heading"
      className="relative isolate overflow-x-clip px-5 py-20 text-center sm:px-8 sm:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[min(140vw,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(232,163,61,0.13),rgba(196,86,107,0.05)_60%,transparent)]"
      />
      <h2
        id="closing-heading"
        className={`mx-auto max-w-[18ch] ${SECTION_HEADING}`}
      >
        Your invitation can be ready tonight
      </h2>
      <p className="mx-auto mt-4 max-w-[36ch] text-base leading-relaxed text-balance text-[var(--lifafa-muted)] sm:text-lg">
        Choose a design, add your details and start collecting replies in
        about 10 minutes.
      </p>
      <Link href={NEW_CARD_HREF} className={`mt-8 ${PRIMARY_BUTTON}`}>
        Choose your design
      </Link>
      <p className="mt-5 text-sm text-[var(--lifafa-muted)]">
        From {formatPriceRs(LOWEST_PRICE_PAISE)} per event. One-time payment.
      </p>
    </section>
  );
}
