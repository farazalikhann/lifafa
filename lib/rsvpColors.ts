import type { RsvpStatus } from "@/types/guest";

/**
 * The colour of each reply, for the badges on the guest list and at the door.
 *
 * Theme tokens rather than hex, so the same badge reads on the dark theme and
 * on the light one: --lifafa-yes and the rest are set in globals.css on :root
 * and again, darker, on the light theme, where each is above 4.5:1 as text.
 * The badge's fill is its own colour at 12 percent.
 */
export const RSVP_COLOUR: Record<RsvpStatus, string> = {
  accepted: "var(--lifafa-yes)",
  declined: "var(--lifafa-no)",
  maybe: "var(--lifafa-maybe)",
  pending: "var(--lifafa-pending)",
};

export const RSVP_BADGE_STYLE: Record<RsvpStatus, { color: string; background: string }> = {
  accepted: badge("accepted"),
  declined: badge("declined"),
  maybe: badge("maybe"),
  pending: badge("pending"),
};

function badge(status: RsvpStatus): { color: string; background: string } {
  return {
    color: RSVP_COLOUR[status],
    background: `color-mix(in srgb, ${RSVP_COLOUR[status]} 12%, transparent)`,
  };
}
