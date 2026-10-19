"use client";

import { useSyncExternalStore } from "react";

/**
 * A modest phone: four cores or fewer, or four gigabytes or less. Its rooms
 * crossfade instead of zooming and it shows half the glints. Never on the
 * server, which knows nothing of the guest's phone.
 */
export function isLite(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  const cores = navigator.hardwareConcurrency;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  return (cores !== undefined && cores > 0 && cores <= 4) || (memory !== undefined && memory <= 4);
}

const never = (): (() => void) => () => undefined;

/** isLite for a component: false on the server and in hydration, then the phone's answer. */
export function useLite(): boolean {
  return useSyncExternalStore(never, isLite, () => false);
}
