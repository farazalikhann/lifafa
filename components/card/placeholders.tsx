"use client";

import { createContext, useContext, type ReactElement, type ReactNode } from "react";

/**
 * Whether the card shows its placeholders ("Your names", "Event title", "Date
 * and time", "Venue name") where a detail has not been given.
 *
 * In the editor's previews, yes: they show the host where each detail will
 * go. Everywhere a guest looks, and the host's own look at the saved card
 * (/i/, the full-screen preview, which is the guest's view), no: every detail
 * is optional, so an empty one is left out and its section with it, and the
 * card still reads as finished. Shown by default, so a card drawn without a
 * scope is as it always was.
 */
const ShowPlaceholdersContext = createContext(true);

export function useShowPlaceholders(): boolean {
  return useContext(ShowPlaceholdersContext);
}

export function PlaceholderScope({
  show,
  children,
}: {
  show: boolean;
  children: ReactNode;
}): ReactElement {
  return <ShowPlaceholdersContext.Provider value={show}>{children}</ShowPlaceholdersContext.Provider>;
}
