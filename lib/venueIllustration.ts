import type { VenueIllustration } from "@/types/card";

/**
 * The painting of the place above the venue's name: a garden or a banquet
 * hall, or none. Drawn by
 * components/card/sections/VenueSection.tsx.
 */

export const DEFAULT_VENUE_ILLUSTRATION: VenueIllustration = "none";

export const VENUE_ILLUSTRATIONS: readonly { id: VenueIllustration; label: string }[] = [
  { id: "none", label: "None" },
  { id: "garden", label: "Garden" },
  { id: "banquet", label: "Banquet Hall" },
];

export interface VenueArt {
  src: string;
  /** 300px wide, for the editor's picker. */
  thumb: string;
  /** The file's own size, so the card can hold its place before it loads. */
  width: number;
  height: number;
}

const ART: Record<Exclude<VenueIllustration, "none">, VenueArt> = {
  garden: art("garden", 960, 463),
  banquet: art("banquet", 1080, 643),
};

function art(name: string, width: number, height: number): VenueArt {
  return {
    src: `/decor/venue/${name}.webp`,
    thumb: `/decor/venue/thumbs/${name}.webp`,
    width,
    height,
  };
}

/**
 * The palace courtyard and the poolside, offered until the editor's venue
 * picker went. No card was saved with either, and their paintings are gone;
 * one that turns up (a draft kept in a browser) is drawn with none.
 */
const RETIRED_VENUES: Readonly<Record<string, VenueIllustration>> = { palace: "none", poolside: "none" };

/**
 * Absent from every card saved before there was a choice, and those cards had
 * no illustration: a missing or unknown value is "none".
 */
export function venueIllustrationOf(value: unknown): VenueIllustration {
  if (typeof value === "string" && value in RETIRED_VENUES) return RETIRED_VENUES[value];
  return VENUE_ILLUSTRATIONS.find((option) => option.id === value)?.id ?? DEFAULT_VENUE_ILLUSTRATION;
}

/** The picture for a choice, or null for "none". */
export function venueArt(illustration: VenueIllustration): VenueArt | null {
  return illustration === "none" ? null : ART[illustration];
}
