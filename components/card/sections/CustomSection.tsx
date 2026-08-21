"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { hasCustomContent } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { CustomSection as CustomSectionData } from "@/types/customSection";

/**
 * A host-authored section. Renders nothing at all when both fields are empty —
 * CardCanvas filters it out of the running order in that case, so its divider
 * disappears with it, matching how MessageSection behaves.
 *
 * Both sides call `hasCustomContent`, so there is one definition of "empty"
 * rather than two that could drift apart and strand a divider.
 */
export default function CustomSection({
  section,
  theme,
  minHeight,
  pad,
}: {
  section: CustomSectionData;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  if (!hasCustomContent(section)) {
    return null;
  }

  const heading = section.heading.trim();
  const body = section.body.trim();

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: pad,
        paddingBottom: pad,
        gap: `calc(1.25rem * var(--card-gap-scale, 1))`,
      }}
    >
      {heading.length > 0 ? (
        <div className={reveal} style={lineDelay(0)}>
          <p
            className="tracking-[0.28em] break-words text-[0.84rem] uppercase text-balance"
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
            className="max-w-[32ch] text-[1.0625rem] leading-relaxed break-words whitespace-pre-line text-pretty"
            style={{ color: theme.textMuted }}
          >
            {body}
          </p>
        </div>
      ) : null}
    </section>
  );
}
