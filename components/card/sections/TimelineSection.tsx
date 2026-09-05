"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { hasTimeline, timelineEntries } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  formatDateAndTime,
  formatWeekday,
  mapsSearchUrl,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/**
 * Every function of the celebration, in the order they happen.
 *
 * Not the order the host typed them in. They add the reception, then remember
 * the haldi, and a card that listed those two that way round would be wrong in
 * the one way a schedule cannot afford to be. `timelineEntries` sorts a copy;
 * the draft keeps the host's own order untouched.
 *
 * Renders nothing until the host has added a function of their own. One event
 * is not a sequence, and a schedule listing the single thing the date and venue
 * sections have already covered is a screen that says nothing twice. CardCanvas
 * filters the section out of the running order in that case, so its divider
 * goes with it — both sides ask hasTimeline, which is what stops a divider
 * being stranded beside nothing.
 */

/**
 * How far apart the rows arrive, in milliseconds.
 *
 * Slower than the 80ms the other sections stagger their lines by, and
 * deliberately so: those are lines of one thought arriving together, while
 * these are separate events, and a beat between them is what makes the list
 * read as a sequence rather than a block that faded in.
 */
const ROW_STAGGER_MS = 120;

/** Width of the rail the dots sit on, and the dot itself, in px. */
const RAIL = 28;
const DOT = 9;

export default function TimelineSection({
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

  /*
    Asked of hasTimeline, not of the row count. The two are no longer the same
    question — a card with a date and no sub-events has one entry and no
    timeline — and CardCanvas places the dividers from hasTimeline, so a null
    return decided any other way would strand a divider beside nothing.
  */
  if (!hasTimeline(draft)) {
    return null;
  }

  const entries = timelineEntries(draft);

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col justify-center px-7"
      style={{
        minHeight,
        paddingTop: pad,
        paddingBottom: pad,
        gap: `calc(1.5rem * var(--card-gap-scale, 1))`,
      }}
    >
      <p
        className={`text-center text-[0.7rem] tracking-[0.24em] uppercase ${reveal}`}
        style={{ color: theme.textMuted, transitionDelay: "0ms" }}
      >
        The celebrations
      </p>

      <ol className="relative flex flex-col" style={{ gap: `calc(1.25rem * var(--card-gap-scale, 1))` }}>
        {/*
          One rail behind every dot rather than a border on each row.

          A per-row border draws a segment between each pair of rows and leaves
          the gaps between them empty, which reads as a dashed line nobody
          asked for. This is a single line down the whole list, inset to the
          dots' own centre, stopping short at both ends so it does not run past
          the first and last events into nothing.
        */}
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 w-px"
          style={{
            left: (RAIL - 1) / 2,
            backgroundColor: theme.accent,
            opacity: 0.28,
          }}
        />

        {entries.map((entry, index) => {
          const when = formatDateAndTime(entry.date, entry.time);
          const weekday = formatWeekday(entry.date, entry.time);
          const venue = entry.venueName.trim();
          const note = entry.note?.trim() ?? "";
          const hasMap =
            venue.length > 0 || entry.venueAddress.trim().length > 0;

          return (
            <li
              key={entry.id}
              className={`relative flex ${reveal}`}
              /*
                A transition delay, not an animation. useInView latches, so a
                guest who scrolls straight past mid stagger still lands on a
                fully revealed list rather than rows frozen half in.
              */
              style={{ transitionDelay: `${(index + 1) * ROW_STAGGER_MS}ms` }}
            >
              <span
                aria-hidden="true"
                className="relative shrink-0"
                style={{ width: RAIL }}
              >
                <span
                  className="absolute top-1.5 rounded-full"
                  style={{
                    left: (RAIL - DOT) / 2,
                    width: DOT,
                    height: DOT,
                    backgroundColor: theme.accent,
                    /* The card's own ground, so the rail is cut rather than crossed. */
                    boxShadow: `0 0 0 3px ${theme.background}`,
                  }}
                />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p
                  className="text-[1.05rem] leading-snug break-words"
                  style={{
                    color: theme.textPrimary,
                    fontFamily: "var(--card-heading)",
                    fontWeight: "var(--card-heading-weight)" as unknown as number,
                  }}
                >
                  {entry.label}
                </p>

                {when !== null ? (
                  <p
                    className="text-[0.8125rem] leading-relaxed"
                    style={{ color: theme.accent }}
                  >
                    {weekday !== null ? `${weekday}, ` : ""}
                    {when}
                  </p>
                ) : null}

                {venue.length > 0 ? (
                  <p
                    className="text-[0.8125rem] leading-relaxed break-words"
                    style={{ color: theme.textMuted }}
                  >
                    {venue}
                  </p>
                ) : null}

                {note.length > 0 ? (
                  <p
                    className="text-[0.78rem] leading-relaxed break-words text-pretty italic"
                    style={{ color: theme.textMuted }}
                  >
                    {note}
                  </p>
                ) : null}

                {hasMap ? (
                  <a
                    href={mapsSearchUrl(entry.venueName, entry.venueAddress)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 self-start rounded text-[0.78rem] font-medium underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
                    style={{ color: theme.accent, outlineColor: theme.accent }}
                  >
                    Map
                  </a>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
