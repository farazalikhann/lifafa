import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import AfterLoad from "@/components/landing/AfterLoad";
import {
  CARD_LINK,
  EYEBROW,
  SECONDARY_BUTTON,
  SECTION_HEADING,
  SECTION_LEAD,
} from "@/components/landing/styles";
import {
  PREMIUM_DESIGNS,
  TRADITIONS_DESIGNS,
  type LandingDesign,
} from "@/lib/landingDesigns";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPriceRs,
} from "@/lib/pricing";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/**
 * A design's picture: resized for its width, WebP, lazy, and not asked for
 * until the page has loaded (see AfterLoad), so it never competes with the
 * hero. Its box holds the space and the design's dark ground until then.
 */
function Preview({
  design,
  sizes,
}: {
  design: LandingDesign;
  sizes: string;
}): ReactElement {
  return (
    <div className="relative aspect-[9/16] w-full overflow-hidden bg-[var(--lifafa-ink)]">
      <AfterLoad>
        <Image
          src={design.preview}
          alt={`The ${design.name} design`}
          fill
          quality={70}
          sizes={sizes}
          className="object-cover object-top"
        />
      </AfterLoad>
    </div>
  );
}

/** A premium design: larger, two side by side even on a phone. */
function PremiumCard({ design }: { design: LandingDesign }): ReactElement {
  return (
    <li className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--lifafa-marigold)]/35 bg-[var(--lifafa-ink-raised)]">
      <Preview design={design} sizes="(min-width: 1024px) 20rem, 46vw" />
      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="min-w-0">
          <h4 className="font-[family-name:var(--font-display)] text-lg leading-tight font-semibold text-[var(--lifafa-cream)] sm:text-xl">
            {design.name}
          </h4>
          <p className="mt-1 text-sm font-semibold text-[var(--lifafa-marigold)]">
            {formatPriceRs(design.price)}
          </p>
        </div>
        <Link
          href={design.demoHref}
          prefetch={false}
          className={`${CARD_LINK} mt-auto w-full`}
        >
          Live demo
          <span className="sr-only"> of {design.name}</span>
        </Link>
      </div>
    </li>
  );
}

/** A traditions design, in the sideways row. */
function TraditionCard({ design }: { design: LandingDesign }): ReactElement {
  return (
    <li className="relative w-[9.5rem] shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] sm:w-[11rem]">
      <Link
        href={design.demoHref}
        prefetch={false}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        <Preview design={design} sizes="(min-width: 640px) 11rem, 9.5rem" />
        <div className="p-3">
          <h4 className="truncate text-[0.9375rem] font-semibold text-[var(--lifafa-cream)]">
            {design.name}
          </h4>
          <p className="mt-0.5 text-xs text-[var(--lifafa-muted)]">
            {design.label}
          </p>
          <p className="mt-2 text-xs font-semibold text-[var(--lifafa-marigold)]">
            Live demo
            <span className="sr-only"> of {design.name}</span>
          </p>
        </div>
      </Link>
    </li>
  );
}

/**
 * The designs, in their two collections, as the gallery has them.
 *
 * A SERVER COMPONENT with no script: the traditions row scrolls sideways by
 * the browser's own overflow and snap, inside its own box, so the page itself
 * never scrolls sideways. Every picture below the first screen is lazy, so a
 * visitor who never scrolls here never fetches one.
 */
export default function Designs(): ReactElement {
  return (
    <section
      id="designs"
      aria-labelledby="designs-heading"
      className="px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className={EYEBROW}>Designs</p>
          <h2 id="designs-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Pick a design you love
          </h2>
          <p className={`mx-auto mt-4 max-w-[40ch] ${SECTION_LEAD}`}>
            Open any design as a live demo, exactly as your guests will see
            it.
          </p>
        </div>

        <div className="mt-12 lg:max-w-2xl">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--lifafa-cream)] sm:text-2xl">
              Premium Collection
            </h3>
            <p className="text-sm font-semibold whitespace-nowrap text-[var(--lifafa-marigold)]">
              {formatPriceRs(PREMIUM_PRICE_PAISE)}
            </p>
          </div>
          <p className="mt-1 text-sm text-[var(--lifafa-muted)]">
            Full-screen designs with their own opening animation.
          </p>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-5">
            {PREMIUM_DESIGNS.map((design) => (
              <PremiumCard key={design.id} design={design} />
            ))}
          </ul>
        </div>

        <div className="mt-14">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--lifafa-cream)] sm:text-2xl">
              Traditions Collection
            </h3>
            <p className="text-sm font-semibold whitespace-nowrap text-[var(--lifafa-marigold)]">
              from {formatPriceRs(TRADITIONS_PRICE_PAISE)}
            </p>
          </div>
          <p className="mt-1 text-sm text-[var(--lifafa-muted)]">
            Hindu, Muslim, Sikh, Jain, Buddhist and Christian weddings, and any
            occasion. Swipe to see them all.
          </p>
          {/*
            The row's own box scrolls; the negative margins let it run to the
            screen's edges on a phone while its first card lines up with the
            text above. Inside the section's padding, so nothing is wider than
            the page.
          */}
          <ul
            aria-label="Traditions Collection designs"
            className="-mx-5 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:thin] sm:-mx-8 sm:scroll-px-8 sm:px-8"
          >
            {TRADITIONS_DESIGNS.map((design) => (
              <TraditionCard key={design.id} design={design} />
            ))}
          </ul>
        </div>

        <div className="mt-10 flex justify-center">
          <Link href={NEW_CARD_HREF} className={SECONDARY_BUTTON}>
            See all designs
          </Link>
        </div>
      </div>
    </section>
  );
}
