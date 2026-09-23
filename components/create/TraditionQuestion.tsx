"use client";

import { useEffect, useId, useRef, type ReactElement } from "react";
import {
  TraditionChangeConfirm,
  useTraditionChange,
} from "@/components/create/TraditionChange";
import { TRADITIONS } from "@/lib/occasions";
import type { TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";

/**
 * The Details tab's order: the named traditions first, then the way out.
 * "none" is the same value the motifs section calls "No religious motifs".
 */
const OPTIONS: readonly { id: TraditionId; label: string }[] = [
  ...(["muslim", "hindu", "sikh", "christian", "jain", "buddhist"] as const).map(
    (id) => ({
      id,
      label: TRADITIONS.find((tradition) => tradition.id === id)?.label ?? id,
    }),
  ),
  { id: "none", label: "Other / prefer not to say" },
];

/**
 * Which religion or tradition the card is for, asked with the other facts.
 *
 * NOT A SECOND FIELD. It reads and writes the same traditionId as the
 * Traditional motifs section in the Design tab, through the same handler, so
 * a choice made in either place is the choice shown in both.
 *
 * The Quick presets section can send a host here; `focusRequested` is that
 * visit, answered once on arrival by scrolling to the question and focusing
 * the chip that is selected.
 */
export default function TraditionQuestion({
  traditionId,
  ornamentConfig,
  onTraditionChange,
  focusRequested,
  onFocused,
}: {
  traditionId: TraditionId;
  ornamentConfig: OrnamentConfig;
  onTraditionChange: (id: TraditionId) => void;
  focusRequested: boolean;
  onFocused: () => void;
}): ReactElement {
  const sectionRef = useRef<HTMLElement>(null);
  const headingId = useId();
  const hintId = useId();
  const change = useTraditionChange(
    traditionId,
    ornamentConfig,
    onTraditionChange,
  );

  useEffect(() => {
    if (!focusRequested) {
      return;
    }

    const section = sectionRef.current;
    section?.scrollIntoView({ block: "center" });
    section
      ?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
    onFocused();
  }, [focusRequested, onFocused]);

  return (
    <section ref={sectionRef} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2
          id={headingId}
          className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase"
        >
          Religion / tradition
        </h2>
        <p
          id={hintId}
          className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
        >
          Optional. This sets the motifs and ready-made designs offered in the
          Design tab.
        </p>
      </div>

      <div
        role="group"
        aria-labelledby={headingId}
        aria-describedby={hintId}
        className="flex flex-wrap gap-2"
      >
        {OPTIONS.map((option) => {
          const isSelected = option.id === traditionId;
          const isPending = option.id === change.pending;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => change.request(option.id)}
              className={[
                "min-h-11 rounded-full border px-4 text-[0.8125rem] font-medium transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                  : isPending
                    ? "border-[var(--lifafa-marigold)] text-[var(--lifafa-cream)]"
                    : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
              ].join(" ")}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {change.pending !== null ? (
        <TraditionChangeConfirm
          onConfirm={change.confirm}
          onCancel={change.cancel}
        />
      ) : null}
    </section>
  );
}
