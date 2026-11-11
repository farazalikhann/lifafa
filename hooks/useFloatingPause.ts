"use client";

import { useCallback } from "react";
import { motionHeld, subscribeMotion, useMotionStill } from "@/lib/motionBudget";

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
 *
 * Held as well while the host types in the editor, and always in a card
 * drawn as a still picture (lib/motionBudget.ts).
 */
export function useFloatingPause(): (node: HTMLElement | null) => (() => void) | undefined {
  const still = useMotionStill();

  return useCallback((node: HTMLElement | null) => {
    if (node === null) {
      return undefined;
    }

    let onScreen = true;

    const sync = (): void => {
      node.toggleAttribute(
        "data-floating-paused",
        still || motionHeld() || !onScreen || document.visibilityState !== "visible",
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
    const unsubscribe = subscribeMotion(sync);
    sync();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      unsubscribe();
    };
  }, [still]);
}
