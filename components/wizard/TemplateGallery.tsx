"use client";

import { useState, type ReactElement } from "react";
import { getPalette } from "@/lib/palettes";
import { templateDemoPath } from "@/lib/templateSamples";
import {
  CATEGORY_LABELS,
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

/**
 * Step 1: the templates, as a grid of cards to choose from.
 *
 * Each card is the template's preview (the first screen of its sample
 * invitation, at 360px), its name, a link that opens the sample itself in a
 * new tab, and Select. Two to a row on a phone, where each is still wide
 * enough for both buttons at 44px.
 *
 * Choosing here only says which template; what that does to the card is the
 * wizard's business (switchTemplate), which keeps every detail the host has
 * typed.
 */
export default function TemplateGallery({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (template: TemplateConfig) => void;
}): ReactElement {
  const templates = listedTemplates();
  const [filter, setFilter] = useState<Filter>("all");

  /* Only the categories that have a template, in the order they first appear. */
  const categories = [...new Set(templates.flatMap(categoriesOf))];
  const shown = templates.filter(
    (template) => filter === "all" || categoriesOf(template).includes(filter),
  );

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {/*
        One row that scrolls sideways inside itself, bled to the screen's
        edges so a chip half off the right says there are more.
      */}
      <div
        role="group"
        aria-label="Filter templates"
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

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {shown.map((template) => {
          const selected = template.id === selectedId;
          const ground = getPalette(template.baseDesign.style.paletteId);

          return (
            <li
              key={template.id}
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
                  <span className="absolute top-2 right-2 rounded-full bg-[var(--lifafa-cream)] px-2.5 py-1 text-[0.6875rem] font-semibold text-[var(--lifafa-ink)]">
                    {template.badge}
                  </span>
                ) : null}
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h2 className="text-[0.9375rem] leading-snug font-semibold break-words text-[var(--lifafa-cream)]">
                    {template.name}
                  </h2>
                  <p className="text-xs text-[var(--lifafa-muted)]">
                    {template.categoryLabel ?? CATEGORY_LABELS[template.category]}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <a
                    href={templateDemoPath(template.id)}
                    target="_blank"
                    rel="noopener"
                    className={`${CARD_BUTTON} border border-[var(--lifafa-hairline)] text-[var(--lifafa-cream)] hover:border-[var(--lifafa-marigold)]`}
                  >
                    Live demo
                    <span className="sr-only">
                      {" "}
                      of {template.name} (opens in a new tab)
                    </span>
                  </a>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(template)}
                    className={`${CARD_BUTTON} ${
                      selected
                        ? "border border-[var(--lifafa-marigold)] text-[var(--lifafa-marigold)]"
                        : "bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                    }`}
                  >
                    {selected ? "Selected" : "Select"}
                    <span className="sr-only"> {template.name}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
