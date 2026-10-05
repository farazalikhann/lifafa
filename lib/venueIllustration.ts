import type { VenueIllustration } from "@/types/card";

/**
 * The painting of the place above the venue's name: a garden, a banquet hall,
 * a palace courtyard or a poolside, or none. Drawn by
 * components/card/sections/VenueSection.tsx and chosen in
 * components/create/VenueIllustrationPanel.tsx.
 */

export const DEFAULT_VENUE_ILLUSTRATION: VenueIllustration = "none";

export const VENUE_ILLUSTRATIONS: readonly { id: VenueIllustration; label: string }[] = [
  { id: "none", label: "None" },
  { id: "garden", label: "Garden" },
  { id: "banquet", label: "Banquet Hall" },
  { id: "palace", label: "Palace" },
  { id: "poolside", label: "Poolside" },
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
  palace: art("palace", 960, 559),
  poolside: art("poolside", 960, 622),
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
 * Absent from every card saved before there was a choice, and those cards had
 * no illustration: a missing or unknown value is "none".
 */
export function venueIllustrationOf(value: unknown): VenueIllustration {
  return VENUE_ILLUSTRATIONS.find((option) => option.id === value)?.id ?? DEFAULT_VENUE_ILLUSTRATION;
}

/** The picture for a choice, or null for "none". */
export function venueArt(illustration: VenueIllustration): VenueArt | null {
  return illustration === "none" ? null : ART[illustration];
}
