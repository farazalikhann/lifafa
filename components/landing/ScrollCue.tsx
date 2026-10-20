"use client";

import { useEffect, useRef, type MouseEvent, type ReactElement } from "react";

/**
 * "Scroll down to see a demo", with an arrow that bobs gently under it.
 *
 * A plain link to the demo section, so it works before any script and
 * without one. With script, the page glides there rather than jumping (at
 * once under reduced motion) and the focus moves to the section's heading,
 * so a keyboard carries on from there.
 *
 * The bob is a transform in globals.css (`.lifafa-bob`), still under reduced
 * motion and paused while the cue is off screen.
 */
export default function ScrollCue({ targetId }: { targetId: string }): ReactElement {
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const link = linkRef.current;

    if (link === null) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      link.toggleAttribute("data-offscreen", !entry.isIntersecting);
    });
    observer.observe(link);

    return () => observer.disconnect();
  }, []);

  const glide = (event: MouseEvent<HTMLAnchorElement>): void => {
    const target = document.getElementById(targetId);

    if (target === null) {
      return;
    }

    event.preventDefault();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    target
      .querySelector<HTMLElement>("h2")
      ?.focus({ preventScroll: true });
  };

  return (
    <a
      ref={linkRef}
      href={`#${targetId}`}
      onClick={glide}
      className="group inline-flex min-h-11 flex-col items-center gap-1 rounded px-2 text-sm font-medium text-[var(--lifafa-muted)] transition-colors duration-200 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
    >
      Scroll down to see a demo
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lifafa-bob h-5 w-5 text-[var(--lifafa-marigold)]"
      >
        <path d="M12 5 V19 M6 13 L12 19 L18 13" />
      </svg>
    </a>
  );
}
