import { scrubSearch } from "@/lib/admin/eventsQuery";
import { dbFailure, dbSuccess, type DbResult } from "@/lib/db/result";
import { createAdminClient } from "@/lib/supabase/admin";
import type { HelpMessagePage, HelpMessageStatus } from "@/types/database";

/**
 * The admin's Help inbox: messages sent through the Help bot (0017).
 *
 * Reads through the service role, because help_messages has no RLS policies
 * at all. Every caller has already passed requireAdminSession; this module
 * does not check it again, and nothing outside /admin imports it.
 */

export const HELP_PAGE_SIZE = 25;

const MAX_SEARCH_LENGTH = 64;

export type HelpStatusFilter = HelpMessageStatus | "all";

export const HELP_STATUS_TABS: readonly { id: HelpStatusFilter; label: string }[] = [
  { id: "new", label: "New" },
  { id: "replied", label: "Replied" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
];

export interface HelpQuery {
  status: HelpStatusFilter;
  /** Scrubbed for use inside a PostgREST filter; empty means no search. */
  search: string;
  /** What was typed, for the box and the links. */
  rawSearch: string;
  /** Zero based. */
  page: number;
}

export interface AdminHelpMessage {
  id: string;
  createdAt: string;
  name: string;
  contact: string;
  message: string;
  page: HelpMessagePage | null;
  userEmail: string | null;
  eventId: string | null;
  status: HelpMessageStatus;
  adminNote: string | null;
}

export interface HelpMessagePageResult {
  messages: AdminHelpMessage[];
  total: number;
  page: number;
  pageCount: number;
  outOfRange: boolean;
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseHelpQuery(
  params: Record<string, string | string[] | undefined>,
): HelpQuery {
  const rawStatus = one(params.status);
  const rawSearch = one(params.search).slice(0, MAX_SEARCH_LENGTH);
  const parsedPage = Number.parseInt(one(params.page), 10);

  return {
    status: HELP_STATUS_TABS.some((tab) => tab.id === rawStatus)
      ? (rawStatus as HelpStatusFilter)
      : "new",
    search: scrubSearch(rawSearch),
    rawSearch,
    page: Number.isFinite(parsedPage) && parsedPage > 1 ? Math.floor(parsedPage) - 1 : 0,
  };
}

/** The inbox URL for this query, with `overrides` applied. "New" and page 1 are the defaults and left out. */
export function helpHref(query: HelpQuery, overrides: Partial<HelpQuery> = {}): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (next.status !== "new") {
    params.set("status", next.status);
  }

  if (next.rawSearch.length > 0) {
    params.set("search", next.rawSearch);
  }

  if (next.page > 0) {
    params.set("page", String(next.page + 1));
  }

  const queryString = params.toString();
  return queryString.length === 0 ? "/admin/help" : `/admin/help?${queryString}`;
}

/** One page of messages, newest first. */
export async function getHelpMessagePage(
  query: HelpQuery,
): Promise<DbResult<HelpMessagePageResult>> {
  const supabase = createAdminClient();
  const from = query.page * HELP_PAGE_SIZE;

  let request = supabase
    .from("help_messages")
    .select(
      "id, created_at, name, contact, message, page, user_email, event_id, status, admin_note",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + HELP_PAGE_SIZE - 1);

  if (query.status !== "all") {
    request = request.eq("status", query.status);
  }

  /*
    The search is scrubbed of , ( ) " \ % _ * before it gets here, so it can
    neither end the or() list early nor act as a wildcard of its own.
  */
  if (query.search.length > 0) {
    const like = `%${query.search}%`;
    request = request.or(`name.ilike.${like},contact.ilike.${like},message.ilike.${like}`);
  }

  const { data, count, error } = await request;

  /* PostgREST answers a range past the end with 416; that is an empty page, not a failure. */
  if (error !== null && error.code !== "PGRST103") {
    return dbFailure("admin/getHelpMessagePage", error, "Could not load help messages.");
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / HELP_PAGE_SIZE));

  return dbSuccess({
    messages: (data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      name: row.name,
      contact: row.contact,
      message: row.message,
      page: row.page,
      userEmail: row.user_email,
      eventId: row.event_id,
      status: row.status,
      adminNote: row.admin_note,
    })),
    total,
    page: query.page,
    pageCount,
    outOfRange: total > 0 && query.page >= pageCount,
  });
}

/** How many messages are still "new"; null when it could not be counted. */
export async function countNewHelpMessages(): Promise<number | null> {
  try {
    const { count, error } = await createAdminClient()
      .from("help_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");

    if (error !== null) {
      console.error("[admin] could not count new help messages:", error);
      return null;
    }

    return count ?? 0;
  } catch (cause: unknown) {
    console.error("[admin] could not count new help messages:", cause);
    return null;
  }
}

/* ───────────────────────── Reply links ───────────────────────── */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The 10-digit Indian mobile number in `contact`, or null.
 *
 * Accepts 98765 43210, +91 98765 43210, 091..., 0 98765 43210 and the like:
 * whatever is left after the digits are pulled out must be a 10-digit number
 * starting 6 to 9, optionally after 91 or 0.
 */
export function indianMobile(contact: string): string | null {
  if (EMAIL.test(contact)) {
    return null;
  }

  const digits = contact.replace(/\D/g, "");
  const match = /^(?:0|91|091)?([6-9]\d{9})$/.exec(digits);
  return match === null ? null : match[1];
}

/** The address to reply to: the contact if it is an email, else the signed-in host's. */
export function replyEmail(contact: string, userEmail: string | null): string | null {
  if (EMAIL.test(contact)) {
    return contact;
  }

  return userEmail !== null && EMAIL.test(userEmail) ? userEmail : null;
}

export function whatsAppReplyUrl(mobile: string, name: string): string {
  const text = `Hi ${name}, this is Lifafa support about your message: `;
  return `https://wa.me/91${mobile}?text=${encodeURIComponent(text)}`;
}

export function emailReplyUrl(email: string): string {
  return `mailto:${email}?subject=${encodeURIComponent("Re: your message to Lifafa")}`;
}

/* ───────────────────────── Display ───────────────────────── */

/** "just now", "5 min ago", "2 h ago", "3 d ago"; past a month, the date. */
export function timeAgo(iso: string, now: number, fallback: string): string {
  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) {
    return fallback;
  }

  const minutes = Math.floor((now - then) / 60_000);

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} h ago`;
  }

  const days = Math.floor(hours / 24);
  return days <= 30 ? `${days} d ago` : fallback;
}

/** The message's first non-empty line, for the collapsed row. */
export function firstLine(message: string): string {
  return message.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";
}
