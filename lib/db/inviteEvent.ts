import { cache } from "react";
import { getEventByInviteCode } from "@/lib/db/events";

/**
 * The guest-facing read, once per request.
 *
 * /i/[inviteCode] asks for the same event twice while rendering one page: the
 * layout for its metadata and the page for the card. Without this, every guest
 * opening a link paid for two identical round trips to Supabase. React's
 * `cache` scopes the answer to a single server request, so a second visitor —
 * or the same one refreshing — still gets a fresh read.
 *
 * Its own module rather than a line in lib/db/events.ts, because a "use server"
 * file may only export async functions and a cached wrapper is not one.
 */
export const getInviteEvent = cache(getEventByInviteCode);
