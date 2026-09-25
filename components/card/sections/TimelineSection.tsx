"use client";

import type { ReactElement } from "react";
import { useStillHidden } from "@/components/card/ScratchReveal";
import { useInView } from "@/hooks/useInView";
import { hasTimeline, timelineEntries } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  directionsUrl,
  formatDateAndTime,
  formatWeekday,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
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

/** A small map pin before a function's venue, the location card's in miniature. */
function PinIcon({ color }: { color: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 12 16"
      width="0.7em"
      height="0.95em"
      aria-hidden="true"
      className="mt-[0.3em] shrink-0"
    >
      <path
        d="M6 15.5S1 9.6 1 6a5 5 0 0 1 10 0c0 3.6-5 9.5-5 9.5Z"
        fill={color}
      />
      <circle cx="6" cy="6" r="1.9" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
}

export default function TimelineSection({
  draft,
  theme,
  minHeight,
  pad,
  language,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /** The language the heading, the dates and the map links are written in. */
  language: CardLanguage;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  /*
    The main event's row repeats its date and its venue. When the host hid
    either behind a scratch panel, the row holds it back until the panel is
    scratched, rather than printing the secret one screen further down; the
    other functions are not what the panel hides and show theirs as ever.
  */
  const dateHidden = useStillHidden("date");
  const venueHidden = useStillHidden("venue");

  /*
    Asked of hasTimeline, not of the row count. The two are no longer the same
    question — a card with a date and no sub-events has one entry and no
    timeline — and CardCanvas places the dividers from hasTimeline, so a null
    return decided any other way would strand a divider beside nothing.
  */
  if (!hasTimeline(draft)) {
    return null;
  }

  const copy = cardCopy(language);
  const entries = timelineEntries(draft, language);

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col justify-center px-7"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: `calc(1.5 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
      }}
    >
      <p
        className={`text-center text-[calc(0.7*var(--card-rem,1rem))] tracking-[0.24em] uppercase ${reveal}`}
        style={{ color: theme.textMuted, transitionDelay: "0ms" }}
      >
        {copy.timeline.heading}
      </p>

      <ol className="relative flex flex-col" style={{ gap: `calc(1.25 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))` }}>
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
            left: cardPx((RAIL - 1) / 2),
            backgroundColor: theme.accent,
            opacity: 0.28,
          }}
        />

        {entries.map((entry, index) => {
          const isPrimary = entry.id === "primary";
          const hideWhen = isPrimary && dateHidden;
          const hideWhere = isPrimary && venueHidden;
          const when = hideWhen
            ? null
            : formatDateAndTime(entry.date, entry.time, language);
          const weekday = hideWhen
            ? null
            : formatWeekday(entry.date, entry.time, language);
          const venue = hideWhere ? "" : entry.venueName.trim();
          const note = entry.note?.trim() ?? "";
          const directions = hideWhere
            ? null
            : directionsUrl(entry.venueName, entry.venueAddress, entry.mapsLink);
          /* What arrives with a reveal fades in, as it does under Save the date. */
          const arrives = isPrimary ? " lifafa-reveal-in" : "";

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
                style={{ width: cardPx(RAIL) }}
              >
                <span
                  className="absolute top-1.5 rounded-full"
                  style={{
                    left: cardPx((RAIL - DOT) / 2),
                    width: cardPx(DOT),
                    height: cardPx(DOT),
                    backgroundColor: theme.accent,
                    /* The card's own ground, so the rail is cut rather than crossed. */
                    boxShadow: `0 0 0 ${cardPx(3)} ${theme.background}`,
                  }}
                />
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p
                  className="text-[calc(1.05*var(--card-rem,1rem))] leading-snug break-words"
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
                    className={`text-[calc(0.8125*var(--card-rem,1rem))] leading-relaxed${arrives}`}
                    style={{ color: theme.accent }}
                  >
                    {weekday !== null ? `${weekday}, ` : ""}
                    {when}
                  </p>
                ) : null}

                {venue.length > 0 ? (
                  <p
                    className={`flex items-start gap-1.5 text-[calc(0.8125*var(--card-rem,1rem))] leading-relaxed break-words${arrives}`}
                    style={{ color: theme.textMuted }}
                  >
                    <PinIcon color={theme.accent} />
                    <span className="min-w-0">{venue}</span>
                  </p>
                ) : null}

                {note.length > 0 ? (
                  <p
                    className="text-[calc(0.78*var(--card-rem,1rem))] leading-relaxed break-words text-pretty italic"
                    style={{ color: theme.textMuted }}
                  >
                    {note}
                  </p>
                ) : null}

                {directions !== null ? (
                  /*
                    The same Google Maps directions link as the location card.
                    44px tall however small the words, pulled back up by the
                    same amount so the row keeps its rhythm.
                  */
                  <a
                    href={directions}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-2.5 inline-flex min-h-11 items-center self-start rounded text-[calc(0.78*var(--card-rem,1rem))] font-medium underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: theme.accent, outlineColor: theme.accent }}
                  >
                    {copy.timeline.directions}
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
