"use client";

import type { ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { VENUE_ILLUSTRATIONS, venueArt } from "@/lib/venueIllustration";
import type { VenueIllustration } from "@/types/card";

/** An empty frame with a stroke through it: no picture. */
function NonePreview(): ReactElement {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className="h-9 w-9 opacity-60">
      <circle cx="24" cy="24" r="15" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M13.5 34.5 34.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The painting above the venue's name: one of four places, or none.
 *
 * None on every card until a host picks one. The pictures are the same on
 * every palette; the tiles here are the 300px cuts of them.
 */
export default function VenueIllustrationPanel({
  venueIllustration,
  onVenueIllustrationChange,
  accordion,
}: {
  venueIllustration: VenueIllustration;
  onVenueIllustrationChange: (illustration: VenueIllustration) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const current = VENUE_ILLUSTRATIONS.find((option) => option.id === venueIllustration);

  return (
    <CollapsibleSection
      title="Venue illustration"
      summary={current?.label}
      {...sectionState(accordion, "venue-illustration")}
    >
      <div className="grid grid-cols-3 gap-2">
        {VENUE_ILLUSTRATIONS.map((option) => {
          const isSelected = option.id === venueIllustration;
          const art = venueArt(option.id);

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onVenueIllustrationChange(option.id)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              <span
                className={[
                  "flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border bg-[var(--lifafa-ink-raised)] p-1.5 text-[var(--lifafa-cream)] transition-shadow duration-150",
                  isSelected
                    ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                    : "border-[var(--lifafa-hairline)]",
                ].join(" ")}
              >
                {art === null ? (
                  <NonePreview />
                ) : (
                  <img
                    src={art.thumb}
                    alt=""
                    width={art.width}
                    height={art.height}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    className="h-full w-full object-contain select-none"
                  />
                )}
              </span>
              <span
                className={`text-center text-[0.6875rem] leading-tight ${
                  isSelected ? "text-[var(--lifafa-cream)]" : "text-[var(--lifafa-muted)]"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--lifafa-muted)]">
        {venueIllustration === "none"
          ? "The venue section shows the map, the name and the address."
          : "Shown at the top of the venue section, above the map and the name."}
      </p>
    </CollapsibleSection>
  );
}
