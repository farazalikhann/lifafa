"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { REVEAL_BASE, lineDelay, revealClass } from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { CustomSection as CustomSectionData } from "@/types/customSection";

/**
 * A host-authored section. Renders nothing at all when both fields are empty —
 * CardCanvas filters it out of the running order in that case, so its divider
 * disappears with it, matching how MessageSection behaves.
 */
export default function CustomSection({
  section,
  theme,
  minHeight,
}: {
  section: CustomSectionData;
  theme: Theme;
  minHeight: string;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>();

  const heading = section.heading.trim();
  const body = section.body.trim();

  if (heading.length === 0 && body.length === 0) {
    return null;
  }

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
      {heading.length > 0 ? (
        <div className={reveal} style={lineDelay(0)}>
          <p
            className="text-[0.6875rem] tracking-[0.28em] uppercase"
            style={{
            color: theme.accent,
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
          >
            {heading}
          </p>
        </div>
      ) : null}

      {body.length > 0 ? (
        <div className={reveal} style={lineDelay(1)}>
          <p
            className="max-w-[28ch] text-sm leading-relaxed whitespace-pre-line text-balance"
            style={{ color: theme.textMuted }}
          >
            {body}
          </p>
        </div>
      ) : null}
    </section>
  );
}
