"use client";

import type { ReactElement } from "react";
import OrnamentPanel from "@/components/create/OrnamentPanel";
import { OCCASIONS, TRADITIONS } from "@/lib/occasions";
import { getMotifs } from "@/lib/motifs";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";

export default function OccasionPicker({
  occasionId,
  traditionId,
  ornamentConfig,
  onOccasionChange,
  onTraditionChange,
  onOrnamentConfigChange,
}: {
  occasionId: OccasionId;
  traditionId: TraditionId;
  /*
    Only ever acted on when the tradition is "muslim". Still passed on every
    tradition, because the panel is mounted and unmounted by that same value and
    a conditional prop would just move the branch somewhere less obvious.
  */
  ornamentConfig: OrnamentConfig;
  onOccasionChange: (id: OccasionId) => void;
  onTraditionChange: (id: TraditionId) => void;
  onOrnamentConfigChange: (next: OrnamentConfig) => void;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        Occasion
      </h2>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {OCCASIONS.map((occasion) => {
          const isSelected = occasion.id === occasionId;
          /* Show one of the occasion's own motifs as a tiny preview. */
          const [PreviewMotif] = getMotifs(occasion.id, "none");

          return (
            <button
              key={occasion.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onOccasionChange(occasion.id)}
              className={[
                "flex min-h-11 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3.5 transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                  : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60",
              ].join(" ")}
            >
              <span
                className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
              >
                {occasion.label}
              </span>
              <span
                aria-hidden="true"
                className={
                  isSelected
                    ? "text-[var(--lifafa-marigold)]"
                    : "text-[var(--lifafa-muted)]"
                }
              >
                <PreviewMotif size={20} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <h3 className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
          Add traditional motifs
        </h3>
        <p className="text-xs text-[var(--lifafa-muted)]">
          Optional. Choose what suits your family.
        </p>

        <div className="mt-1 flex flex-wrap gap-2">
          {TRADITIONS.map((tradition) => {
            const isSelected = tradition.id === traditionId;

            return (
              <button
                key={tradition.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onTraditionChange(tradition.id)}
                className={[
                  "rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                  isSelected
                    ? "border-transparent bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                    : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
                ].join(" ")}
              >
                {tradition.label}
              </button>
            );
          })}
        </div>

        {/*
          Directly under the pills, because it only exists because of the pill
          above it. Mounted on "muslim" alone — every other tradition removes it
          from the tree, and the page resets the config as it goes, so nothing
          from this pack can be left switched on behind a hidden panel.
        */}
        {traditionId === "muslim" ? (
          <OrnamentPanel
            config={ornamentConfig}
            onChange={onOrnamentConfigChange}
          />
        ) : null}
      </div>
    </section>
  );
}
