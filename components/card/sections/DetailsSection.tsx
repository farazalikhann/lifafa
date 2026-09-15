"use client";

import type { ReactElement } from "react";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useInView } from "@/hooks/useInView";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  formatDateAndTime,
  formatWeekday,
  lineDelay,
  placeholderOpacity,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** The section's own rhythm, shared with the group the panel covers. */
const GAP = "calc(1 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))";

export default function DetailsSection({
  draft,
  theme,
  minHeight,
  pad,
  scratch,
  language,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /**
   * Set when this is the section the host chose to hide. Null otherwise, which
   * is every card but one and both of the other two scratch targets.
   */
  scratch: ScratchConfig | null;
  /** The language the date is written in. */
  language: CardLanguage;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  const copy = cardCopy(language);
  const weekday = formatWeekday(draft.eventDate, draft.eventTime, language);
  const dateAndTime = formatDateAndTime(
    draft.eventDate,
    draft.eventTime,
    language,
  );
  const hasDate = dateAndTime !== null;

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  /*
    The two lines that actually give the date away, grouped so the panel covers
    them and nothing else.

    Grouped even when there is no panel, so the covered and uncovered cards lay
    out identically — a group that only existed on a scratch card would be one
    more thing that could shift the section when it was switched on. The gap is
    restated here because these are no longer the section's own flex children.
  */
  const when = (
    <div
      className="flex flex-col items-center text-center"
      style={{ gap: GAP }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <p
          className="text-[calc(0.84*var(--card-rem,1rem))] tracking-[0.3em] uppercase"
          style={{
            color: theme.textMuted,
            opacity: placeholderOpacity(!hasDate, "muted"),
          }}
        >
          {weekday ?? copy.details.dayPlaceholder}
        </p>
      </div>

      {/*
        The dominant line of this section. Given more leading in Devanagari,
        whose matras need room above the headline that a Latin date does not.
      */}
      <div className={reveal} style={lineDelay(1)}>
        <p
          className={`max-w-[16ch] text-[1.825rem] font-medium tracking-[0.02em] break-words text-balance sm:text-[calc(2.125*var(--card-rem,1rem))] ${
            copy.script === "devanagari" ? "leading-[1.5]" : "leading-[1.2]"
          }`}
          style={{
            opacity: placeholderOpacity(!hasDate, "primary"),
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
        >
          {dateAndTime ?? copy.details.dateTimePlaceholder}
        </p>
      </div>
    </div>
  );

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: GAP,
      }}
    >
      {scratch === null ? (
        when
      ) : (
        <ScratchPanel {...scratch}>{when}</ScratchPanel>
      )}

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
