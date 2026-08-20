"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import {
  REVEAL_BASE,
  formatDateAndTime,
  formatWeekday,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

export default function DetailsSection({
  draft,
  theme,
  minHeight,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>();

  const weekday = formatWeekday(draft.eventDate, draft.eventTime);
  const dateAndTime = formatDateAndTime(draft.eventDate, draft.eventTime);
  const hasDate = dateAndTime !== null;

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 py-16 text-center"
      style={{
        minHeight,
        gap: `calc(1rem * var(--card-gap-scale, 1))`,
      }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <p
          className="text-[0.6875rem] tracking-[0.3em] uppercase"
          style={{ color: theme.textMuted, opacity: hasDate ? 1 : 0.55 }}
        >
          {weekday ?? "The day"}
        </p>
      </div>

      {/* The dominant line of this section. */}
      <div className={reveal} style={lineDelay(1)}>
        <p
          className="max-w-[16ch] text-[1.5rem] leading-[1.2] font-medium tracking-[0.02em] text-balance sm:text-[1.75rem]"
          style={{
            opacity: hasDate ? 1 : 0.4,
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
        >
          {dateAndTime ?? "Date and time"}
        </p>
      </div>

      <div className={reveal} style={lineDelay(2)}>
        <span
          aria-hidden="true"
          className="block h-px w-12"
          style={{ backgroundColor: theme.accent, opacity: 0.45 }}
        />
      </div>
    </section>
  );
}
