"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";

/** Matches `duration-300` on the panel below; the scroll waits this long. */
const TRANSITION_MS = 300;

/**
 * Which section of a tab is open, and the way to change it.
 *
 * Held by the page rather than by the panels, for the reason `openSubEventId`
 * is: only the selected tab is mounted, so a panel that kept this itself would
 * forget where the host was every time they looked at another tab. One id per
 * tab, so opening a section is closing whichever one was open before it.
 */
export interface Accordion {
  openId: string | null;
  onToggle: (id: string) => void;
}

/** One section's slice of an Accordion, in the shape CollapsibleSection takes. */
export function sectionState(
  accordion: Accordion,
  id: string,
): { isOpen: boolean; onToggle: () => void } {
  return {
    isOpen: accordion.openId === id,
    onToggle: () => accordion.onToggle(id),
  };
}

/**
 * A titled group of editor controls that folds away to its header.
 *
 * The header says what is chosen inside — "Blush", "Comfortable" — so a host
 * can read the whole tab from its headers and open only the one they came to
 * change. The fold is a grid row going from 0fr to 1fr, which animates to the
 * content's real height without measuring it.
 *
 * A closed section's controls stay mounted, and `inert` takes them out of the
 * tab order and the accessibility tree while they are folded away. Mounted
 * because that is what they were before this existed, and because unmounting
 * would lose anything a control keeps for itself, like the scroll target in
 * SectionManager.
 */
export default function CollapsibleSection({
  title,
  summary,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  /** The current choice, shown beside the title. Text, or a small preview. */
  summary?: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}): ReactElement {
  const id = useId();
  const panelId = `${id}-panel`;
  const rootRef = useRef<HTMLElement>(null);
  const scrollTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (scrollTimer.current !== null) {
        window.clearTimeout(scrollTimer.current);
      }
    },
    [],
  );

  /**
   * Brings a section the host just opened into view.
   *
   * After the fold rather than on the click: the section that was open above
   * this one is collapsing at the same moment, so the header is still moving
   * until the transition ends. Only when it needs to — a header already in the
   * top half of the screen has its controls in view, and jumping the page under
   * a host who can already see what they opened is worse than not scrolling.
   * `scroll-mt` on the root keeps it clear of the sticky top bar.
   */
  const scrollIntoViewSoon = (): void => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (scrollTimer.current !== null) {
      window.clearTimeout(scrollTimer.current);
    }

    scrollTimer.current = window.setTimeout(
      () => {
        scrollTimer.current = null;
        const node = rootRef.current;

        if (node === null) {
          return;
        }

        const top = node.getBoundingClientRect().top;
        const margin = parseFloat(getComputedStyle(node).scrollMarginTop) || 0;

        if (top < margin || top > window.innerHeight / 2) {
          node.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block: "start",
          });
        }
      },
      reduceMotion ? 0 : TRANSITION_MS,
    );
  };

  return (
    <section
      ref={rootRef}
      className={[
        "scroll-mt-36 rounded-2xl border transition-colors duration-150 lg:scroll-mt-28",
        isOpen
          ? "border-[var(--lifafa-marigold)]/45"
          : "border-[var(--lifafa-hairline)]",
      ].join(" ")}
    >
      <h2>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => {
            if (!isOpen) {
              scrollIntoViewSoon();
            }

            onToggle();
          }}
          className="group flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          <span
            className={[
              "shrink-0 text-[0.6875rem] tracking-[0.2em] uppercase transition-colors duration-150",
              isOpen
                ? "text-[var(--lifafa-marigold)]"
                : "text-[var(--lifafa-cream)] group-hover:text-[var(--lifafa-marigold)]",
            ].join(" ")}
          >
            {title}
          </span>

          {summary !== undefined ? (
            <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5 text-[0.8125rem] text-[var(--lifafa-muted)]">
              {typeof summary === "string" ? (
                <span className="truncate">{summary}</span>
              ) : (
                summary
              )}
            </span>
          ) : (
            <span className="flex-1" />
          )}

          <svg
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 20 20"
            className={[
              "h-4 w-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
              isOpen
                ? "rotate-180 text-[var(--lifafa-marigold)]"
                : "text-[var(--lifafa-muted)]",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 7.5 10 12.5 15 7.5" />
          </svg>
        </button>
      </h2>

      <div
        id={panelId}
        inert={!isOpen}
        className={[
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        ].join(" ")}
      >
        {/*
          `min-h-0` is what lets the row actually reach 0fr, and the padding is
          inside the clip so the focus rings on the controls nearest the edges
          are not cut off.
        */}
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-3 px-4 pt-1 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}
