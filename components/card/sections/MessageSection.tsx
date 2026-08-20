"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { REVEAL_BASE, lineDelay, revealClass } from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/**
 * Renders nothing at all when the host has not written a note. CardCanvas
 * filters this section out of the running order in that case, so its divider
 * disappears with it — the null return here is the belt to that braces.
 */
export default function MessageSection({
  draft,
  theme,
  minHeight,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>();
  const message = draft.message.trim();

  if (message.length === 0) {
    return null;
  }

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center gap-5 px-7 py-16 text-center"
      style={{ minHeight }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <span
          aria-hidden="true"
          className="block h-px w-10"
          style={{ backgroundColor: theme.accent, opacity: 0.45 }}
        />
      </div>

      <div className={reveal} style={lineDelay(1)}>
        <p
          className="max-w-[28ch] text-sm leading-relaxed text-balance italic"
          style={{ color: theme.textMuted }}
        >
          {message}
        </p>
      </div>
    </section>
  );
}
