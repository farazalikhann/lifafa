"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { hasMessage } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/**
 * Renders nothing at all when the host has not written a note. CardCanvas
 * filters this section out of the running order in that case, so its divider
 * disappears with it — the null return here is the belt to that braces.
 *
 * Both sides call `hasMessage`, so belt and braces cannot disagree about what
 * counts as an empty note and leave a divider stranded beside nothing.
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
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  if (!hasMessage(draft)) {
    return null;
  }

  const message = draft.message.trim();

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 py-16 text-center"
      style={{
        minHeight,
        gap: `calc(1.25rem * var(--card-gap-scale, 1))`,
      }}
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
          className="max-w-[32ch] text-sm leading-relaxed break-words text-pretty italic"
          style={{ color: theme.textMuted }}
        >
          {message}
        </p>
      </div>
    </section>
  );
}
