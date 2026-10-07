"use client";

import { createContext, useContext } from "react";

/**
 * Whether the card is being shown as a picture of itself: one screen of it in
 * a frame on the home page, to be looked at and not used.
 *
 * Such a card has nobody to tap it, so anything that waits for a tap is drawn
 * as it stands once tapped: the royal scroll is open from its first paint,
 * without the unroll. Nothing else about the card changes, which is the
 * point of drawing the frame with the real card and not a screenshot of one.
 *
 * `false` by default, so every card a guest or a host is actually using is
 * untouched. Only components/landing/DemoSlideCard.tsx sets it.
 */
export const CardStillContext = createContext<boolean>(false);

export function useCardStill(): boolean {
  return useContext(CardStillContext);
}
