import type { ReactElement } from "react";
import Image from "next/image";
import Link from "next/link";
import AfterLoad from "@/components/landing/AfterLoad";
import { DEMO_SECTION_ID } from "@/components/landing/Hero";
import SwipeRow from "@/components/landing/SwipeRow";
import {
  CARD_LINK,
  EYEBROW,
  SECTION_HEADING,
  SECTION_LEAD,
} from "@/components/landing/styles";
import {
  LOWEST_PRICE_PAISE,
  formatPriceRs,
} from "@/lib/pricing";
import { NEW_CARD_HREF, templateStartHref } from "@/lib/wizardSteps";
import { listedPremium, type TemplateListing } from "@/templates/premium";

/** A small filled button, for "Create yours" on a card. */
const CARD_PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--lifafa-marigold)] px-4 text-sm font-semibold whitespace-nowrap text-[var(--lifafa-ink)] transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

/**
 * One template in a phone: its preview, its name and price, and the two ways
 * on from it.
 *
 * `relative`, so the image's sizing box stays inside the card and inside the
 * row that scrolls: without it a positioned child would be placed against the
 * page and widen it sideways.
 */
function DemoCard({
  template,
}: {
  template: TemplateListing & { preview: NonNullable<TemplateListing["preview"]> };
}): ReactElement {
  return (
    <li className="relative flex w-[min(72vw,16rem)] shrink-0 snap-start flex-col items-center lg:w-[17rem]">
      <div className="relative aspect-[9/16] w-full rounded-[2.4rem] border-[7px] border-[#2e2722] bg-[var(--lifafa-ink-raised)] shadow-[0_30px_70px_-28px_rgba(0,0,0,0.85),0_0_0_1px_rgba(232,163,61,0.18)]">
        <div className="absolute inset-0 overflow-hidden rounded-[1.95rem]">
          {/* Below the first screen: fetched once the page has loaded, so it never shares the line with it. */}
          <AfterLoad>
            <Image
              src={template.preview}
              alt={`The first screen of the ${template.name} design`}
              fill
              quality={70}
              sizes="(min-width: 1024px) 17rem, 72vw"
              className="object-cover object-top"
            />
          </AfterLoad>
        </div>
        <span
          aria-hidden="true"
          className="absolute top-2.5 left-1/2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-black/55"
        />
      </div>

      <h3 className="mt-5 font-[family-name:var(--font-display)] text-2xl leading-tight font-semibold text-[var(--lifafa-cream)]">
        {template.name}
      </h3>
      <p className="mt-1 text-sm text-[var(--lifafa-muted)]">
        Premium, {formatPriceRs(template.price)} per event
      </p>

      <div className="mt-4 flex gap-2.5">
        <Link
          href={`/demo/${template.id}`}
          prefetch={false}
          className={CARD_LINK}
          aria-label={`Preview ${template.name}`}
        >
          Preview
        </Link>
        <Link
          href={templateStartHref(template.id)}
          className={CARD_PRIMARY}
          aria-label={`Create yours with ${template.name}`}
        >
          Create yours
        </Link>
      </div>
    </li>
  );
}

/**
 * The Premium Collection as a guest would see it: each template the gallery
 * offers in it, in a phone, with a live demo and a way to start on it.
 *
 * Read from templates/premium.ts, the collection's own listing, which the
 * template configs spread: a premium template added to the gallery is here
 * too, and the cards themselves are never part of this page.
 */
export default function DemoSection(): ReactElement {
  const templates = listedPremium();

  return (
    <section
      id={DEMO_SECTION_ID}
      aria-labelledby="demo-heading"
      className="scroll-mt-14 border-t border-[var(--lifafa-hairline)] px-5 py-16 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className={EYEBROW}>Live demo</p>
          <h2
            id="demo-heading"
            tabIndex={-1}
            className={`mt-3 focus:outline-none ${SECTION_HEADING}`}
          >
            See it the way your guests will
          </h2>
          <p className={`mx-auto mt-4 max-w-[38ch] ${SECTION_LEAD}`}>
            Open a design exactly as a guest does, from the envelope to the
            reply.
          </p>
        </div>

        <div className="mt-10">
          <SwipeRow
            label="Premium Collection designs"
            labels={templates.map((template) => template.name)}
          >
            {templates.map((template) => (
              <DemoCard key={template.id} template={template} />
            ))}
          </SwipeRow>
        </div>

        <p className="mt-6 text-center">
          <Link
            href={NEW_CARD_HREF}
            className="inline-flex min-h-11 items-center rounded px-1 text-[0.9375rem] font-medium text-[var(--lifafa-marigold)] underline decoration-[var(--lifafa-marigold)]/40 underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            See all designs, from {formatPriceRs(LOWEST_PRICE_PAISE)}
          </Link>
        </p>
      </div>
    </section>
  );
}
