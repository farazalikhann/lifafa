"use client";

import type { ReactElement } from "react";
import OrnamentPanel from "@/components/create/OrnamentPanel";
import { getTraditionPack } from "@/lib/traditionPacks";
import { TRADITIONS } from "@/lib/occasions";
import type { TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";

/**
 * Which tradition's motifs go on the card, and the pack behind them.
 *
 * The other half of what used to be OccasionPicker; see OccasionGrid for why
 * they are apart. The heading was an h3 under "Occasion" and is an h2 here,
 * because this is now a group of its own in the Decoration tab rather than a
 * postscript to the occasion grid. Nothing else about it moved.
 */
export default function TraditionPicker({
  traditionId,
  ornamentConfig,
  onTraditionChange,
  onOrnamentConfigChange,
}: {
  traditionId: TraditionId;
  /*
    Only ever acted on by a tradition that has a pack. Still passed on every
    tradition, because the panel is mounted and unmounted by that same value and
    a conditional prop would just move the branch somewhere less obvious.
  */
  ornamentConfig: OrnamentConfig;
  onTraditionChange: (id: TraditionId) => void;
  onOrnamentConfigChange: (next: OrnamentConfig) => void;
}): ReactElement {
  const pack = getTraditionPack(traditionId);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        Add traditional motifs
      </h2>
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
        above it. Mounted only for a tradition that has a pack — every other
        one removes it from the tree, and the page resets the config as it
        goes, so nothing from any pack can be left switched on behind a
        hidden panel. The lookup is the gate; the panel names no tradition.
      */}
      {pack !== null ? (
        <OrnamentPanel
          pack={pack}
          config={ornamentConfig}
          onChange={onOrnamentConfigChange}
        />
      ) : null}
    </section>
  );
}
