"use client";

import { useCallback } from "react";

/**
 * Holds a floating layer's CSS loops still while nobody could be watching
 * them: the tab hidden, or the card scrolled off the screen.
 *
 * The butterflies' flight has always stopped itself then; see `startFlight`
 * in components/card/decor/ButterflyLayer.tsx. What had not were the loops
 * the compositor plays from a stylesheet: the wingbeat, the leaves, the seeds
 * and feathers, the fireflies and everything that falls. A browser draws none
 * of that for a hidden tab, but for a card scrolled out of view it goes on
 * ticking every one of them, on a phone that has an RSVP form to draw.
 *
 * Returns a ref for the layer's root. It marks the root `data-floating-paused`
 * and a rule in globals.css pauses every animation under it, so nothing here
 * is React state and nothing renders again. A ref callback with a cleanup, so
 * it follows a layer that mounts late, as the petals do.
 */
export function useFloatingPause(): (node: HTMLElement | null) => (() => void) | undefined {
  return useCallback((node: HTMLElement | null) => {
    if (node === null) {
      return undefined;
    }

    let onScreen = true;

    const sync = (): void => {
      node.toggleAttribute(
        "data-floating-paused",
        !onScreen || document.visibilityState !== "visible",
      );
    };

    const observer =
      typeof IntersectionObserver === "function"
        ? new IntersectionObserver((entries) => {
            onScreen = entries.some((entry) => entry.isIntersecting);
            sync();
          })
        : null;

    observer?.observe(node);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);
}
