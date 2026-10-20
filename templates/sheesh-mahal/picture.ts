"use client";

import { useSyncExternalStore } from "react";
import { useCoverOpen } from "@/hooks/useCoverOpen";
import { answer, coverIsLight, SETS, subscribe, type Art } from "@/templates/sheesh-mahal/lighter";

/* Which of the two sets a page is shown, and when: see lighter.ts. */

const never = (): (() => void) => () => undefined;

/** The cover's set, for the cover and page 2: null until the page has woken in the browser. */
export function useCoverArt(): Art | null {
  const which = useSyncExternalStore(never, () => (coverIsLight() ? "light" : "full"), () => null);
  return which === null ? null : SETS[which];
}

/**
 * The pictures for a room: null until the cover has opened (and on the
 * server), then the set for this guest. A printed copy and a preview have no
 * cover, and have them at once.
 */
export function useRoomArt(): Art | null {
  const open = useCoverOpen();
  const which = useSyncExternalStore(subscribe, answer, () => null);
  return !open || which === null ? null : SETS[which];
}
