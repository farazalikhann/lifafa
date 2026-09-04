"use client";

import { useRef, useState, type ReactElement } from "react";
import { formatDateAndTime } from "@/lib/cardFormat";
import type { SubEvent } from "@/types/event";

/**
 * The other functions in a celebration, added one at a time.
 *
 * The list is the host's own order, never sorted here. They add the reception,
 * then remember the haldi, and a list that rearranged itself under their hands
 * as they typed would be its own small hostility. TimelineSection sorts a copy
 * when it draws the card, which is the only place chronology matters.
 */

/** Six is the whole of a large wedding and past the point a card can carry. */
const MAX_SUB_EVENTS = 6;

/** One line, so it sits under a function's name without becoming a paragraph. */
const NOTE_LIMIT = 80;

/**
 * Offered as a datalist rather than a fixed list.
 *
 * These cover most Hindu, Muslim and Sikh weddings between them, and a datalist
 * suggests without constraining: a host holding a Griha Pravesh or a Roka types
 * it and the field takes it, which a select would not have.
 */
const LABEL_SUGGESTIONS: readonly string[] = [
  "Mehndi",
  "Haldi",
  "Sangeet",
  "Nikah",
  "Wedding",
  "Reception",
  "Walima",
  "Engagement",
];

const INPUT_CLASS = [
  "w-full min-h-11 rounded-xl px-4 py-2.5",
  "border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]",
  "text-[0.9375rem] text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/70",
  "transition-colors duration-150 [color-scheme:dark]",
  "focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none",
].join(" ");

/** 44px square, which is the smallest target a thumb reliably hits. */
const ICON_BUTTON_CLASS = [
  "flex size-11 shrink-0 items-center justify-center rounded-xl border",
  "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)]",
  "transition-colors duration-150 hover:border-[var(--lifafa-marigold)] hover:text-[var(--lifafa-cream)]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
].join(" ");

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactElement;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export default function SubEventEditor({
  subEvents,
  onChange,
}: {
  subEvents: readonly SubEvent[];
  onChange: (next: readonly SubEvent[]) => void;
}): ReactElement {
  /** Which function has its fields open. One at a time, or the column is a wall. */
  const [openId, setOpenId] = useState<string | null>(null);

  /*
    Ids come from a counter, never Math.random and never Date.now.

    This list renders on the server and again in the browser, and a key that
    differs between the two is a hydration mismatch. The counter is also stepped
    past anything already in the list, so a draft restored from the sign-in
    stash — which arrives carrying sub-1 and sub-2 while this ref is back at
    zero — cannot mint a duplicate.
  */
  const counter = useRef(0);

  const isFull = subEvents.length >= MAX_SUB_EVENTS;

  const handleAdd = (): void => {
    if (isFull) {
      return;
    }

    let id = "";

    do {
      counter.current += 1;
      id = `sub-${counter.current}`;
    } while (subEvents.some((entry) => entry.id === id));

    const added: SubEvent = {
      id,
      label: "",
      date: "",
      time: "",
      venueName: "",
      venueAddress: "",
    };

    onChange([...subEvents, added]);

    /* Added and opened in one click. Nobody adds a function to leave it blank. */
    setOpenId(id);
  };

  const handleField = <K extends keyof SubEvent>(
    id: string,
    field: K,
    value: SubEvent[K],
  ): void => {
    onChange(
      subEvents.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleRemove = (id: string): void => {
    onChange(subEvents.filter((entry) => entry.id !== id));

    if (openId === id) {
      setOpenId(null);
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
          More functions
        </h2>
        <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
          The mehndi, the sangeet, the reception. Your main event stays where it
          is; these are added around it.
        </p>
      </div>

      {subEvents.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {subEvents.map((entry) => {
            const isOpen = entry.id === openId;
            const when = formatDateAndTime(entry.date, entry.time);
            const name = entry.label.trim();
            const title = name.length > 0 ? name : "Untitled function";

            return (
              <li
                key={entry.id}
                className="flex flex-col gap-3 rounded-2xl border border-[var(--lifafa-hairline)] px-3 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p
                      className={`truncate text-[0.875rem] font-medium ${
                        name.length > 0
                          ? "text-[var(--lifafa-cream)]"
                          : "text-[var(--lifafa-muted)]"
                      }`}
                    >
                      {title}
                    </p>
                    <p className="truncate text-xs text-[var(--lifafa-muted)]">
                      {when ?? "No date yet"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : entry.id)}
                    aria-expanded={isOpen}
                    aria-label={
                      isOpen ? `Close ${title}` : `Edit ${title}`
                    }
                    className={ICON_BUTTON_CLASS}
                  >
                    {/* A pencil, and a chevron once the fields are open. */}
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      focusable="false"
                    >
                      {isOpen ? (
                        <path d="M6 15l6-6 6 6" />
                      ) : (
                        <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                      )}
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    aria-label={`Remove ${title}`}
                    className={ICON_BUTTON_CLASS}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      aria-hidden
                      focusable="false"
                    >
                      <path d="M5 7h14M10 7V5h4v2M8 7v12h8V7M11 10.5v5M13 10.5v5" />
                    </svg>
                  </button>
                </div>

                {isOpen ? (
                  <div className="flex flex-col gap-4 border-t border-[var(--lifafa-hairline)] pt-3">
                    <Field id={`${entry.id}-label`} label="Function name">
                      <input
                        id={`${entry.id}-label`}
                        type="text"
                        value={entry.label}
                        onChange={(event) =>
                          handleField(entry.id, "label", event.target.value)
                        }
                        list="lifafa-function-names"
                        placeholder="Mehndi"
                        autoComplete="off"
                        className={INPUT_CLASS}
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id={`${entry.id}-date`} label="Date">
                        <input
                          id={`${entry.id}-date`}
                          type="date"
                          value={entry.date}
                          onChange={(event) =>
                            handleField(entry.id, "date", event.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                      </Field>

                      <Field id={`${entry.id}-time`} label="Start time">
                        <input
                          id={`${entry.id}-time`}
                          type="time"
                          value={entry.time}
                          onChange={(event) =>
                            handleField(entry.id, "time", event.target.value)
                          }
                          className={INPUT_CLASS}
                        />
                      </Field>
                    </div>

                    <Field id={`${entry.id}-venueName`} label="Venue name">
                      <input
                        id={`${entry.id}-venueName`}
                        type="text"
                        value={entry.venueName}
                        onChange={(event) =>
                          handleField(entry.id, "venueName", event.target.value)
                        }
                        placeholder="The Garden Lawn"
                        autoComplete="off"
                        className={INPUT_CLASS}
                      />
                    </Field>

                    <Field id={`${entry.id}-venueAddress`} label="Address">
                      <input
                        id={`${entry.id}-venueAddress`}
                        type="text"
                        value={entry.venueAddress}
                        onChange={(event) =>
                          handleField(
                            entry.id,
                            "venueAddress",
                            event.target.value,
                          )
                        }
                        placeholder="12 MG Road, Bengaluru 560001"
                        autoComplete="off"
                        className={INPUT_CLASS}
                      />
                    </Field>

                    <Field id={`${entry.id}-note`} label="Note (optional)">
                      <input
                        id={`${entry.id}-note`}
                        type="text"
                        value={entry.note ?? ""}
                        onChange={(event) =>
                          handleField(entry.id, "note", event.target.value)
                        }
                        maxLength={NOTE_LIMIT}
                        placeholder="Lunch will be served"
                        autoComplete="off"
                        className={INPUT_CLASS}
                      />
                    </Field>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      {/*
        One datalist for the whole editor rather than one per row. The ids in it
        are what every label input above points at, and six copies of the same
        eight options would be six copies to keep in step.
      */}
      <datalist id="lifafa-function-names">
        {LABEL_SUGGESTIONS.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={handleAdd}
        disabled={isFull}
        className="min-h-11 rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:border-[var(--lifafa-marigold)] disabled:opacity-50"
      >
        Add another function
      </button>

      {isFull ? (
        <p className="text-xs text-[var(--lifafa-muted)]">
          You can add up to six functions.
        </p>
      ) : null}
    </section>
  );
}
