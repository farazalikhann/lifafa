"use server";

import { revalidatePath } from "next/cache";
import { adminSession } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HelpMessageStatus } from "@/types/database";

/*
  ────────────────────────────────────────────────────────────────────────────
  The Help inbox's writes: a message's status and its admin note.

  Every export of this file is a public endpoint, so each checks the admin
  session first and does nothing without one, as app/admin/payments/actions.ts
  does. Arguments are whatever crossed the wire and are checked here.

  revalidatePath on the /admin layout, so the nav's "new" badge and the
  overview's card are recounted along with the list.
  ────────────────────────────────────────────────────────────────────────────
*/

export type HelpActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUSES: readonly HelpMessageStatus[] = ["new", "replied", "closed"];

/** Longer than any note worth writing, short enough that a stuck paste cannot fill the table. */
const MAX_NOTE_LENGTH = 4000;

const EXPIRED: HelpActionResult = { ok: false, error: "Your session has expired. Sign in again." };

export async function setHelpStatusAction(
  messageId: unknown,
  status: unknown,
): Promise<HelpActionResult> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] setHelpStatusAction called without a session.");
    return EXPIRED;
  }

  if (
    typeof messageId !== "string" ||
    !UUID.test(messageId) ||
    !STATUSES.includes(status as HelpMessageStatus)
  ) {
    return { ok: false, error: "That message is not valid." };
  }

  const { data, error } = await createAdminClient()
    .from("help_messages")
    .update({ status: status as HelpMessageStatus })
    .eq("id", messageId)
    .select("id");

  if (error !== null) {
    console.error("[admin] could not set help message status:", error);
    return { ok: false, error: "Could not update this message. Please try again." };
  }

  if (data.length === 0) {
    return { ok: false, error: "This message no longer exists. Reload the page." };
  }

  console.info(`[admin] ${session.username} set help message ${messageId} to ${String(status)}`);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function saveHelpNoteAction(
  messageId: unknown,
  note: unknown,
): Promise<HelpActionResult> {
  const session = await adminSession();

  if (session === null) {
    console.warn("[admin] saveHelpNoteAction called without a session.");
    return EXPIRED;
  }

  if (typeof messageId !== "string" || !UUID.test(messageId) || typeof note !== "string") {
    return { ok: false, error: "That note is not valid." };
  }

  const trimmed = note.trim();

  if (trimmed.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `A note can be at most ${MAX_NOTE_LENGTH} characters.` };
  }

  const { data, error } = await createAdminClient()
    .from("help_messages")
    .update({ admin_note: trimmed.length === 0 ? null : trimmed })
    .eq("id", messageId)
    .select("id");

  if (error !== null) {
    console.error("[admin] could not save help message note:", error);
    return { ok: false, error: "Could not save the note. Please try again." };
  }

  if (data.length === 0) {
    return { ok: false, error: "This message no longer exists. Reload the page." };
  }

  revalidatePath("/admin/help");
  return { ok: true };
}
