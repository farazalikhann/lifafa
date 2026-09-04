"use client";

import type { ReactElement } from "react";
import { COVER_ANIMATIONS } from "@/lib/coverAnimations";
import type { CoverAnimationId } from "@/types/coverAnimation";

/**
 * How the invitation is wrapped before a guest opens it.
 *
 * A list rather than the pill row the other pickers use, because each option
 * needs a line explaining what it does: "Curtain reveal" on its own does not
 * tell a host what their guests will see, and this is the one decision they
 * cannot check against the preview beside them. A live replay of the chosen
 * animation is a later addition; for now the description is the whole answer.
 *
 * "No animation" is in the list as an equal option and not behind a switch.
 * Plenty of hosts want the card and nothing in front of it, and making that
 * choice the awkward one is how a product ends up nagging people.
 */
export default function CoverAnimationPicker({
  coverAnimation,
  onChange,
}: {
  coverAnimation: CoverAnimationId;
  onChange: (id: CoverAnimationId) => void;
}): ReactElement {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
          How it opens
        </h2>
        <p className="text-xs text-[var(--lifafa-muted)]">
          Guests see this first and tap to open your card.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {COVER_ANIMATIONS.map((option) => {
          const isSelected = option.id === coverAnimation;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.id)}
              className={[
                "flex min-h-11 flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                isSelected
                  ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                  : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-muted)]",
              ].join(" ")}
            >
              <span
                className={`text-[0.8125rem] font-medium ${
                  isSelected
                    ? "text-[var(--lifafa-cream)]"
                    : "text-[var(--lifafa-muted)]"
                }`}
              >
                {option.label}
              </span>
              <span className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
