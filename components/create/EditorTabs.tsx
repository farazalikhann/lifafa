"use client";

import {
  useRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";

/** Tailwind's `lg`: 64rem, the breakpoint the editor's two-column grid uses. */
const LG_QUERY = "(min-width: 64rem)";

export type EditorTabId = "details" | "design" | "structure" | "extras";

/** One panel, so one id, and every tab in either bar points at it. */
const PANEL_ID = "editor-panel";

function tabDomId(id: EditorTabId): string {
  return `editor-tab-${id}`;
}

/*
  Inline SVG, drawn on the same 24 grid and in the same line weight as the icons
  already in SectionManager and SubEventEditor. `currentColor` throughout, so a
  tab's selected state colours its icon by inheritance and there is no second
  place to keep the marigold in step.
*/
function TabIcon({ children }: { children: ReactNode }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** A card with writing on it: the names, the date, the place. */
function DetailsIcon(): ReactElement {
  return (
    <TabIcon>
      <rect x={4} y={4} width={16} height={16} rx={2.5} />
      <path d="M8 9.5h8M8 13h8M8 16.5h4" />
    </TabIcon>
  );
}

/** A brush, mid stroke. */
function DesignIcon(): ReactElement {
  return (
    <TabIcon>
      <path d="M6 14.5 14.8 5.7a2.4 2.4 0 0 1 3.4 3.4L9.5 18" />
      <path d="M9.5 18c-1 1-2.2 1.3-3.5 1.3.6-1 .4-2.2-.6-3.2s-2.2-1.2-3.2-.6c0-1.3.3-2.5 1.3-3.5" />
    </TabIcon>
  );
}

/** Two switches, because everything in this tab is one. */
function ExtrasIcon(): ReactElement {
  return (
    <TabIcon>
      <rect x={3} y={5} width={18} height={6} rx={3} />
      <circle cx={16.5} cy={8} r={1.6} />
      <rect x={3} y={13} width={18} height={6} rx={3} />
      <circle cx={7.5} cy={16} r={1.6} />
    </TabIcon>
  );
}

/** Stacked rows, in an order. */
function StructureIcon(): ReactElement {
  return (
    <TabIcon>
      <rect x={4} y={4} width={16} height={4.5} rx={1.5} />
      <rect x={4} y={11} width={16} height={4.5} rx={1.5} />
      <path d="M7 19h10" />
    </TabIcon>
  );
}

const TABS: readonly {
  id: EditorTabId;
  label: string;
  Icon: () => ReactElement;
}[] = [
  { id: "details", label: "Details", Icon: DetailsIcon },
  { id: "design", label: "Design", Icon: DesignIcon },
  { id: "structure", label: "Structure", Icon: StructureIcon },
  { id: "extras", label: "Extras", Icon: ExtrasIcon },
];

/*
  Which way each key moves the selection. Left and right are what the editor
  asks for; up and down are here because the desktop bar is a vertical tablist,
  and a vertical tablist that ignores the vertical arrows is the first thing a
  keyboard user will try.
*/
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

/**
 * The dot that says a tab is holding a blank the host probably wants filled.
 *
 * One tab can show it and one condition raises it, so there is no rule engine
 * here and no status object threaded through four panels — the page works out
 * the single answer and passes a boolean. The sr-only half is not decoration
 * either: a bare coloured dot says nothing at all to a screen reader.
 */
function IncompleteDot(): ReactElement {
  return (
    <>
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-[var(--lifafa-marigold)]"
      />
      <span className="sr-only">, some details are still empty</span>
    </>
  );
}

/**
 * One tab in either bar.
 *
 * Everything the two bars must agree on — the id, the ARIA wiring, the roving
 * `tabIndex`, the click — is here once. Each bar supplies only its own
 * `className` and what goes inside, because that is genuinely all they differ
 * by: a row with a left border, or a segment with an icon over a label.
 */
function TabButton({
  id,
  isSelected,
  onSelect,
  buttonRef,
  className,
  children,
}: {
  id: EditorTabId;
  isSelected: boolean;
  onSelect: (id: EditorTabId) => void;
  buttonRef: (node: HTMLButtonElement | null) => void;
  className: string;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      id={tabDomId(id)}
      ref={buttonRef}
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-controls={PANEL_ID}
      /* One stop in the tab order for the whole bar; the arrows do the rest. */
      tabIndex={isSelected ? 0 : -1}
      onClick={() => onSelect(id)}
      className={className}
    >
      {children}
    </button>
  );
}

/**
 * Four tabs over the editor's controls, and the one mounted panel.
 *
 * WHY. The form was a single column of more than ten groups in the order they
 * were built in, which on a phone put the colour picker about fifteen screens
 * below the names. The groups are the same groups; what is new is that they sit
 * in four named piles and only one pile is on screen at a time.
 *
 * The four are the facts, the look, the running order, and the extras. Design
 * and Decoration used to be two of them and are now one: a host choosing how
 * their card looks does not think of the palette and the ornament as different
 * errands, and splitting them meant deciding which tab a border belonged to
 * every time one was added.
 *
 * Extras is what that merge made room for, and it is a different kind of pile
 * from the other three. Everything in it is off until the host switches it on
 * — the cover the guest taps, the scratch panel, the music, the weather, the
 * QR check-in — and they used to be scattered across Decoration and Structure
 * by an argument about what each one technically was. A host is not looking
 * for "a treatment drawn on the card"; they are looking for the things they
 * can add, and now those are in one place.
 *
 * ONLY THE SELECTED PANEL IS MOUNTED. `children` is already just that panel:
 * the page decides which one to build and the other three do not exist in the
 * tree. Four panels with three hidden by CSS would mean every keystroke in the
 * name field re-rendering the typography specimens, the six border miniatures
 * and both blessing lists for nobody. The cost of that decision is that a
 * panel's own state dies when the host leaves it, which is why every value
 * these controls read lives in app/create/page.tsx.
 *
 * ONE TABLIST AT A TIME, chosen by media query rather than two lists with one
 * hidden by CSS: `role="tab"` elements need ids for the panel's
 * `aria-labelledby` to point at, and two of everything would mean two elements
 * each claiming to label the one panel. `useMediaQuery` reports false on the
 * server and in the first client pass, which is the right way round here — the
 * phone, the case this reorganisation is for, gets its bar in the first paint
 * and a desktop swaps to the sidebar one commit later.
 */
export default function EditorTabs({
  selected,
  onSelect,
  detailsIncomplete,
  children,
}: {
  selected: EditorTabId;
  onSelect: (id: EditorTabId) => void;
  /** Whether Details is missing the event title, the date or the venue name. */
  detailsIncomplete: boolean;
  /** The selected tab's controls, and only those. */
  children: ReactNode;
}): ReactElement {
  const isWide = useMediaQuery(LG_QUERY);
  /*
    Only ever holds the buttons of whichever bar is mounted, because only one
    ever is. Keyed by tab id rather than by index, so a stale entry cannot hand
    focus to the wrong tab's node.
  */
  const buttonRefs = useRef<Map<EditorTabId, HTMLButtonElement>>(new Map());

  const registerRef =
    (id: EditorTabId) =>
    (node: HTMLButtonElement | null): void => {
      if (node === null) {
        buttonRefs.current.delete(id);
      } else {
        buttonRefs.current.set(id, node);
      }
    };

  /**
   * Arrow keys move the selection and the focus together.
   *
   * Automatic activation, which is the right pattern here: switching tabs is
   * instant and has no side effect, so making the host press Enter after
   * arriving would be ceremony. The focus is moved by hand because the roving
   * `tabIndex` is React state and the browser will not follow it on its own.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = TABS.findIndex((tab) => tab.id === selected);
    const step = KEY_STEPS[event.key];

    let next: EditorTabId | null = null;

    if (step !== undefined) {
      next = TABS[(index + step + TABS.length) % TABS.length].id;
    } else if (event.key === "Home") {
      next = TABS[0].id;
    } else if (event.key === "End") {
      next = TABS[TABS.length - 1].id;
    }

    if (next === null) {
      return;
    }

    /* Otherwise the arrows scroll the page out from under the bar as well. */
    event.preventDefault();
    onSelect(next);
    buttonRefs.current.get(next)?.focus();
  };

  const showDot = (id: EditorTabId): boolean =>
    id === "details" && detailsIncomplete;

  return (
    <div className="min-w-0 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-6">
      {isWide ? (
        /*
          Sticks level with the preview across from it, so all four tabs stay in
          reach however far down the panel the host has scrolled.
        */
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="Editor sections"
          onKeyDown={handleKeyDown}
          className="sticky top-24 flex flex-col gap-0.5 self-start"
        >
          {TABS.map((tab) => {
            const isSelected = tab.id === selected;

            return (
              <TabButton
                key={tab.id}
                id={tab.id}
                isSelected={isSelected}
                onSelect={onSelect}
                buttonRef={registerRef(tab.id)}
                className={[
                  "flex min-h-11 items-center gap-2.5 rounded-r-lg border-l-2 py-2.5 pr-2 pl-3 text-left text-[0.8125rem] font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                  isSelected
                    ? "border-[var(--lifafa-marigold)] bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)]"
                    : "border-transparent text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
                ].join(" ")}
              >
                <span
                  className={
                    isSelected
                      ? "text-[var(--lifafa-marigold)]"
                      : "text-[var(--lifafa-muted)]"
                  }
                >
                  <tab.Icon />
                </span>
                <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                {showDot(tab.id) ? <IncompleteDot /> : null}
              </TabButton>
            );
          })}
        </div>
      ) : null}

      <div
        id={PANEL_ID}
        role="tabpanel"
        aria-labelledby={tabDomId(selected)}
        /*
          Focusable, so a host who tabs off the bar lands on the controls the
          bar just swapped in rather than somewhere further down the document.
        */
        tabIndex={0}
        className="flex min-w-0 flex-col gap-9 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        {children}
      </div>

      {!isWide ? (
        /*
          Above the preview bar, not beside it.

          PreviewBar is fixed to the bottom of the screen and stands about 87px
          over the safe area: a hairline, 12px of padding, a 62px control and
          12px more. This bar sits 4.5rem up so that the two meet, and pads 16px
          of its own background *downward* into the overlap — PreviewBar is z-30
          to this bar's z-20 and paints over it, so overlapping costs nothing
          while falling a pixel short would show a sliver of scrolling page
          between them. Both grounds are the same ink, so the 8% of this one
          that comes through PreviewBar's blur is the colour it already was.

          `main` carries the bottom padding that keeps the last control of every
          panel clear of both bars.
        */
        <div
          role="tablist"
          aria-label="Editor sections"
          onKeyDown={handleKeyDown}
          className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 flex border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)] pt-1 pb-4"
        >
          {TABS.map((tab) => {
            const isSelected = tab.id === selected;

            return (
              <TabButton
                key={tab.id}
                id={tab.id}
                isSelected={isSelected}
                onSelect={onSelect}
                buttonRef={registerRef(tab.id)}
                className={[
                  /* Four equal segments, and 56px is the shortest of them. */
                  "relative flex min-h-14 flex-1 basis-0 flex-col items-center justify-center gap-1 border-t-2 transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                  isSelected
                    ? "border-[var(--lifafa-marigold)] bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-marigold)]"
                    : "border-transparent text-[var(--lifafa-muted)]",
                ].join(" ")}
              >
                <tab.Icon />
                <span
                  className={`text-[0.625rem] font-medium tracking-[0.08em] uppercase ${
                    isSelected
                      ? "text-[var(--lifafa-cream)]"
                      : "text-[var(--lifafa-muted)]"
                  }`}
                >
                  {tab.label}
                </span>

                {/* Beside the label rather than over the icon, which is small. */}
                {showDot(tab.id) ? (
                  <span className="absolute top-2 right-1/2 -mr-4 flex">
                    <IncompleteDot />
                  </span>
                ) : null}
              </TabButton>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
