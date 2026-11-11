import { clarityEvent, claritySet } from "@/lib/clarity";

/**
 * "Save and continue", timed from the press to the saved card on screen.
 *
 * The wizard starts a clock at the press and laps each phase (the save on the
 * server, and any other step before it). When it sends the host on, it leaves
 * the laps in this tab's sessionStorage, because the page that shows the
 * saved card is another page, and can be a full load when the watchdog had
 * to load it directly. That page (SaveTimingReport) adds the last phase, the
 * time from the push to the card on screen, logs the lot with console.info
 * and tags the Clarity session with it (save_timing).
 *
 * Wall-clock milliseconds, not performance.now(), so the two pages can be
 * compared across a reload.
 */

const KEY = "lifafa:save-timing";

/** Older than this, a stored clock belongs to some other visit and is dropped. */
const STALE_MS = 3 * 60 * 1000;

export interface SaveClock {
  /** Records the time since the last lap (or the press) under `phase`, and returns it. */
  lap: (phase: string) => number;
  /** Leaves the laps for the saved card's page to finish. */
  handOff: (eventId: string) => void;
}

interface StoredClock {
  eventId: string;
  startedAt: number;
  pushedAt: number;
  phases: Record<string, number>;
  via: "push" | "reload";
}

function read(): StoredClock | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw === null ? null : (JSON.parse(raw) as StoredClock);
  } catch {
    return null;
  }
}

function write(clock: StoredClock | null): void {
  try {
    if (clock === null) {
      window.sessionStorage.removeItem(KEY);
    } else {
      window.sessionStorage.setItem(KEY, JSON.stringify(clock));
    }
  } catch {
    /* No storage: the timing is lost, the save is not. */
  }
}

export function startSaveClock(): SaveClock {
  const startedAt = Date.now();
  let last = startedAt;
  const phases: Record<string, number> = {};

  return {
    lap(phase) {
      const now = Date.now();
      phases[phase] = now - last;
      last = now;
      return phases[phase];
    },
    handOff(eventId) {
      write({ eventId, startedAt, pushedAt: Date.now(), phases: { ...phases }, via: "push" });
    },
  };
}

/** The watchdog loaded the saved card's page directly: said so in the report. */
export function markSaveReload(): void {
  const clock = read();

  if (clock !== null) {
    write({ ...clock, via: "reload" });
  }
}

function bucket(ms: number): string {
  if (ms < 2000) return "under 2s";
  if (ms < 4000) return "2-4s";
  if (ms < 8000) return "4-8s";
  return "over 8s";
}

/** The saved card is on screen: finishes the clock for this event, if one is waiting. */
export function reportSaveArrival(eventId: string): void {
  const clock = read();

  if (clock === null || clock.eventId !== eventId) {
    return;
  }

  write(null);
  const now = Date.now();

  if (now - clock.startedAt > STALE_MS) {
    return;
  }

  const timings = {
    ...clock.phases,
    screen: now - clock.pushedAt,
    total: now - clock.startedAt,
    via: clock.via,
  };

  console.info("[save] Save and continue timings (ms):", timings);

  for (const [phase, ms] of Object.entries(clock.phases)) {
    claritySet(`save_${phase}_ms`, String(ms));
  }

  claritySet("save_screen_ms", String(timings.screen));
  claritySet("save_total_ms", String(timings.total));
  claritySet("save_total", bucket(timings.total));
  claritySet("save_via", clock.via);
  clarityEvent("save_timing");
}
