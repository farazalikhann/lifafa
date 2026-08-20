export type RsvpStatus = "accepted" | "declined" | "maybe" | "pending";

export interface Guest {
  id: string;
  name: string;
  phone: string;
  rsvp: RsvpStatus;
  /** Extra people this guest is bringing, not counting themselves. */
  accompanyingCount: number;
  /** ISO timestamp of the reply, or null while still pending. */
  respondedAt: string | null;
  checkedIn: boolean;
}
