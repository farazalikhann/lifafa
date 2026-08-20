import type { ReactElement, ReactNode } from "react";
import type { DraftChangeHandler, EventDraft } from "@/types/event";

const MESSAGE_LIMIT = 200;

const INPUT_CLASS = [
  "w-full min-h-11 rounded-xl px-4 py-2.5",
  "border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]",
  "text-[0.9375rem] text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/70",
  "transition-colors duration-150 [color-scheme:dark]",
  "focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none",
].join(" ");

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        {label}
      </h2>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  children,
  hint,
}: {
  id: string;
  label: string;
  children: ReactNode;
  hint?: string;
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
      {hint !== undefined ? (
        <p
          id={`${id}-hint`}
          className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const DATE_HINT =
  "Guests will see this in their own time zone as the local event time.";

export default function EventForm({
  draft,
  onChange,
}: {
  draft: EventDraft;
  onChange: DraftChangeHandler;
}): ReactElement {
  const remaining = MESSAGE_LIMIT - draft.message.length;

  return (
    /* Deliberately a div, not a <form>: nothing submits in this step. */
    <div className="flex flex-col gap-9">
      <Section label="Who">
        <Field id="hostNames" label="Host names">
          <input
            id="hostNames"
            type="text"
            value={draft.hostNames}
            onChange={(event) => onChange("hostNames", event.target.value)}
            placeholder="Aarav and Meera"
            autoComplete="off"
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      <Section label="What">
        <Field id="eventTitle" label="Event title">
          <input
            id="eventTitle"
            type="text"
            value={draft.eventTitle}
            onChange={(event) => onChange("eventTitle", event.target.value)}
            placeholder="Wedding Reception"
            autoComplete="off"
            className={INPUT_CLASS}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="eventDate" label="Date" hint={DATE_HINT}>
            <input
              id="eventDate"
              type="date"
              value={draft.eventDate}
              onChange={(event) => onChange("eventDate", event.target.value)}
              aria-describedby="eventDate-hint"
              className={INPUT_CLASS}
            />
          </Field>

          <Field id="eventTime" label="Start time">
            <input
              id="eventTime"
              type="time"
              value={draft.eventTime}
              onChange={(event) => onChange("eventTime", event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>
      </Section>

      <Section label="Where">
        <Field id="venueName" label="Venue name">
          <input
            id="venueName"
            type="text"
            value={draft.venueName}
            onChange={(event) => onChange("venueName", event.target.value)}
            placeholder="The Grand Ballroom"
            autoComplete="off"
            className={INPUT_CLASS}
          />
        </Field>

        <Field id="venueAddress" label="Address">
          <input
            id="venueAddress"
            type="text"
            value={draft.venueAddress}
            onChange={(event) => onChange("venueAddress", event.target.value)}
            placeholder="12 MG Road, Bengaluru 560001"
            autoComplete="off"
            className={INPUT_CLASS}
          />
        </Field>
      </Section>

      <Section label="Message">
        <Field id="message" label="A short note for your guests">
          <textarea
            id="message"
            rows={3}
            maxLength={MESSAGE_LIMIT}
            value={draft.message}
            onChange={(event) => onChange("message", event.target.value)}
            placeholder="We would love to have you with us."
            className={`${INPUT_CLASS} resize-y`}
          />
          <p
            aria-live="polite"
            className={[
              "self-end text-xs tabular-nums",
              remaining <= 20
                ? "text-[var(--lifafa-marigold)]"
                : "text-[var(--lifafa-muted)]",
            ].join(" ")}
          >
            {draft.message.length}/{MESSAGE_LIMIT}
          </p>
        </Field>
      </Section>
    </div>
  );
}
