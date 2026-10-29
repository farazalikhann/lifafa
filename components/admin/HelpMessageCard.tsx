"use client";

import Link from "next/link";
import { useState, useTransition, type ReactElement } from "react";
import { saveHelpNoteAction, setHelpStatusAction } from "@/app/admin/help/actions";
import type { HelpMessagePage, HelpMessageStatus } from "@/types/database";

/**
 * One message in the admin Help inbox (/admin/help).
 *
 * A native <details>: the summary row is the tap target, it opens with no
 * JavaScript, and it stays open across the refresh an action triggers because
 * React keeps the same element. The links and dates are worked out on the
 * server and passed in, so this file never imports the service role module.
 */

export interface HelpMessageCardData {
  id: string;
  name: string;
  contact: string;
  message: string;
  firstLine: string;
  page: HelpMessagePage | null;
  userEmail: string | null;
  status: HelpMessageStatus;
  adminNote: string | null;
  /** ISO, for the <time> element. */
  createdAt: string;
  /** "2 h ago", worked out when the page was rendered. */
  ago: string;
  /** The full date and time, IST, for the hover title. */
  fullDate: string;
  whatsAppUrl: string | null;
  emailUrl: string | null;
  eventHref: string | null;
}

const STATUS_BADGE: Record<HelpMessageStatus, { label: string; className: string }> = {
  new: { label: "New", className: "border-red-200 bg-red-50 text-red-700" },
  replied: { label: "Replied", className: "border-blue-200 bg-blue-50 text-blue-700" },
  closed: { label: "Closed", className: "border-zinc-200 bg-zinc-100 text-zinc-600" },
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900";
const BUTTON = `inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors disabled:opacity-50 ${FOCUS}`;
const BUTTON_PRIMARY = `${BUTTON} bg-zinc-900 text-white hover:bg-zinc-700`;
const BUTTON_SECONDARY = `${BUTTON} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100`;

export default function HelpMessageCard({ data }: { data: HelpMessageCardData }): ReactElement {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState(data.adminNote ?? "");
  const [savedNote, setSavedNote] = useState(data.adminNote ?? "");
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");

  const badge = STATUS_BADGE[data.status];

  function setStatus(status: HelpMessageStatus): void {
    setError(null);
    startTransition(async () => {
      const result = await setHelpStatusAction(data.id, status);

      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  /* Opening a reply marks the message replied; the link itself still opens. */
  function onReply(): void {
    if (data.status !== "replied") {
      setStatus("replied");
    }
  }

  async function saveNote(): Promise<void> {
    setError(null);
    setNoteState("saving");
    const result = await saveHelpNoteAction(data.id, note);

    if (!result.ok) {
      setError(result.error);
      setNoteState("idle");
      return;
    }

    setSavedNote(note.trim());
    setNote(note.trim());
    setNoteState("saved");
  }

  const noteChanged = note.trim() !== savedNote;

  return (
    <li className="rounded-lg border border-zinc-200 bg-white">
      <details className="group">
        <summary className={`flex cursor-pointer list-none gap-3 rounded-lg p-3 sm:p-4 [&::-webkit-details-marker]:hidden ${FOCUS}`}>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate font-semibold">{data.name}</span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                {badge.label}
              </span>
              <time
                dateTime={data.createdAt}
                title={data.fullDate}
                className="ml-auto shrink-0 text-xs whitespace-nowrap text-zinc-500"
              >
                {data.ago}
              </time>
            </div>
            <p className="mt-0.5 truncate text-sm text-zinc-600">
              {data.contact}
              <span className="text-zinc-400"> · </span>
              {data.page ?? "unknown page"}
            </p>
            <p className="mt-1 truncate text-sm text-zinc-900 group-open:hidden">{data.firstLine}</p>
          </div>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180 motion-reduce:transition-none"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
        </summary>

        <div className="border-t border-zinc-100 px-3 pt-3 pb-4 sm:px-4">
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-zinc-900">
            {data.message}
          </p>

          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-zinc-600">
            <dt className="font-medium">Sent</dt>
            <dd>{data.fullDate}</dd>
            <dt className="font-medium">Signed in as</dt>
            <dd className="break-all">{data.userEmail ?? "Not signed in"}</dd>
          </dl>

          {data.eventHref !== null ? (
            <Link
              href={data.eventHref}
              className={`mt-2 inline-flex min-h-10 items-center rounded text-sm text-blue-700 underline underline-offset-2 ${FOCUS}`}
            >
              Open event →
            </Link>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {data.whatsAppUrl !== null ? (
              <a href={data.whatsAppUrl} target="_blank" rel="noopener noreferrer" onClick={onReply} className={BUTTON_PRIMARY}>
                Reply on WhatsApp
              </a>
            ) : null}
            {data.emailUrl !== null ? (
              <a href={data.emailUrl} onClick={onReply} className={BUTTON_PRIMARY}>
                Reply by email
              </a>
            ) : null}
            {data.status === "new" ? (
              <button type="button" disabled={pending} onClick={() => setStatus("replied")} className={BUTTON_SECONDARY}>
                Mark replied
              </button>
            ) : null}
            {data.status !== "closed" ? (
              <button type="button" disabled={pending} onClick={() => setStatus("closed")} className={BUTTON_SECONDARY}>
                Close
              </button>
            ) : null}
            {data.status !== "new" ? (
              <button type="button" disabled={pending} onClick={() => setStatus("new")} className={BUTTON_SECONDARY}>
                Reopen
              </button>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor={`note-${data.id}`} className="text-xs font-medium text-zinc-600">
              Admin note
            </label>
            <textarea
              id={`note-${data.id}`}
              rows={3}
              maxLength={4000}
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                setNoteState("idle");
              }}
              placeholder="Only you see this."
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-2.5 py-2 text-base text-zinc-900 focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 sm:text-sm"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={!noteChanged || noteState === "saving"}
                onClick={() => void saveNote()}
                className={BUTTON_SECONDARY}
              >
                {noteState === "saving" ? "Saving..." : "Save note"}
              </button>
              {noteState === "saved" && !noteChanged ? (
                <span className="text-xs text-zinc-500" role="status">
                  Saved
                </span>
              ) : null}
            </div>
          </div>

          {error !== null ? (
            <p role="alert" className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
        </div>
      </details>
    </li>
  );
}
