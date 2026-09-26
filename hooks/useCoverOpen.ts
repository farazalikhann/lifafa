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
