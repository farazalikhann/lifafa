"use client";

import { useSyncExternalStore } from "react";
import { listGuests, subscribe } from "@/lib/guestStore";
import type { Guest } from "@/types/guest";

/**
 * Subscribes a component to the in-memory guest store.
 *
 * The server snapshot is the same function as the client one: the store starts
 * seeded from MOCK_GUESTS on both sides, so the first client render matches the
 * HTML and hydration stays quiet. Anything added after that is client-only, by
 * design — see the note in lib/guestStore.ts.
 */
export function useGuests(): readonly Guest[] {
  return useSyncExternalStore(subscribe, listGuests, listGuests);
}
