"use client";

import { useSyncExternalStore, type ReactNode } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("load", onChange);
  return () => window.removeEventListener("load", onChange);
}

/**
 * Its children, once the page has finished loading, and nothing before.
 *
 * For the pictures below the first screen. A lazy picture is still fetched as
 * soon as it is within the browser's own distance of the screen, which on a
 * phone takes in the designs right under the hero, and on a slow connection
 * those would share the line with the hero's own picture. Held back until
 * `load`, which waits for the hero, they cannot. Each is still lazy after
 * that, so the ones further down wait for the visitor to come near them.
 *
 * The server and the first render have nothing here; the box around it keeps
 * its size, so nothing moves when the picture arrives.
 */
export default function AfterLoad({ children }: { children: ReactNode }) {
  const loaded = useSyncExternalStore(
    subscribe,
    () => document.readyState === "complete",
    () => false,
  );

  return loaded ? children : null;
}
