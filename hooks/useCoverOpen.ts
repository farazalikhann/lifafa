"use client";

import { createContext, useContext } from "react";

/**
 * Whether the cover over the card has finished opening and gone.
 *
 * Not the reveal gate. That one opens part way through the cover's animation,
 * so the card can be arriving underneath as the cover leaves (see
 * hooks/useRevealGate.ts). This answers the later question, "is the guest now
 * looking at the card itself?", which is what something that must wait for the
 * whole envelope or curtain to clear needs to know.
 *
 * `true` by default, so a page with no cover counts as open from the start.
 * Only CoverShell narrows it.
 */
export const CoverOpenContext = createContext<boolean>(true);

export function useCoverOpen(): boolean {
  return useContext(CoverOpenContext);
}

/**
 * Whether the cover has finished its wait and is drawn (its loader gone), or
 * there is no cover. Earlier than CoverOpenContext: the guest is looking at
 * the envelope, not yet at the card.
 *
 * For a card's pictures far below its first screen. Asked for while the
 * cover is still waiting, they share a phone's slow line with the cover's own
 * pictures, and the cover (the page's largest paint) is held until those are
 * in. Asked for here instead, they load while the guest reads the envelope
 * and taps it, and are in long before the guest scrolls down to them.
 *
 * `true` by default, like CoverOpenContext. Only CoverShell narrows it.
 */
export const CoverReadyContext = createContext<boolean>(true);

export function useCoverReady(): boolean {
  return useContext(CoverReadyContext);
}
