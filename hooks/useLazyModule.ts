"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { SLOW_LOAD_MS, clearWaiting, reportWaiting } from "@/lib/loadNotice";

/**
 * Code fetched when it is first needed, with a way back from a failed fetch.
 *
 * WHY NOT next/dynamic. A dynamic component is React.lazy underneath, and
 * React.lazy keeps a failed import for good: one chunk that does not arrive
 * (the connection dropped, a slow line gave up) throws on every render after,
 * up to the nearest error boundary, which on /create took the whole editor
 * with it. Here a failure is a state like loading is: the caller draws its
 * skeleton, the network notice offers "Try again", and a retry fetches the
 * chunk again (webpack forgets a chunk that failed).
 *
 * One fetch per loader for the page's life, shared by every caller. Kept slow
 * past SLOW_LOAD_MS, or failed, it is reported to lib/loadNotice.ts under
 * `id`, and cleared from there when it arrives.
 */

type Status = "idle" | "loading" | "done" | "failed";

interface Entry {
  status: Status;
  value: unknown;
  listeners: Set<() => void>;
}

const entries = new Map<() => Promise<unknown>, Entry>();

function entryFor(load: () => Promise<unknown>): Entry {
  let entry = entries.get(load);

  if (entry === undefined) {
    entry = { status: "idle", value: null, listeners: new Set() };
    entries.set(load, entry);
  }

  return entry;
}

function set(entry: Entry, status: Status, value: unknown = entry.value): void {
  entry.status = status;
  entry.value = value;
  for (const listener of entry.listeners) {
    listener();
  }
}

/** Starts the fetch if it is not done or under way: for a preload, and for a retry after a failure. */
export function startLoad(load: () => Promise<unknown>): void {
  const entry = entryFor(load);

  if (entry.status === "loading" || entry.status === "done") {
    return;
  }

  set(entry, "loading");
  load().then(
    (value) => set(entry, "done", value),
    () => set(entry, "failed"),
  );
}

export function useLazyModule<T>(
  load: () => Promise<T>,
  {
    wanted,
    id,
  }: {
    /** Whether the page needs it now: fetched, and reported while it waits. */
    wanted: boolean;
    /** Its name in the network notice. */
    id: string;
  },
): { module: T | null; failed: boolean; retry: () => void } {
  const entry = entryFor(load);
  const subscribe = useCallback(
    (listener: () => void) => {
      entry.listeners.add(listener);
      return () => entry.listeners.delete(listener);
    },
    [entry],
  );
  const status = useSyncExternalStore(
    subscribe,
    () => entry.status,
    () => "idle" as Status,
  );
  const retry = useCallback(() => startLoad(load), [load]);

  useEffect(() => {
    if (wanted) {
      startLoad(load);
    }
  }, [wanted, load]);

  useEffect(() => {
    if (!wanted || status === "done") {
      clearWaiting(id);
      return;
    }

    if (status === "failed") {
      reportWaiting(id, { kind: "failed", retry });
      return;
    }

    /* Loading, a retry included: nothing to say until it has taken too long. */
    clearWaiting(id);
    const timer = window.setTimeout(() => reportWaiting(id, { kind: "slow", retry }), SLOW_LOAD_MS);

    return () => window.clearTimeout(timer);
  }, [wanted, status, id, retry]);

  /* Gone from the page: it no longer holds anything up. */
  useEffect(() => () => clearWaiting(id), [id]);

  return {
    module: status === "done" ? (entry.value as T) : null,
    failed: status === "failed",
    retry,
  };
}
