import type { ReactElement } from "react";
import Image from "next/image";
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

/** Which pictures are drawn and how the first row's are asked for; see TemplateGalleryView. */
export type FirstRow = "priority" | "shell";

/** The Premium Collection's first cards are the first row on a phone, two to a row. */
const FIRST_ROW = 2;

/** Which tradition's chip is pressed, or All. */
export type GalleryFilter = TraditionId | "all";

const CHIP =
  "min-h-11 shrink-0 rounded-full border px-4 text-[0.8125rem] font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
const CARD_BUTTON =
  "flex min-h-11 w-full items-center justify-center rounded-full px-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
const SECTION_HEADING =
  "font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]";
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4";

/*
  How wide a card's picture is drawn, for the image service to pick a file:
  two columns in the page's 16px gutters on a phone; three from 640px; three
  in the left column of the two at lg; and at most 192px once the page stops
  growing. The phone is the one that matters: about 173px across on a 390px
  screen, so 519 pixels at 3x, and the 640px file is the one sent. Sharp, at
  a fraction of the 720x1280 original.
*/
const PREVIEW_SIZES =
  "(min-width: 1280px) 192px, (min-width: 1024px) calc(19vw - 50px), (min-width: 640px) calc(33vw - 43px), calc(50vw - 22px)";

/** One template: its preview (a link to its sample), its name and price, its sample, and Select. */
function TemplateCard({
  template,
  selected,
  locked,
  onSelect,
  onLooked,
  first = false,
  firstRow = "priority",
  demoHref,
}: {
  template: TemplateConfig;
  selected: boolean;
  /** One of the first cards on the screen: its picture is asked for at once, ahead of the rest. */
  first?: boolean;
  /** "shell": only a first card draws its picture (GalleryFirstScreen). */
  firstRow?: FirstRow;
  /** The template's live demo, with the ad's tags on it. */
  demoHref: string;
  /** Costs more than a paid invitation was paid for: shown, and not selectable. */
  locked: boolean;
  /** Absent where the gallery is drawn before the page has run (GalleryFirstScreen). */
  onSelect?: (template: TemplateConfig) => void;
  /** The template looked at, for the ads: its live demo opened, or chosen. */
  onLooked?: (template: TemplateConfig) => void;
}): ReactElement {
  const ground = getPalette(template.baseDesign.style.paletteId);
  /* The tap on the picture or on "See live demo": the same link, and the same ViewContent. */
  const openDemo = onLooked === undefined ? undefined : () => onLooked(template);

  return (
    <li
      className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-[var(--lifafa-ink-raised)] ${
        selected
          ? "border-[var(--lifafa-marigold)]"
          : "border-[var(--lifafa-hairline)]"
      }`}
    >
      {/*
        The picture opens the live demo too: it is what visitors tap. Out of
        the tab order and hidden from screen readers, because "See live demo"
        below is the same link, named.
      */}
      <a
        href={demoHref}
        onClick={openDemo}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[9/14] w-full overflow-hidden"
        style={{ backgroundColor: ground.background }}
      >
        {template.preview !== null && (first || firstRow !== "shell") ? (
          <Image
            src={template.preview}
            alt={`The ${template.name} template`}
            fill
            sizes={PREVIEW_SIZES}
            priority={first}
            /* The first row is the page's largest paint: asked for ahead of every script. */
            fetchPriority={first ? "high" : undefined}
            className="object-cover object-top"
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
      </a>

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
          {/*
            The demo in this tab: its "Create this card" comes back to /create
            with this design chosen, and Back returns to the gallery with the
            card as it was (it is kept as it is typed; lib/cardAutosave.ts).
          */}
          <a
            href={demoHref}
            onClick={openDemo}
            className={`${CARD_BUTTON} border border-[var(--lifafa-hairline)] text-[var(--lifafa-cream)] hover:border-[var(--lifafa-marigold)]`}
          >
            See live demo
            <span className="sr-only">
              {" "}
              of {template.name}
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
              onClick={
                onSelect === undefined
                  ? undefined
                  : () => {
                      if (!selected) {
                        onLooked?.(template);
                      }

                      onSelect(template);
                    }
              }
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
 * The gallery as it is drawn: both collections, the chips and every card.
 * No state and no hooks, so the server can draw it as the page's first
 * screen (GalleryFirstScreen) exactly as TemplateGallery draws it once the
 * page has run; TemplateGallery holds the chip pressed and the handlers.
 */
export function TemplateGalleryView({
  selectedId,
  firstRow = "priority",
  paidPricePaise = null,
  filter,
  onFilter,
  onSelect,
  onLooked,
  demoHref,
}: {
  selectedId: string;
  /** On a paid invitation, the price of the template it was paid on; null before payment. */
  paidPricePaise?: number | null;
  filter: GalleryFilter;
  onFilter?: (filter: GalleryFilter) => void;
  onSelect?: (template: TemplateConfig) => void;
  onLooked?: (template: TemplateConfig) => void;
  /** A demo's path as its link is written: with the ad's tags once the page has run. */
  demoHref: (path: string) => string;
  /**
   * The pictures, the first row's always preloaded. "priority", where this
   * gallery is the page: every card's. "shell", where the server draws it as
   * the first screen (GalleryFirstScreen): the first row's alone, the rest
   * left to the gallery the wizard draws a moment later, so they do not
   * share a slow connection with the first row; below the first row a card
   * shows its colour until then.
   */
  firstRow?: FirstRow;
}): ReactElement {
  const templates = listedTemplates();
  const premium = templates.filter((template) => template.collection === "premium");
  const traditions = templates.filter(
    (template) => template.collection === "traditions",
  );

  /* The chips, in the gallery's own order, for the categories that have a template. */
  const present = new Set(traditions.flatMap(categoriesOf));
  const categories = CATEGORY_ORDER.filter((category) => present.has(category));
  const shown = traditions.filter(
    (template) => filter === "all" || categoriesOf(template).includes(filter),
  );

  const card = (template: TemplateConfig, index: number, first = false): ReactElement => (
    <TemplateCard
      key={template.id}
      template={template}
      first={first && index < FIRST_ROW}
      firstRow={firstRow}
      demoHref={demoHref(templateDemoPath(template.id))}
      selected={template.id === selectedId}
      locked={
        paidPricePaise !== null &&
        template.price > paidPricePaise &&
        template.id !== selectedId
      }
      onSelect={onSelect}
      onLooked={onLooked}
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
          <ul className={GRID}>{premium.map((template, index) => card(template, index, true))}</ul>
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
                onClick={onFilter === undefined ? undefined : () => onFilter(entry)}
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

        <ul className={GRID}>{shown.map((template, index) => card(template, index))}</ul>
      </section>
    </div>
  );
}
