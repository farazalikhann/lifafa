"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Roughly how tall the popover gets: a 144px demo, a heading, three lines of
 * copy and a 44px button. Only used to decide which side of the "?" it opens
 * on, so it wants to be a little generous rather than exact — the cost of
 * guessing high is a popover that opens upward with room to spare, and the cost
 * of guessing low is one with its Close button under the fold.
 */
const POPOVER_HEIGHT = 340;

/**
 * The "?" beside a panel heading, and the little demo behind it.
 *
 * WHY THIS EXISTS. Most of the editor explains itself by sitting next to the
 * preview: change the palette and the card beside you changes. A handful of
 * panels cannot do that, because what they switch on happens somewhere the host
 * will never be — on a guest's phone, at the door on the day, on the dashboard
 * a week later. Those panels got a "?" and one of these.
 *
 * NOTHING AUTOPLAYS. The demo is not rendered at all until the popover opens
 * and is unmounted the moment it closes, so a host on the Extras tab is not
 * running four CSS loops they did not ask for. That is also why the demo is
 * `children` rather than a prop naming one: React does not construct the
 * element's subtree while this component is shut, so the cost of a closed
 * popover is the button and nothing else.
 *
 * A SHEET ON A PHONE, A POPOVER ON A DESKTOP, and the same element for both —
 * `fixed` to the bottom of the screen until `lg`, where it becomes `absolute`
 * under the button that opened it. Done with classes rather than a media query
 * in JavaScript on purpose: this thing appears on a tap, and a layout that
 * settles one commit after the tap would be visible.
 *
 * The one measurement it does take is which side of the button to open on.
 * Check-in is the last panel in the Extras tab and Reply form is the last in
 * Structure, so on a laptop the "?" that needs this most is usually near the
 * bottom of the window — and an `absolute` popover cannot rescue itself the way
 * a browser rescues a `<select>`. The rectangle is read in the click handler,
 * before the popover exists, so the decision is made in the same commit that
 * opens it and nothing is ever painted in the wrong place.
 *
 * The bottom is where the sheet goes because of what it must not cover. The
 * heading the host just tapped, and the controls directly under it, are what
 * they came to understand; a sheet in the middle of the screen would sit on top
 * of exactly that. Pinned low and capped at 70% of the viewport, it takes the
 * space the editor's own two bottom bars were using — which are unusable while
 * a modal is open anyway — and leaves the panel itself in view.
 *
 * MODAL ON BOTH, which is the honest reading of a full-screen click-catcher: a
 * click anywhere outside dismisses it, so nothing outside is really available.
 * The backdrop is only tinted below `lg`; at `lg` it is invisible and does the
 * one job of catching the click. Escape closes, and either way the focus goes
 * back to the "?" the host pressed, not to the top of the document.
 */
export default function FeatureHelp({
  label,
  description,
  children,
}: {
  /**
   * The button's name, read instead of the bare "?" — "How guest check-in
   * works". Names the popover as well, so a screen reader arriving in it hears
   * what it is before the sentence inside.
   */
  label: string;
  /**
   * One line of plain English, and the whole explanation on its own. The demo
   * is decorative and hidden from assistive technology, so anything this line
   * leaves out is not said at all.
   */
  description: string;
  /** The demo. Built only while the popover is open. */
  children: ReactNode;
}): ReactElement {
  const [open, setOpen] = useState(false);
  /** Whether this one opens above its button rather than below it. */
  const [dropUp, setDropUp] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      panelRef.current?.focus();
    }
  }, [open]);

  const openPopover = (): void => {
    const rect = buttonRef.current?.getBoundingClientRect();

    /*
      Measured against the window rather than against the scrolling panel: the
      popover is fixed to the viewport below `lg` and absolute above it, but in
      both cases what it must not fall off the bottom of is the window.
    */
    setDropUp(
      rect !== undefined && window.innerHeight - rect.bottom < POPOVER_HEIGHT,
    );
    setOpen(true);
  };

  const close = (): void => {
    setOpen(false);
    /*
      The button is still mounted — only the popover goes — so this is a plain
      restore rather than a scramble for somewhere sensible to land.
    */
    buttonRef.current?.focus();
  };

  /*
    Escape, and a Tab that keeps the focus inside. The only focusable thing in
    the popover is Close: the demo is inert and the sentence is text, so
    trapping is one line rather than a sweep for tab stops.
  */
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      closeRef.current?.focus();
    }
  };

  return (
    /*
      `relative` so the `lg` popover can hang off the button, and nothing else.
      No z-index here: the popover carries its own and has to beat a backdrop
      that is fixed to the viewport, which it cannot do from inside a stacking
      context this wrapper had created.
    */
    <span className="relative inline-flex shrink-0">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => (open ? close() : openPopover())}
        /*
          44px of tap target around a 22px circle. The circle is what the host
          sees — anything bigger would shout next to an 11px heading — and the
          padding around it is what a thumb actually gets, the same 44 every
          other control in the editor offers.
        */
        className="group -my-2.5 flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        <span
          aria-hidden="true"
          className={`flex size-[1.375rem] items-center justify-center rounded-full border text-[0.6875rem] leading-none font-semibold transition-colors duration-150 ${
            open
              ? "border-[var(--lifafa-marigold)] text-[var(--lifafa-marigold)]"
              : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] group-hover:border-[var(--lifafa-muted)] group-hover:text-[var(--lifafa-cream)]"
          }`}
        >
          ?
        </span>
      </button>

      {open ? (
        <>
          {/*
            The click-catcher. A div rather than a button because it is not an
            answer to anything — it is the absence of one — so it stays out of
            the tab order and out of the accessibility tree, and Escape is the
            keyboard's way to do the same thing.
          */}
          <div
            aria-hidden="true"
            onClick={close}
            className="fixed inset-0 z-40 bg-[var(--lifafa-ink)]/70 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none"
          />

          <div
            id={panelId}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            /* Where the focus lands on open; never a stop in the tab order. */
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            className={[
              "fixed inset-x-0 bottom-0 z-50 flex max-h-[70svh] flex-col gap-3 overflow-y-auto",
              "rounded-t-2xl border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
              /*
                From `lg` it is a popover beside its own button instead. Left
                aligned because the "?" always sits at the start of a heading
                line, so there is a column's worth of room to its right and
                none of the flipping that a right-aligned one would need.
              */
              "lg:absolute lg:inset-x-auto lg:left-0 lg:w-[19rem] lg:max-w-[calc(100vw-3rem)] lg:max-h-none lg:rounded-2xl lg:border lg:px-4 lg:pt-4 lg:pb-4",
              dropUp ? "lg:top-auto lg:bottom-11" : "lg:top-11 lg:bottom-auto",
            ].join(" ")}
          >
            {/* The handle says "drag me down" on a phone; it is scenery at lg. */}
            <span
              aria-hidden="true"
              className="mx-auto h-1 w-9 shrink-0 rounded-full bg-[var(--lifafa-hairline)] lg:hidden"
            />

            <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-marigold)] uppercase">
              {label}
            </h3>

            {/*
              DECORATIVE, AND SAID SO ONCE, HERE. Every demo is a pile of empty
              divs standing in for a phone or a headcount; none of it means
              anything read aloud, and the sentence under it is written to be
              the whole answer. Marking it in this wrapper rather than in each
              demo is what keeps that true of a demo added later.
            */}
            <div
              aria-hidden="true"
              className="h-36 w-full shrink-0 overflow-hidden rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]"
            >
              {children}
            </div>

            <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
              {description}
            </p>

            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="min-h-11 shrink-0 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              Close
            </button>
          </div>
        </>
      ) : null}
    </span>
  );
}
