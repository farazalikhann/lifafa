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
import { cardPx } from "@/lib/cardScale";
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
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: `calc(2 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
      }}
    >
      {blocks.map((block, index) => (
        <div
          key={block.key}
          className={`flex flex-col items-center gap-1.5 ${reveal}`}
          style={lineDelay(index * 2)}
        >
          {block.name !== null ? (
            /*
              In the pair's names face, the one the cover sets them in, so the
              two people read as the same two people further down the card. A
              script at this size is still a name and not a paragraph: it is
              given the face's own scale, leading and word spacing, and allowed
              to wrap, which is what keeps "Mohammad Abdul Rahman" inside a
              375px phone, or a photo frame's narrower column, in Great Vibes.
            */
            <p
              className="max-w-full text-[calc(1.75*var(--card-rem,1rem)*var(--card-names-scale,1))] break-words text-balance"
              style={{
                color: theme.textPrimary,
                fontFamily: "var(--card-names)",
                fontWeight: "var(--card-names-weight)" as unknown as number,
                lineHeight: "var(--card-names-leading)",
                letterSpacing: "var(--card-names-tracking)",
                wordSpacing: "var(--card-names-word-spacing)",
              }}
            >
              {block.name}
            </p>
          ) : null}

          {block.parents !== null ? (
            <p
              className="max-w-[30ch] text-[calc(0.9375*var(--card-rem,1rem))] leading-relaxed break-words text-pretty"
              style={{ color: theme.textPrimary }}
            >
              {block.parents}
            </p>
          ) : null}

          {block.city !== null ? (
            <p
              className="text-[calc(0.8125*var(--card-rem,1rem))] tracking-[0.14em] uppercase"
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
