"use client";

import { useRef, useState, type ReactElement } from "react";
import type { Guest, RsvpStatus } from "@/types/guest";

const REPLY_LABEL: Record<RsvpStatus, string> = {
  accepted: "Accepted",
  declined: "Declined",
  maybe: "Maybe",
  pending: "Awaiting reply",
};

/**
 * Byte order mark, written as an escape rather than the character itself: a
 * bare U+FEFF is invisible in an editor and one stray reformat away from being
 * dropped. Without it Excel opens the file as ANSI and a rupee sign or an em
 * dash in a guest's message arrives as mojibake.
 */
const BOM = "﻿";

const COLUMNS: readonly string[] = [
  "Name",
  "Phone",
  "Reply",
  "Accompanying count",
  "Total party size",
  "Message",
  "Responded at",
  "Checked in",
];

/**
 * RFC 4180 quoting.
 *
 * A field is wrapped in quotes whenever it contains a comma, a quote or a line
 * break, and any quote inside it is doubled. Without this a guest who writes
 * "Congratulations, both of you!" shifts every later column on their row by
 * one, which is the kind of corruption a host only notices at the venue.
 */
function csvField(value: string): string {
  const needsQuoting = /[",\r\n]/.test(value);

  if (!needsQuoting) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

function toCsv(guests: readonly Guest[]): string {
  const rows = guests.map((guest) => [
    guest.name,
    guest.phone,
    REPLY_LABEL[guest.rsvp],
    String(guest.accompanyingCount),
    /* The guest plus whoever they bring — the number a caterer needs. */
    String(guest.accompanyingCount + 1),
    guest.message ?? "",
    guest.respondedAt ?? "",
    guest.checkedIn ? "Yes" : "No",
  ]);

  /* CRLF, which is what spreadsheet software expects from a .csv. */
  return [COLUMNS, ...rows]
    .map((row) => row.map(csvField).join(","))
    .join("\r\n");
}

export default function ExportCsvButton({
  guests,
  eventId,
}: {
  guests: readonly Guest[];
  eventId: string;
}): ReactElement {
  const [state, setState] = useState<"idle" | "done">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleExport = (): void => {
    /*
      A BOM, so Excel reads the file as UTF-8. Without it a message with an
      em dash or a rupee sign opens as mojibake on a default Windows install.
    */
    const blob = new Blob([BOM + toCsv(guests)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `lifafa-guests-${eventId}.csv`;
    document.body.append(link);
    link.click();
    link.remove();

    /*
      Released on the next frame rather than immediately: revoking while the
      click is still being handled cancels the download in some browsers.
    */
    requestAnimationFrame(() => URL.revokeObjectURL(url));

    if (resetTimer.current !== null) {
      clearTimeout(resetTimer.current);
    }
    setState("done");
    resetTimer.current = setTimeout(() => setState("idle"), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      aria-live="polite"
      className="flex min-h-11 items-center justify-center rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:text-sm"
    >
      {state === "done" ? "Downloaded" : "Export CSV"}
    </button>
  );
}
