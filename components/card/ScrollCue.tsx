"use client";

import type { CSSProperties, ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { REVEAL_BASE, revealClass } from "@/lib/cardFormat";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Retires the cue once it has risen into the top third of the screen — which
 * it can only do once the guest has genuinely scrolled. The same inset the
 * cover's own cue uses, and for the same reason: the cue starts at the foot of
 * the screen, already in view, so a plain "is it on screen" test would retire
 * it before the guest had done anything.
 */
const RETIRE_OPTIONS: IntersectionObserverInit = {
  threshold: 0,
  rootMargin: "0px 0px -70% 0px",
};

/**
 * "Scroll", and a line running down from it, at the foot of a first screen
 * that is not the cover.
 *
 * The cover teaches the gesture itself — see CoverSection. But a card that
 * opens on its blessing puts the cover a whole screen down, and that first
 * screen is a Bismillah, a greeting and a dua, centred and complete. Nothing
 * on it says there is more, and a guest could reasonably read it, think that
 * was the card, and close it. This is the cover's cue, in the cover's words
 * and motion, moved up to the screen the guest actually lands on.
 *
 * Placed by the caller in the empty band the first screen keeps under its
 * content, so it never sits on the writing; and it is its own sentinel, so
 * it needs no marker of its own. Latches retired, like the cover's.
 */
export default function ScrollCue({
  label,
  textColor,
  accent,
  style,
}: {
  label: string;
  textColor: string;
  accent: string;
  /** Where the caller puts it. */
  style?: CSSProperties;
}): ReactElement {
  const { ref, isInView: hasScrolled } = useInView<HTMLDivElement>(
    RETIRE_OPTIONS,
    /* false: "has the guest scrolled yet?" must not default to yes. */
    false,
  );

  /* useInView reports in view outright under reduced motion; the cue stays. */
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const retired = !prefersReducedMotion && hasScrolled;

  return (
    <div
      ref={ref}
      aria-hidden={retired}
      className={`pointer-events-none absolute inset-x-0 flex flex-col items-center gap-2 ${REVEAL_BASE} ${revealClass(
        !retired,
      )}`}
      style={style}
    >
      <span
        className="text-[calc(0.765*var(--card-rem,1rem))] tracking-[0.3em] uppercase"
        style={{ color: textColor }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        className="h-9 w-px animate-[lifafa-cue_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${accent}, transparent)`,
        }}
      />
    </div>
  );
}
