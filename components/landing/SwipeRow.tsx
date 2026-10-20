"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * A row of cards that a phone swipes through sideways, with a dot for each
 * card under it; side by side, and no dots, once they all fit.
 *
 * The cards are the server's, passed in as `children` (each an `li`); all
 * this adds is the dots. The dot of the card nearest the row's start is lit,
 * read from the scroll position once a frame at most, and tapping a dot
 * scrolls to its card. Dots appear only while the row is wider than the
 * screen. A dot lights by opacity and scale alone.
 */
export default function SwipeRow({
  labels,
  label,
  children,
}: {
  /** Each card's name, in order, for its dot. */
  labels: readonly string[];
  /** What the row is, for a screen reader. */
  label: string;
  children: ReactNode;
}): ReactElement {
  const rowRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [overflowing, setOverflowing] = useState(true);

  useEffect(() => {
    const row = rowRef.current;

    if (row === null) {
      return;
    }

    let frame = 0;
    const read = (): void => {
      frame = 0;
      const cards = [...row.children] as HTMLElement[];
      const start = row.scrollLeft;
      const inset = parseFloat(getComputedStyle(row).paddingLeft);
      /* How far a card is from where the row snaps it: its offset is from the row's own edge. */
      const away = (card: HTMLElement): number =>
        Math.abs(card.offsetLeft - inset - start);
      let nearest = 0;

      cards.forEach((card, index) => {
        if (away(card) < away(cards[nearest])) {
          nearest = index;
        }
      });

      /* At the end of the row the last card is the one in view, however far it is from the start. */
      if (start + row.clientWidth >= row.scrollWidth - 2) {
        nearest = cards.length - 1;
      }

      setActive(nearest);
      setOverflowing(row.scrollWidth > row.clientWidth + 1);
    };
    const onScroll = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(read);
      }
    };

    read();
    row.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(onScroll);
    observer.observe(row);

    return () => {
      row.removeEventListener("scroll", onScroll);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const show = (index: number): void => {
    const row = rowRef.current;
    const card = row?.children[index] as HTMLElement | undefined;

    if (row === null || row === undefined || card === undefined) {
      return;
    }

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    row.scrollTo({
      left: card.offsetLeft - parseFloat(getComputedStyle(row).paddingLeft),
      behavior: still ? "auto" : "smooth",
    });
  };

  return (
    <div>
      {/*
        `safe center`: centred while the cards fit, from the start once they
        do not, so the first is never cut off out of reach. `relative`, so
        each card's offset is measured from the row, whatever its scroll.
      */}
      <ul
        ref={rowRef}
        aria-label={label}
        className="lifafa-no-scrollbar relative -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-2 pb-4 [justify-content:safe_center] sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:gap-12"
      >
        {children}
      </ul>

      <div
        className={`mt-2 flex justify-center gap-1 ${overflowing ? "" : "invisible"}`}
        aria-hidden={overflowing ? undefined : true}
      >
        {labels.map((name, index) => (
          <button
            key={name}
            type="button"
            aria-label={`Show ${name}`}
            aria-current={index === active ? "true" : undefined}
            tabIndex={overflowing ? undefined : -1}
            onClick={() => show(index)}
            className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--lifafa-marigold)]"
          >
            <span
              className={`h-2 w-2 rounded-full bg-[var(--lifafa-marigold)] transition-[opacity,scale] duration-300 motion-reduce:transition-none ${
                index === active ? "scale-125 opacity-100" : "opacity-35"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
