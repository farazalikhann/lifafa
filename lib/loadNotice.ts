/**
 * What the network notice (components/network/NetworkNotice.tsx) says, kept
 * outside React so any part of a page can report to it.
 *
 * THREE THINGS. Whether the browser says it is online. Loads that are slow
 * (still waiting after SLOW_LOAD_MS) or have failed, each with its own retry.
 * And whether the page keeps the visitor's changes on this phone (the new
 * card on /create, lib/cardAutosave.ts), which decides what the notice
 * promises.
 *
 * A browser-only store: the server snapshot is "online, nothing waiting", so
 * the first render in the browser matches the server's.
 */

/** How long a load may take before the notice says the internet seems slow. */
export const SLOW_LOAD_MS = 8000;

export interface WaitingLoad {
  /** Slow: still loading. Failed: it gave up, and only a retry will bring it. */
  kind: "slow" | "failed";
  retry: () => void;
  /**
   * The retry loads the page again (what failed cannot be fetched twice in
   * one page). Never run by itself when the connection comes back, and not
   * offered while offline, where a reload would lose the page.
   */
  reloads?: boolean;
}

export interface LoadNoticeState {
  online: boolean;
  /** The most recent load still waiting, or null. */
  waiting: WaitingLoad | null;
  savesOnPhone: boolean;
}

const SERVER_STATE: LoadNoticeState = { online: true, waiting: null, savesOnPhone: false };

const loads = new Map<string, WaitingLoad>();
const listeners = new Set<() => void>();
let savesOnPhone = false;
let online = typeof navigator === "undefined" ? true : navigator.onLine;
let state: LoadNoticeState = SERVER_STATE;

function publish(): void {
  const all = [...loads.values()];
  state = { online, waiting: all.at(-1) ?? null, savesOnPhone };
  for (const listener of listeners) {
    listener();
  }
}

if (typeof window !== "undefined") {
  state = { online, waiting: null, savesOnPhone };
  window.addEventListener("online", () => {
    online = true;
    /* Back online: everything that failed is tried again, without a tap. */
    for (const load of [...loads.values()]) {
      if (load.kind === "failed" && load.reloads !== true) {
        load.retry();
      }
    }
    publish();
  });
  window.addEventListener("offline", () => {
    online = false;
    publish();
  });
}

export function subscribeLoadNotice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadNoticeState(): LoadNoticeState {
  return state;
}

export function serverLoadNoticeState(): LoadNoticeState {
  return SERVER_STATE;
}

/** A load, by a name of the reporter's choosing, is slow or has failed. */
export function reportWaiting(id: string, load: WaitingLoad): void {
  loads.delete(id);
  loads.set(id, load);
  publish();
}

/** The load has arrived, or no longer matters. */
export function clearWaiting(id: string): void {
  if (loads.delete(id)) {
    publish();
  }
}

/** Whether this page keeps the visitor's changes on the phone as they go. */
export function setSavesOnPhone(value: boolean): void {
  if (savesOnPhone !== value) {
    savesOnPhone = value;
    publish();
  }
}

/** Whether the browser believes it has a connection: true on the server, and where it cannot say. */
export function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
