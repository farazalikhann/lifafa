"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactElement } from "react";
import { clarityEvent } from "@/lib/clarity";
import {
  craftingServerSnapshot,
  craftingSnapshot,
  stopCrafting,
  subscribeCrafting,
} from "@/lib/crafting";

/** Between two lines while the save runs. */
const LINE_MS = 500;
/** Between two lines once the save is done and the payment page is here: nothing is waited for any more. */
const QUICK_LINE_MS = 150;
/** The last tick on screen before the payment page shows. */
const LAST_LOOK_MS = 300;
/**
 * However the move goes, the screen is never left up longer than this. The
 * save's own watchdog (Wizard.tsx) loads the page directly at 8 seconds.
 */
const NEVER_LONGER_MS = 10000;

function Mark({ state }: { state: "done" | "current" | "waiting" }): ReactElement {
  if (state === "done") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-[var(--paper-emerald)]">
        <circle cx="10" cy="10" r="10" fill="currentColor" />
        <path d="M6 10.5l2.6 2.5L14 7.5" fill="none" stroke="var(--paper-card)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return state === "current" ? (
    <span
      aria-hidden="true"
      className="size-5 shrink-0 rounded-full border-2 border-[var(--lifafa-hairline)] border-t-[var(--paper-emerald)] motion-safe:animate-spin"
    />
  ) : (
    <span aria-hidden="true" className="size-5 shrink-0 rounded-full border-2 border-[var(--lifafa-hairline)]" />
  );
}

/**
 * "Crafting your card…", full screen, from the save on the last step to the
 * payment page: a checklist in the host's own details that ticks one line at
 * a time (lib/crafting.ts says what it waits for). Drawn by
 * app/create/layout.tsx, so it stays up while the page changes under it.
 *
 * Clarity: crafting_screen_shown, once each time it comes up.
 */
export default function CraftingScreen(): ReactElement | null {
  const crafting = useSyncExternalStore(subscribeCrafting, craftingSnapshot, craftingServerSnapshot);
  const [ticked, setTicked] = useState(0);
  const shownFor = useRef(0);

  const { phase, lines, startedAt, arrived } = crafting;
  const active = phase !== "idle";

  /* A new screen starts with nothing ticked, and is counted once. */
  useEffect(() => {
    if (!active) {
      setTicked(0);
      return;
    }

    if (shownFor.current !== startedAt) {
      shownFor.current = startedAt;
      setTicked(0);
      clarityEvent("crafting_screen_shown");
    }
  }, [active, startedAt]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const saved = phase === "saved";
    const ready = saved && arrived;
    let timer: number;

    if (ticked < lines.length - 1) {
      timer = window.setTimeout(() => setTicked((value) => value + 1), ready ? QUICK_LINE_MS : LINE_MS);
    } else if (ticked === lines.length - 1) {
      /* The last line, "Sealing your envelope", waits for the save. */
      if (!saved) {
        return;
      }

      timer = window.setTimeout(() => setTicked(lines.length), ready ? QUICK_LINE_MS : LINE_MS);
    } else {
      /* All ticked: the screen goes once the payment page is here under it. */
      if (!arrived) {
        return;
      }

      timer = window.setTimeout(stopCrafting, LAST_LOOK_MS);
    }

    return () => window.clearTimeout(timer);
  }, [active, phase, arrived, ticked, lines.length]);

  useEffect(() => {
    if (!active) {
      return;
    }

    const left = Math.max(0, startedAt + NEVER_LONGER_MS - performance.now());
    const timer = window.setTimeout(stopCrafting, left);
    return () => window.clearTimeout(timer);
  }, [active, startedAt]);

  if (!active) {
    return null;
  }

  return (
    <div
      data-crafting-screen=""
      role="dialog"
      aria-modal="true"
      aria-labelledby="crafting-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--lifafa-ink)] px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex w-full max-w-sm flex-col gap-7 motion-safe:animate-[lifafa-rise_240ms_ease-out_both]">
        <h2
          id="crafting-title"
          className="font-[family-name:var(--font-display)] text-[1.75rem] leading-tight font-semibold tracking-[-0.015em] text-[var(--lifafa-cream)]"
        >
          Crafting your card…
        </h2>
        <ul aria-live="polite" data-clarity-mask="true" className="flex flex-col gap-4">
          {lines.map((line, at) => {
            const state = at < ticked ? "done" : at === ticked ? "current" : "waiting";

            return (
              <li
                key={line}
                data-state={state}
                className={`flex items-start gap-3 text-[1rem] leading-snug transition-colors duration-200 ${
                  state === "waiting" ? "text-[var(--lifafa-muted)]" : "text-[var(--lifafa-cream)]"
                }`}
              >
                <span className="mt-px flex">
                  <Mark state={state} />
                </span>
                <span className="min-w-0 break-words">{line}</span>
                {state === "done" ? <span className="sr-only">, done</span> : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
