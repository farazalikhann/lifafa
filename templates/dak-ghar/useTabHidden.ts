"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/**
 * Whether the tab is hidden, for pausing the idle loops (the cover's petals,
 * pigeon and vines) while nobody is looking. False on the server.
 */
export function useTabHidden(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "hidden",
    () => false,
  );
}
