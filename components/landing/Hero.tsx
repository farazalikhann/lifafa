import type { ReactElement } from "react";
import Link from "next/link";
import HeroPhone from "@/components/landing/HeroPhone";
import { HERO_DESIGNS } from "@/lib/landingDesigns";
import { LOWEST_PRICE_PAISE, formatPriceRs } from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";
import { PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/landing/styles";

/**
 * The first screen: what Lifafa is, the two ways in, and the designs on a
 * phone.
 *
 * A SERVER COMPONENT, and nothing here waits for script: the words and both
 * buttons are in the HTML and on screen with the first paint. The only part
 * that runs in the browser is the phone's crossfade, which does nothing until
 * the page has loaded (see HeroPhone).
 *
 * Text first on a phone, the phone under it; side by side from `lg`.
 */
export default function Hero(): ReactElement {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate overflow-x-clip px-5 pt-24 pb-16 sm:px-8 lg:pt-32 lg:pb-24"
    >
      {/* A warm glow behind the headline, drawn in CSS: no picture to wait for. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -z-10 aspect-square w-[min(150vw,64rem)] -translate-x-1/2 -translate-y-1/4 rounded-full bg-[radial-gradient(closest-side,rgba(232,163,61,0.16),rgba(196,86,107,0.07)_55%,transparent)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <h1
            id="hero-heading"
            className="max-w-[15ch] font-[family-name:var(--font-display)] text-[clamp(2.25rem,9.5vw,4.25rem)] leading-[1.06] font-semibold tracking-[-0.025em] text-balance text-[var(--lifafa-cream)]"
          >
            A beautiful invitation that tells you who is coming
          </h1>

          <p className="mt-5 max-w-[34ch] text-[1.0625rem] leading-relaxed text-balance text-[var(--lifafa-cream-soft)] sm:text-lg">
            Choose a design, share one link on WhatsApp, and see every reply
            and your headcount in one place.
          </p>

          <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row">
            <Link href={NEW_CARD_HREF} className={PRIMARY_BUTTON}>
              Choose your design
            </Link>
            <Link
              href="/demo/emerald-shahi"
              prefetch={false}
              className={SECONDARY_BUTTON}
            >
              See a live demo
            </Link>
          </div>

          <p className="mt-5 text-sm text-[var(--lifafa-muted)]">
            From {formatPriceRs(LOWEST_PRICE_PAISE)} per event. Guests need no
            app.
          </p>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroPhone designs={HERO_DESIGNS} />
        </div>
      </div>
    </section>
  );
}
