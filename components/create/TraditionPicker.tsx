"use client";

import type { ReactElement } from "react";
import OrnamentPanel from "@/components/create/OrnamentPanel";
import {
  TraditionChangeConfirm,
  useTraditionChange,
} from "@/components/create/TraditionChange";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { getTraditionPack } from "@/lib/traditionPacks";
import { TRADITIONS } from "@/lib/occasions";
import type { TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";

/**
 * Which tradition's motifs go on the card, and the pack behind them.
 *
 * The other half of what used to be OccasionPicker; see OccasionGrid for why
 * they are apart. It was an h3 under "Occasion", then a group of its own, and
 * is now the last section of the Design tab's accordion. Nothing else about it
 * moved.
 *
 * The Details tab asks the same question (TraditionQuestion) over the same
 * traditionId, and both ask first before a change clears the host's motifs.
 */
export default function TraditionPicker({
  traditionId,
  ornamentConfig,
  onTraditionChange,
  onOrnamentConfigChange,
  accordion,
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
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const pack = getTraditionPack(traditionId);
  const change = useTraditionChange(
    traditionId,
    ornamentConfig,
    onTraditionChange,
  );

  return (
    <CollapsibleSection
      title="Traditional motifs"
      /* "No religious motifs" is the pill's wording; the header only needs "None". */
      summary={
        traditionId === "none"
          ? "None"
          : TRADITIONS.find((tradition) => tradition.id === traditionId)?.label
      }
      {...sectionState(accordion, "motifs")}
    >
      <p className="text-xs text-[var(--lifafa-muted)]">
        Optional. Choose what suits your family.
      </p>

      <div className="flex flex-wrap gap-2">
        {TRADITIONS.map((tradition) => {
          const isSelected = tradition.id === traditionId;
          const isPending = tradition.id === change.pending;

          return (
            <button
              key={tradition.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => change.request(tradition.id)}
              className={[
                "rounded-full border px-3.5 py-2 text-[0.8125rem] font-medium transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)]"
                  : isPending
                    ? "border-[var(--lifafa-marigold)] text-[var(--lifafa-cream)]"
                    : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
              ].join(" ")}
            >
              {tradition.label}
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
    </CollapsibleSection>
  );
}
