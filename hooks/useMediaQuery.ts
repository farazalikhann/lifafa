"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches.
 *
 * Subscribed through `useSyncExternalStore` rather than an effect so the
 * server and the hydrating client agree by construction: React renders the
 * server snapshot — always `false` — for both passes, then re-renders with
 * the real match. Nothing reads `window` during the render that hydration
 * compares against, so there is no mismatch to warn about.
 *
 * `false` is the deliberate default: callers phrase the query as the *wider*
 * layout, so the server, a client without `matchMedia`, and the first paint
 * all fall through to the narrow branch.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void): (() => void) => {
      if (typeof window.matchMedia !== "function") {
        return () => {};
      }

      const list = window.matchMedia(query);
      list.addEventListener("change", onStoreChange);

      return () => {
        list.removeEventListener("change", onStoreChange);
      };
    },
    [query],
  );

  const getSnapshot = useCallback((): boolean => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return false;
    }

    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback((): boolean => false, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
