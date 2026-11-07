"use client";

import type { ReactElement } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import LegalFooter from "@/components/legal/LegalFooter";
import { TemplateGalleryView } from "@/components/wizard/TemplateGalleryView";
import WizardProgress from "@/components/wizard/WizardProgress";
import {
  CHOOSE_DESIGN_HINT,
  CHOOSE_DESIGN_HINT_ID,
  HINT_TEXT,
  PRIMARY_BUTTON,
} from "@/components/wizard/wizardStyles";
import { WIZARD_STEPS } from "@/lib/wizardSteps";

/**
 * The gallery, drawn by the server, for /create's first screen.
 *
 * WHY. The wizard cannot be drawn on the server: whether a card is waiting is
 * in the browser's storage (Wizard.tsx). Before this, the server drew a
 * skeleton and the gallery, with the picture that is the page's largest
 * paint, was only asked for once all of the wizard's code had arrived and
 * run: seconds on the phones Instagram's ads bring here. Now the first row's
 * pictures are in the page itself, asked for ahead of every script
 * (app/create/loading.tsx); the other cards show their colour until the
 * wizard's gallery draws their pictures, so those do not share a slow
 * connection with the first row.
 *
 * THE SAME PAGE, NOT A DRAWING OF IT. Built from the gallery's own view
 * (TemplateGalleryView) inside the wizard's own frame, with what a new
 * visitor's first render has: no design chosen, so Next off with the hint
 * beside it, All pressed, nothing restored. So when the wizard takes over, a
 * moment after the page has run, nothing on screen moves; the pictures below
 * the first row arrive. What differs is only what the browser alone knows: a
 * card kept from before brings its note and its template.
 *
 * A Client Component only so that the page's own data carries a reference
 * to it rather than every card twice over; it has no state and no effects,
 * and is drawn by the server like any other.
 *
 * Shown only where the address opens on the gallery (app/create/page.tsx):
 * no step or step=template, no template chosen, no card being handed over.
 * Inert until the wizard takes over; "See live demo" and each picture are
 * links, so they work from the first moment.
 */
export default function GalleryFirstScreen(): ReactElement {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 pt-2.5 pb-1 sm:px-12 lg:px-[5.5rem] xl:px-8">
          <WizardProgress
            brand={
              <Link
                href="/"
                className="-my-2 inline-block rounded py-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                <Logo compact />
              </Link>
            }
            current="template"
          />
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 pt-6 pb-12 sm:px-12 lg:grid-cols-[58fr_42fr] lg:items-start lg:gap-10 lg:px-[5.5rem] lg:pt-10 xl:px-8">
        <div className="flex min-w-0 flex-col gap-8">
          <h1
            tabIndex={-1}
            className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-[-0.01em] text-balance text-[var(--lifafa-cream)] focus:outline-none"
          >
            {WIZARD_STEPS[0].title}
          </h1>

          <TemplateGalleryView
            selectedId={null}
            firstRow="shell"
            filter="all"
            demoHref={(path) => path}
          />
        </div>

        {/* The card preview's place, beside the steps at lg; it is drawn once the page has run. */}
        <div
          data-clarity-mask="true"
          className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24"
        />
      </main>

      <LegalFooter className="pb-32" />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-12 lg:px-[5.5rem] xl:px-8">
          <p id={CHOOSE_DESIGN_HINT_ID} className={HINT_TEXT}>
            {CHOOSE_DESIGN_HINT}
          </p>

          <div className="ml-auto">
            <button
              type="button"
              disabled
              aria-describedby={CHOOSE_DESIGN_HINT_ID}
              className={PRIMARY_BUTTON}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
