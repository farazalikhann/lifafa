"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import type { DividerArt } from "@/lib/cardDecor";

/** Armed a little before it is fully on screen, so it is opening as it arrives. */
const REVEAL_OPTIONS: IntersectionObserverInit = {
  threshold: 0.2,
  rootMargin: "0px 0px -6% 0px",
};

/**
 * A garland between two sections of the card.
 *
 * Four fifths of the column, centred. It opens from its middle as the guest
 * scrolls to it — a little wider, a little clearer — once, and stays. Only
 * transform and opacity move. Under reduced motion `useInView` reports it in
 * view from the start, and it is simply there.
 *
 * Loaded lazily: every one of them is below the first screen. Its width and
 * height are on the element, so the space it will take is held before the
 * picture arrives and nothing on the card moves when it does.
 */
export default function FloralDivider({ art }: { art: DividerArt }): ReactElement {
  const { ref, isInView } = useInView<HTMLDivElement>(REVEAL_OPTIONS);

  return (
    <div ref={ref} aria-hidden="true" className="flex justify-center">
      <img
        src={art.src}
        alt=""
        width={art.width}
        height={art.height}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-auto w-4/5 select-none transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
        style={{
          transform: isInView ? "scaleX(1)" : "scaleX(0.6)",
          opacity: isInView ? 1 : 0,
        }}
      />
    </div>
  );
}
