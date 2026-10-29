import type { HelpMessagePage } from "@/types/database";

/**
 * The Help bot's form: its limits and how a submission is read.
 *
 * Plain module with no server imports, so the form in the browser can show the
 * same limits. The server action (lib/help/actions.ts) runs readHelpForm again
 * on whatever arrives; the browser's checks are a courtesy, never the rule.
 * The same limits are CHECKed in the table (0017_help_messages.sql).
 */

export const HELP_NAME_MAX = 80;
export const HELP_CONTACT_MAX = 120;
export const HELP_MESSAGE_MAX = 2000;

/** What the form sends. Every field is unknown until readHelpForm says otherwise. */
export interface HelpFormInput {
  name?: unknown;
  contact?: unknown;
  message?: unknown;
  page?: unknown;
  eventId?: unknown;
  /** The honeypot. Hidden from people; a bot that fills it is ignored. */
  website?: unknown;
}

export interface HelpForm {
  name: string;
  contact: string;
  message: string;
  page: HelpMessagePage | null;
  eventId: string | null;
}

export type HelpField = "name" | "contact" | "message";

export type HelpSendResult =
  | { ok: true }
  | { ok: false; error: string; field?: HelpField };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* Digits with the usual separators, and 7 to 15 digits in all (E.164's ceiling). */
const PHONE_CHARS = /^\+?[0-9\s\-().]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A single line: trimmed, with any run of whitespace (newlines too) as one space. */
function oneLine(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function isHelpContact(value: string): boolean {
  if (EMAIL.test(value)) {
    return true;
  }

  if (!PHONE_CHARS.test(value)) {
    return false;
  }

  const digits = value.replace(/\D/g, "").length;
  return digits >= 7 && digits <= 15;
}

/** True when the honeypot has anything in it. */
export function isHoneypotFilled(input: HelpFormInput): boolean {
  return typeof input.website === "string" && input.website.trim().length > 0;
}

/** The submission, trimmed and checked, or the first thing wrong with it. */
export function readHelpForm(
  input: HelpFormInput,
): { ok: true; form: HelpForm } | { ok: false; error: string; field?: HelpField } {
  const name = oneLine(input.name);
  const contact = oneLine(input.contact);
  /* Line breaks kept in the message; only its ends are trimmed. */
  const message =
    typeof input.message === "string"
      ? input.message.replace(/\r\n?/g, "\n").trim()
      : "";

  if (name.length === 0) {
    return { ok: false, field: "name", error: "Please tell us your name." };
  }

  if (name.length > HELP_NAME_MAX) {
    return {
      ok: false,
      field: "name",
      error: `Your name can be at most ${HELP_NAME_MAX} characters.`,
    };
  }

  if (contact.length === 0) {
    return {
      ok: false,
      field: "contact",
      error: "Please give an email or phone number so we can reply.",
    };
  }

  if (contact.length > HELP_CONTACT_MAX || !isHelpContact(contact)) {
    return {
      ok: false,
      field: "contact",
      error: "That doesn't look like an email address or a phone number.",
    };
  }

  if (message.length === 0) {
    return { ok: false, field: "message", error: "Please write your message." };
  }

  if (message.length > HELP_MESSAGE_MAX) {
    return {
      ok: false,
      field: "message",
      error: `Your message can be at most ${HELP_MESSAGE_MAX} characters.`,
    };
  }

  const page: HelpMessagePage | null =
    input.page === "home" || input.page === "dashboard" ? input.page : null;

  const eventId =
    typeof input.eventId === "string" && UUID.test(input.eventId.trim())
      ? input.eventId.trim().toLowerCase()
      : null;

  return { ok: true, form: { name, contact, message, page, eventId } };
}
