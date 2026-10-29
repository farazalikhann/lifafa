"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { requestIp } from "@/lib/admin/rateLimit";
import { sendOwnerAlert } from "@/lib/email/alerts";
import { serverSiteOrigin } from "@/lib/serverSiteOrigin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isHoneypotFilled,
  readHelpForm,
  type HelpFormInput,
  type HelpSendResult,
} from "@/lib/help/form";
import {
  HELP_MAX_MESSAGES,
  HELP_WINDOW_MS,
  returnHelpSlot,
  takeHelpSlot,
} from "@/lib/help/rateLimit";

/**
 * The Help bot's send: saves one message to help_messages and emails the owner.
 *
 * The only export, because every export of a "use server" module is a public
 * endpoint. Anyone may call it, signed in or not, so nothing it receives is
 * trusted:
 *
 *   Every field is trimmed and checked again here (lib/help/form.ts).
 *   user_id and user_email come from the session cookie, never the form.
 *   event_id is kept only when it is one of the signed-in host's own events.
 *   A filled honeypot gets "sent" and nothing is saved or emailed.
 *   3 messages per 10 minutes per address, and per signed-in host.
 *
 * Saved first, emailed after. The email goes out in after(), once the answer
 * is on its way, and sendOwnerAlert never throws: a failed email is a log line,
 * never a lost message or an error for the person asking for help.
 */

const TOO_MANY =
  "You've sent a few messages already. Please wait a few minutes and try again.";
const NOT_SAVED =
  "We couldn't send your message just now. Please try again in a moment.";

export async function sendHelpMessage(
  input: HelpFormInput,
): Promise<HelpSendResult> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: NOT_SAVED };
  }

  /* A bot: told it worked, and nothing more. Before any other work is done for it. */
  if (isHoneypotFilled(input)) {
    return { ok: true };
  }

  const read = readHelpForm(input);

  if (!read.ok) {
    return read;
  }

  const { form } = read;
  const ip = requestIp(await headers());

  /* The session, if there is one. A broken cookie means "not signed in", not "no help". */
  let user: { id: string; email: string | null } | null = null;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();

    if (data.user !== null) {
      user = { id: data.user.id, email: data.user.email ?? null };
    }
  } catch (cause: unknown) {
    console.error("[help] could not read the session:", cause);
  }

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch (cause: unknown) {
    console.error("[help] no admin client:", cause);
    return { ok: false, error: NOT_SAVED };
  }

  /* Per host: counted in the table, so it holds across every server instance. */
  if (user !== null) {
    const since = new Date(Date.now() - HELP_WINDOW_MS).toISOString();
    const { count, error } = await admin
      .from("help_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);

    if (error !== null) {
      console.error("[help] could not count recent messages:", error);
      return { ok: false, error: NOT_SAVED };
    }

    if ((count ?? 0) >= HELP_MAX_MESSAGES) {
      return { ok: false, error: TOO_MANY };
    }
  }

  /* Per address. Taken last, so a refused or invalid request costs no slot. */
  if (!takeHelpSlot(ip)) {
    return { ok: false, error: TOO_MANY };
  }

  /* Only the signed-in host's own event; anything else is dropped, not refused. */
  let eventId: string | null = null;

  if (form.eventId !== null && user !== null) {
    const { data, error } = await admin
      .from("events")
      .select("id")
      .eq("id", form.eventId)
      .eq("host_id", user.id)
      .maybeSingle();

    if (error !== null) {
      console.error("[help] could not check the event:", error);
    } else if (data !== null) {
      eventId = data.id;
    }
  }

  const { data: saved, error: saveError } = await admin
    .from("help_messages")
    .insert({
      name: form.name,
      contact: form.contact,
      message: form.message,
      page: form.page,
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      event_id: eventId,
    })
    .select("id")
    .single();

  if (saveError !== null || saved === null) {
    console.error("[help] could not save the message:", saveError);
    returnHelpSlot(ip);
    return { ok: false, error: NOT_SAVED };
  }

  /* Worked out now: request headers may not be readable once after() runs. */
  let adminLink = "/admin/help";

  try {
    adminLink = `${await serverSiteOrigin()}/admin/help`;
  } catch (cause: unknown) {
    console.error("[help] could not work out the site origin:", cause);
  }

  const lines = [
    `Name: ${form.name}`,
    `Contact: ${form.contact}`,
    `Page: ${form.page ?? "unknown"}`,
    ...(user !== null
      ? [`Signed in as: ${user.email ?? user.id}`]
      : ["Signed in: no"]),
    ...(eventId !== null ? [`Event: ${eventId}`] : []),
    "",
    "Message:",
    form.message,
    "",
    `Reply from: ${adminLink}`,
    `Message id: ${saved.id}`,
  ];

  after(async () => {
    try {
      await sendOwnerAlert(`Help message from ${form.name}`, lines);
    } catch (cause: unknown) {
      console.error("[help] alert threw:", cause);
    }
  });

  return { ok: true };
}
