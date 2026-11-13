import type { ReactElement } from "react";
import Link from "next/link";
import type { ChecklistItem, ChecklistItemId } from "@/lib/cardChecklist";

/**
 * "Add more to your card": what a card has and what it could also have, one
 * line each, with a way to add it. Optional, all of it: a guide, never a list
 * of things that must be done before saving.
 *
 * Two homes, one look. Under a new card's preview in the wizard, where "Add"
 * opens only that part of the details form (`onAdd`). On the dashboard of a
 * saved invitation, where it is a link to that field on the edit page
 * (`hrefFor`). No state and no hooks, so the dashboard draws it on the server.
 */
const ACTION =
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-4 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
const ADD = `${ACTION} border border-[var(--lifafa-marigold)] text-[var(--lifafa-marigold)] hover:bg-[var(--lifafa-marigold)] hover:text-[var(--lifafa-ink)]`;
const EDIT = `${ACTION} font-medium text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]`;
const SHOW_ALL =
  "inline-flex min-h-11 items-center self-start rounded text-sm font-medium text-[var(--lifafa-marigold)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

function Mark({ done }: { done: boolean }): ReactElement {
  return done ? (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-[var(--lifafa-marigold)]">
      <circle cx="10" cy="10" r="10" fill="currentColor" />
      <path d="M6 10.5l2.6 2.5L14 7.5" fill="none" stroke="var(--lifafa-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-[var(--lifafa-hairline)]">
      <circle cx="10" cy="10" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A button stretched over its row (the row is `relative`), so a tap anywhere on the row is its tap. */
const ROW_TAP = "after:absolute after:inset-0 after:rounded-xl after:content-[''] active:after:bg-[var(--lifafa-cream)]/[0.06]";

export default function CardChecklist({
  items,
  onAdd,
  onShowAll,
  hrefFor,
  showAllHref,
}: {
  items: readonly ChecklistItem[];
  /** In the wizard: open that part of the form. */
  onAdd?: (id: ChecklistItemId) => void;
  /** In the wizard: open the whole form. */
  onShowAll?: () => void;
  /** On the dashboard: where each item's link goes. */
  hrefFor?: (id: ChecklistItemId) => string;
  /** On the dashboard: the whole form. */
  showAllHref?: string;
}): ReactElement {
  return (
    <section
      aria-labelledby="card-checklist-heading"
      data-card-checklist=""
      className="flex flex-col gap-4 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] p-5"
    >
      {/* A guide, not a task list: no count of what is done and no progress bar. */}
      <div className="flex flex-col gap-1">
        <h2
          id="card-checklist-heading"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]"
        >
          Add more to your card
        </h2>
        <p className="text-sm text-[var(--lifafa-muted)]">Add what you have now. Everything here is optional.</p>
      </div>

      <ul className="flex flex-col">
        {items.map((item) => {
          const label = item.done ? "Edit" : "Add";
          const named = `${label} ${item.label.toLowerCase()}`;
          /*
            The whole row answers a tap, not only its Add or Edit: the button
            is stretched over the row (ROW_TAP). The row's name and its mark
            were tapped and did nothing (Clarity's dead clicks, Nov 2026).
          */
          const className = `${item.done ? EDIT : ADD} ${ROW_TAP}`;

          return (
            <li
              key={item.id}
              className="relative flex min-h-14 items-center justify-between gap-3 border-t border-[var(--lifafa-hairline)] py-1.5 first:border-t-0"
            >
              <span className="flex min-w-0 items-center gap-3 text-[0.9375rem] text-[var(--lifafa-cream)]">
                <Mark done={item.done} />
                <span className="truncate">{item.label}</span>
                <span className="sr-only">{item.done ? ", done" : ", not added yet"}</span>
              </span>
              {hrefFor !== undefined ? (
                <Link href={hrefFor(item.id)} aria-label={named} className={className}>
                  {label}
                </Link>
              ) : onAdd !== undefined ? (
                <button type="button" onClick={() => onAdd(item.id)} aria-label={named} className={className}>
                  {label}
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>

      {showAllHref !== undefined ? (
        <Link href={showAllHref} className={SHOW_ALL}>
          Show all details
        </Link>
      ) : onShowAll !== undefined ? (
        <button type="button" onClick={onShowAll} className={SHOW_ALL}>
          Show all details
        </button>
      ) : null}
    </section>
  );
}
