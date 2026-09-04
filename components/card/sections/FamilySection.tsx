"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { familyBlocks } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/**
 * Whose son, whose daughter, and where they are from.
 *
 * There is no connector label between a person and their parents here, and its
 * absence is the point. The Indian card this is modelled on prints "S/O" or
 * "D/O", and both encode a guess about the person's gender that this app has
 * never asked for and has no business inferring from a first name. "Child of"
 * would avoid the guess and introduce a new problem: nobody writes that on a
 * wedding invitation, and a card that reads as a form is worse than one that
 * reads as nothing.
 *
 * So the parents' names simply sit beneath the person's, which is what the
 * typography is for. A reader understands the relationship from the placement
 * without being told, in exactly the way the printed cards manage it.
 *
 * Renders nothing when neither side has filled anything in, and CardCanvas
 * filters it out of the running order in that case, so its divider goes too.
 */
export default function FamilySection({
  draft,
  theme,
  minHeight,
  pad,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  const blocks = familyBlocks(draft);

  if (blocks.length === 0) {
    return null;
  }

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: pad,
        paddingBottom: pad,
        gap: `calc(2rem * var(--card-gap-scale, 1))`,
      }}
    >
      {blocks.map((block, index) => (
        <div
          key={block.key}
          className={`flex flex-col items-center gap-1.5 ${reveal}`}
          style={lineDelay(index * 2)}
        >
          {block.name !== null ? (
            <p
              className="max-w-[24ch] text-[1.25rem] leading-snug break-words"
              style={{
                color: theme.textPrimary,
                fontFamily: "var(--card-heading)",
                fontWeight: "var(--card-heading-weight)" as unknown as number,
              }}
            >
              {block.name}
            </p>
          ) : null}

          {block.parents !== null ? (
            <p
              className="max-w-[30ch] text-[0.9375rem] leading-relaxed break-words text-pretty"
              style={{ color: theme.textPrimary }}
            >
              {block.parents}
            </p>
          ) : null}

          {block.city !== null ? (
            <p
              className="text-[0.8125rem] tracking-[0.14em] uppercase"
              style={{ color: theme.textMuted }}
            >
              {block.city}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
