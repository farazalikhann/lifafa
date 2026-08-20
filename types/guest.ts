export type RsvpStatus = "accepted" | "declined" | "maybe" | "pending";

/** What a guest can actually choose — "pending" is the absence of a reply. */
export type GuestReply = Exclude<RsvpStatus, "pending">;

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
  /** ISO timestamp of arrival at the door, or null if not checked in. */
  checkedInAt: string | null;
}

/** Everything a guest sends back with their reply. */
export interface RsvpSubmission {
  status: GuestReply;
  /** Total people attending, including the guest themselves. Always >= 1. */
  partySize: number;
  name: string;
  /** Exactly 10 digits, no formatting. */
  phone: string;
  message: string;
}
