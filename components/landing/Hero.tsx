import type { ReactElement } from "react";
import Link from "next/link";
import LinkPending from "@/components/landing/LinkPending";
import {
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SECTION_X,
} from "@/components/landing/styles";
import { LOWEST_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/**
 * The first screen: what Lifafa is, the two ways on, and the price.
 *
 * A SERVER COMPONENT with no picture: every word and both buttons are in the
 * HTML, set in Fraunces (preloaded) and Manrope (preloaded on this page), so
 * the screen is whole at first paint and never waits for the carousel's
 * images or videos below it.
 *
 * `demoHref` is a premium template's live demo, chosen by the page from the
 * gallery's own listing.
 */
export default function Hero({ demoHref }: { demoHref: string }): ReactElement {
  return (
    <section
      aria-labelledby="hero-heading"
      className={`${SECTION_X} pt-28 pb-14 text-center sm:pt-32 lg:pt-36 lg:pb-16`}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <p className="flex items-center gap-3 text-xs font-bold tracking-[0.22em] text-[var(--paper-gold-ink)] uppercase">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--paper-gold)]" />
          Digital wedding invitations
          <span aria-hidden="true" className="h-px w-8 bg-[var(--paper-gold)]" />
        </p>

        <h1
          id="hero-heading"
          className="mt-6 font-[family-name:var(--paper-display)] text-[clamp(2.375rem,9vw,4.25rem)] leading-[1.06] font-semibold tracking-[-0.025em] text-balance text-[var(--paper-ink)]"
        >
          Wedding invitations that tell you who is coming
          {/* The section's one sindoor accent: the full stop, drawn as a bindi. */}
          <span className="text-[var(--paper-sindoor)]">.</span>
        </h1>

        <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-[1.6] text-pretty text-[var(--paper-muted)] sm:text-xl">
          Choose a design, add your details and share one link. Guests reply
          in a tap and you see the headcount live.
        </p>

        <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Link href={NEW_CARD_HREF} className={`w-full sm:w-auto ${PRIMARY_BUTTON}`}>
            <LinkPending>Choose a design</LinkPending>
          </Link>
          <Link
            href={demoHref}
            prefetch={false}
            className={`w-full sm:w-auto ${SECONDARY_BUTTON}`}
          >
            See a live demo
          </Link>
        </div>

        <p className="mt-5 text-sm font-medium text-[var(--paper-muted)]">
          From {formatPrice(LOWEST_PRICE_PAISE)} per event. One time payment.
        </p>
      </div>
    </section>
  );
}
