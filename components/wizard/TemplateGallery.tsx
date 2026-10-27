"use client";

import { useState, type ReactElement } from "react";
import { viewContent } from "@/lib/metaPixel";
import { getPalette } from "@/lib/palettes";
import { formatPrice } from "@/lib/pricing";
import { templateDemoPath } from "@/lib/templateSamples";
import { UPGRADE_AFTER_PAYMENT_MESSAGE } from "@/lib/templateUpgrade";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  categoriesOf,
  listedTemplates,
} from "@/templates/registry";
import type { TemplateConfig } from "@/templates/types";
import type { TraditionId } from "@/types/occasion";

type Filter = TraditionId | "all";

const CHIP =
  "min-h-11 shrink-0 rounded-full border px-4 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
const CARD_BUTTON =
  "flex min-h-11 w-full items-center justify-center rounded-full px-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
const SECTION_HEADING =
  "font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]";
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4";

/** A template looked at, for the ads: its live demo opened, or chosen. */
function looked(template: TemplateConfig): void {
  viewContent({
    id: template.id,
    name: template.name,
    pricePaise: template.price,
  });
}

/** One template: its preview, its name and price, its sample, and Select. */
function TemplateCard({
  template,
  selected,
  locked,
  onSelect,
}: {
  template: TemplateConfig;
  selected: boolean;
  /** Costs more than a paid invitation was paid for: shown, and not selectable. */
  locked: boolean;
  onSelect: (template: TemplateConfig) => void;
}): ReactElement {
  const ground = getPalette(template.baseDesign.style.paletteId);

  return (
    <li
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-[var(--lifafa-ink-raised)] ${
        selected
          ? "border-[var(--lifafa-marigold)]"
          : "border-[var(--lifafa-hairline)]"
      }`}
    >
      <div
        className="relative aspect-[9/14] w-full overflow-hidden"
        style={{ backgroundColor: ground.background }}
      >
        {template.preview !== null ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.preview.src}
            width={template.preview.width}
            height={template.preview.height}
            alt={`The ${template.name} template`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top"
          />
        ) : null}
        {selected ? (
          <span className="absolute top-2 left-2 rounded-full bg-[var(--lifafa-marigold)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--lifafa-ink)]">
            Selected
          </span>
        ) : null}
        {template.badge !== undefined ? (
          <span className="absolute top-2 right-2 rounded-full border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)] px-2.5 py-1 text-[0.6875rem] font-bold tracking-[0.04em] text-[var(--lifafa-marigold)]">
            {template.badge}
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h3 className="font-[family-name:var(--font-display)] text-base leading-snug font-semibold break-words text-[var(--lifafa-cream)]">
            {template.name}
          </h3>
          <p className="text-xs text-[var(--lifafa-muted)]">
            {template.categoryLabel ?? CATEGORY_LABELS[template.category]}
          </p>
          {/* What the invitation costs on this template. A label: the charge is worked out on the server. */}
          <p className="mt-0.5 text-[0.9375rem] font-semibold text-[var(--lifafa-marigold)]">
            {formatPrice(template.price)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <a
            href={templateDemoPath(template.id)}
            target="_blank"
            rel="noopener"
            onClick={() => looked(template)}
            className={`${CARD_BUTTON} border border-[var(--lifafa-hairline)] text-[var(--lifafa-cream)] hover:border-[var(--lifafa-marigold)]`}
          >
            Live demo
            <span className="sr-only">
              {" "}
              of {template.name} (opens in a new tab)
            </span>
          </a>
          {locked ? (
            /* Said in place of the button, so the host knows why before they try. */
            <p className="text-xs leading-snug text-[var(--lifafa-muted)]">
              {UPGRADE_AFTER_PAYMENT_MESSAGE}
            </p>
          ) : (
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (!selected) {
                  looked(template);
                }

                onSelect(template);
              }}
              className={`${CARD_BUTTON} ${
                selected
                  ? "border border-[var(--lifafa-marigold)] text-[var(--lifafa-marigold)]"
                  : "bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
              }`}
            >
              {selected ? "Selected" : "Select"}
              <span className="sr-only"> {template.name}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Step 1: the templates, in their two collections.
 *
 * THE PREMIUM COLLECTION is first: the templates with a card of their own,
 * each made for any wedding, so it has no chips to filter by. THE TRADITIONS
 * COLLECTION follows, with a chip to a tradition and one for any occasion.
 *
 * Each card is the template's preview (the first screen of its sample
 * invitation, at 360px), its name, its price, a link that opens the sample
 * itself in a new tab, and Select. Two to a row on a phone, where each is
 * still wide enough for both buttons at 44px.
 *
 * Choosing here only says which template; what that does to the card is the
 * wizard's business (switchTemplate), which keeps every detail the host has
 * typed. On a paid invitation a template that costs more than the one it was
 * paid for is shown and cannot be chosen; the server refuses that save too.
 */
export default function TemplateGallery({
  selectedId,
  onSelect,
  paidPricePaise = null,
}: {
  selectedId: string;
  onSelect: (template: TemplateConfig) => void;
  /** On a paid invitation, the price of the template it was paid on; null before payment. */
  paidPricePaise?: number | null;
}): ReactElement {
  const templates = listedTemplates();
  const premium = templates.filter((template) => template.collection === "premium");
  const traditions = templates.filter(
    (template) => template.collection === "traditions",
  );
  const [filter, setFilter] = useState<Filter>("all");

  /* The chips, in the gallery's own order, for the categories that have a template. */
  const present = new Set(traditions.flatMap(categoriesOf));
  const categories = CATEGORY_ORDER.filter((category) => present.has(category));
  const shown = traditions.filter(
    (template) => filter === "all" || categoriesOf(template).includes(filter),
  );

  const card = (template: TemplateConfig): ReactElement => (
    <TemplateCard
      key={template.id}
      template={template}
      selected={template.id === selectedId}
      locked={
        paidPricePaise !== null &&
        template.price > paidPricePaise &&
        template.id !== selectedId
      }
      onSelect={onSelect}
    />
  );

  return (
    <div className="flex min-w-0 flex-col gap-9">
      {premium.length > 0 ? (
        <section aria-labelledby="gallery-premium" className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="gallery-premium" className={SECTION_HEADING}>
              Premium Collection
            </h2>
            <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
              Designed from the envelope to the last page, for every wedding.
            </p>
          </div>
          <ul className={GRID}>{premium.map(card)}</ul>
        </section>
      ) : null}

      <section aria-labelledby="gallery-traditions" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="gallery-traditions" className={SECTION_HEADING}>
            Traditions Collection
          </h2>
          <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
            A card in your own tradition, or one for any occasion.
          </p>
        </div>

        {/*
          One row that scrolls sideways inside itself, bled to the screen's
          edges so a chip half off the right says there are more.
        */}
        <div
          role="group"
          aria-label="Filter the Traditions Collection"
          className="lifafa-no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {(["all", ...categories] as const).map((entry) => {
            const active = filter === entry;

            return (
              <button
                key={entry}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(entry)}
                className={`${CHIP} ${
                  active
                    ? "border-[var(--lifafa-marigold)] bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                    : "border-[var(--lifafa-hairline)] text-[var(--lifafa-cream)] hover:border-[var(--lifafa-marigold)]"
                }`}
              >
                {entry === "all" ? "All" : CATEGORY_LABELS[entry]}
              </button>
            );
          })}
        </div>

        <ul className={GRID}>{shown.map(card)}</ul>
      </section>
    </div>
  );
}
