"use client";

import type { ReactElement } from "react";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useInView } from "@/hooks/useInView";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  mapsSearchUrl,
  placeholderOpacity,
  resolve,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

/** The section's own rhythm, shared with the group the panel covers. */
const GAP = "calc(1rem * var(--card-gap-scale, 1))";

export default function VenueSection({
  draft,
  theme,
  minHeight,
  pad,
  scratch,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /** Set when this is the section the host chose to hide; null otherwise. */
  scratch: ScratchConfig | null;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  const venue = resolve(draft.venueName, "Venue name");
  const address = resolve(draft.venueAddress, "Venue address");

  /* Nothing to search for until the host has typed something. */
  const hasLocation = !venue.isPlaceholder || !address.isPlaceholder;
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  /*
    Everything that says where the celebration is, the Maps link included.

    The link is inside the group rather than left visible beside it, and that is
    not a styling choice: its href is built out of the venue name and address,
    so a guest who could tap it would be handed exactly what the panel is
    supposed to be hiding.
  */
  const where = (
    <div
      className="flex flex-col items-center text-center"
      style={{ gap: GAP }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <p
          className="max-w-[22ch] text-[1.525rem] leading-snug font-medium break-words text-balance sm:text-[1.675rem]"
          style={{
            opacity: placeholderOpacity(venue.isPlaceholder, "primary"),
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
        >
          {venue.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(1)}>
        {/*
          A guest has to be able to read the address in full, so it is never
          truncated. 34ch and text-pretty instead: a 200 character address runs
          to six or seven even lines rather than the lopsided block balancing
          produces, and `break-words` keeps a long unbroken token — a plus code,
          a run-together landmark name — inside the card rather than clipped
          against its edge.
        */}
        <p
          className="max-w-[34ch] text-[0.9rem] leading-relaxed break-words text-pretty"
          style={{
            color: theme.textMuted,
            opacity: placeholderOpacity(address.isPlaceholder, "muted"),
          }}
        >
          {address.text}
        </p>
      </div>

      {hasLocation ? (
        <div className={`mt-2 ${reveal}`} style={lineDelay(2)}>
          <a
            href={mapsSearchUrl(draft.venueName, draft.venueAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded text-[1rem] font-medium underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ color: theme.accent, outlineColor: theme.accent }}
          >
            Open in Maps
          </a>
        </div>
      ) : null}
    </div>
  );

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: pad,
        paddingBottom: pad,
        gap: GAP,
      }}
    >
      {scratch === null ? (
        where
      ) : (
        <ScratchPanel {...scratch}>{where}</ScratchPanel>
      )}
    </section>
  );
}
