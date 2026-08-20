"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import {
  REVEAL_BASE,
  lineDelay,
  mapsSearchUrl,
  resolve,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

export default function VenueSection({
  draft,
  theme,
  minHeight,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>();

  const venue = resolve(draft.venueName, "Venue name");
  const address = resolve(draft.venueAddress, "Venue address");

  /* Nothing to search for until the host has typed something. */
  const hasLocation = !venue.isPlaceholder || !address.isPlaceholder;
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center gap-4 px-7 py-16 text-center"
      style={{ minHeight }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <p
          className="text-[1.25rem] leading-snug font-medium text-balance sm:text-[1.375rem]"
          style={{ opacity: venue.isPlaceholder ? 0.4 : 1 }}
        >
          {venue.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(1)}>
        <p
          className="max-w-[26ch] text-xs leading-relaxed text-balance"
          style={{
            color: theme.textMuted,
            opacity: address.isPlaceholder ? 0.55 : 1,
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
            className="rounded text-[0.8125rem] font-medium underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
            style={{ color: theme.accent, outlineColor: theme.accent }}
          >
            Open in Maps
          </a>
        </div>
      ) : null}
    </section>
  );
}
