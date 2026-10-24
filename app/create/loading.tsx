import type { ReactElement } from "react";
import Link from "next/link";
import Shimmer from "@/components/skeleton/Shimmer";
import WizardProgress from "@/components/wizard/WizardProgress";
import { WIZARD_STEPS } from "@/lib/wizardSteps";

/**
 * What a visitor sees between tapping "Create your card" and the gallery
 * arriving. Without it Next held the landing page on screen until the wizard
 * was ready, and on a slow connection the tap seemed to do nothing.
 *
 * It is the wizard's first step with the pictures taken out: the same header
 * (the real progress bar, on step 1), the same container, the same headings,
 * and cards of the gallery's own geometry (TemplateGallery), two to a row on
 * a phone and three from sm. What is already known is drawn as itself, so the
 * gallery lands in place without anything moving.
 *
 * A drawing of the page, not built from it: if a card in TemplateGallery
 * changes shape, this changes with it.
 */

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4";
const SECTION_HEADING =
  "font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]";

/** One line of a card's text: the line box of the real text, a short bar inside it. */
function TextLine({
  className,
  bar,
}: {
  className: string;
  bar: string;
}): ReactElement {
  return (
    <p className={`flex items-center ${className}`}>
      <span aria-hidden="true">&#8203;</span>
      <Shimmer className={`rounded-full ${bar}`} />
    </p>
  );
}

function CardSkeleton(): ReactElement {
  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]">
      <Shimmer className="aspect-[9/14] w-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <TextLine className="text-[0.9375rem] leading-snug" bar="h-3.5 w-[70%]" />
          <TextLine className="text-xs" bar="h-2.5 w-[45%]" />
          <TextLine className="mt-0.5 text-[0.9375rem]" bar="h-3.5 w-12" />
        </div>
        <div className="flex flex-col gap-2">
          <Shimmer className="min-h-11 rounded-full" />
          <Shimmer className="min-h-11 rounded-full" />
        </div>
      </div>
    </li>
  );
}

export default function CreateLoading(): ReactElement {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pt-2.5 pb-1 sm:px-5 lg:px-8">
          <WizardProgress
            brand={
              <Link
                href="/"
                className="rounded font-[family-name:var(--font-display)] text-xl font-semibold tracking-[-0.02em] text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                Lifafa
              </Link>
            }
            current="template"
          />
        </div>
      </header>

      <main
        role="status"
        aria-live="polite"
        className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-12 sm:px-5 lg:grid-cols-[58fr_42fr] lg:items-start lg:gap-10 lg:px-8 lg:pt-10"
      >
        <span className="sr-only">Opening the templates…</span>

        <div className="flex min-w-0 flex-col gap-8">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.01em] text-balance text-[var(--lifafa-cream)]">
            {WIZARD_STEPS[0].title}
          </h1>

          <div className="flex min-w-0 flex-col gap-9">
            <section className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className={SECTION_HEADING}>Premium Collection</h2>
                <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
                  Designed from the envelope to the last page, for every wedding.
                </p>
              </div>
              {/* Two, as templates/premium.ts lists today. */}
              <ul className={GRID}>
                <CardSkeleton />
                <CardSkeleton />
              </ul>
            </section>

            <section className="flex min-w-0 flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className={SECTION_HEADING}>Traditions Collection</h2>
                <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
                  A card in your own tradition, or one for any occasion.
                </p>
              </div>

              {/* The filter chips, clipped at the edge as the real row scrolls. */}
              <div className="-mx-4 flex gap-2 overflow-hidden px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                {["w-14", "w-20", "w-24", "w-20", "w-24"].map((width, at) => (
                  <Shimmer key={at} className={`h-11 shrink-0 rounded-full ${width}`} />
                ))}
              </div>

              <ul className={GRID}>
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
                <CardSkeleton />
              </ul>
            </section>
          </div>
        </div>

        {/* The card preview, beside the steps at lg only (CardPreview). */}
        <div className="hidden min-w-0 lg:sticky lg:top-24 lg:block">
          <Shimmer className="mx-auto h-[620px] w-full max-w-[380px] rounded-[2rem]" />
        </div>
      </main>

      {/* The bar pinned to the bottom: Preview (below lg) and Next. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 lg:px-8">
          <Shimmer className="h-12 w-24 rounded-full lg:hidden" />
          <Shimmer className="ml-auto h-12 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}
