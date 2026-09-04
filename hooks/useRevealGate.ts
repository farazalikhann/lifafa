"use client";

import { createContext, useContext } from "react";

/**
 * Whether reveal-on-scroll animations are allowed to arm yet.
 *
 * The card is mounted underneath the cover from the first paint, so that a
 * cover has something real to open onto. That means its IntersectionObserver
 * reveals would otherwise run against a card nobody can see: the sections in
 * the first screenful intersect immediately, latch, and finish long before the
 * envelope is torn, and the guest's reward for opening it is a card that has
 * already finished arriving.
 *
 * `true` is the default, so every surface that has no cover over it — the
 * landing page, the designer's live preview — behaves exactly as before and
 * needs no provider at all. Only CoverShell narrows it, and only while its
 * cover is still up.
 */
export const RevealGateContext = createContext<boolean>(true);

/** Reads the gate. Consumed by useInView; components rarely need it directly. */
export function useRevealGate(): boolean {
  return useContext(RevealGateContext);
}
