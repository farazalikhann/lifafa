"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import type { TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";

/**
 * Whether the host has put anything of a tradition's on the card: a motif, a
 * calligraphy panel, a greeting or a dua. Exactly what a tradition change
 * clears — see handleTraditionSelect in CardEditor.
 */
function hasReligiousContent(config: OrnamentConfig): boolean {
  return (
    config.enabledOrnaments.length > 0 ||
    config.greetingId !== null ||
    config.blessingId !== null
  );
}

export interface TraditionChange {
  /** The tradition the host asked for and has not yet confirmed, if any. */
  pending: TraditionId | null;
  /** A tradition click. Applies at once unless there is something to lose. */
  request: (id: TraditionId) => void;
  confirm: () => void;
  cancel: () => void;
}

/**
 * A tradition click, asking first only when it would clear something.
 *
 * Shared by the Details question and the Traditional motifs section, so the
 * two controls over the one traditionId keep the same rule. A click on the
 * tradition already chosen does nothing, rather than clearing the pack.
 */
export function useTraditionChange(
  traditionId: TraditionId,
  ornamentConfig: OrnamentConfig,
  onTraditionChange: (id: TraditionId) => void,
): TraditionChange {
  const [pending, setPending] = useState<TraditionId | null>(null);

  const request = (id: TraditionId): void => {
    if (id === traditionId) {
      setPending(null);
      return;
    }

    if (hasReligiousContent(ornamentConfig)) {
      setPending(id);
      return;
    }

    setPending(null);
    onTraditionChange(id);
  };

  return {
    pending,
    request,
    confirm: () => {
      if (pending !== null) {
        onTraditionChange(pending);
      }
      setPending(null);
    },
    cancel: () => setPending(null),
  };
}

/**
 * The inline question a tradition change asks when it would clear the host's
 * motifs and religious text. Takes the focus when it appears, as the preset
 * question does, so a keyboard host answers it where they are.
 */
export function TraditionChangeConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}): ReactElement {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div
      role="group"
      aria-label="Confirm tradition change"
      className="flex flex-col gap-3 rounded-xl border border-[var(--lifafa-marigold)]/45 bg-[var(--lifafa-ink-raised)] px-3.5 py-3"
    >
      <p className="text-[0.8125rem] leading-relaxed text-[var(--lifafa-cream)]">
        Changing the tradition will remove the motifs and religious text you
        have added. Your names and event details stay the same.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Change
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-full border border-[var(--lifafa-hairline)] px-5 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
