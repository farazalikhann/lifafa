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

const HOST_HINT = "Used only when the two name fields are empty.";

/** The joining words offered as one tap. Anything else is a custom word. */
const JOINER_PRESETS: readonly string[] = ["weds", "&", "and"];

/**
 * Short by design. This word is set at hero size between two names, and the
 * card has one narrow column to draw all three in — a phrase long enough to
 * wrap would stop reading as a joint and start reading as a sentence.
 */
const CUSTOM_JOINER_LIMIT = 12;

function pillClass(isSelected: boolean): string {
  return [
    "min-h-11 rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
    isSelected
      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
  ].join(" ");
}

/**
 * The word between the two names.
 *
 * Holds no state of its own: "is this custom?" is read back out of the draft —
 * any word that is not one of the presets is a custom one — so there is no
 * second source of truth to fall out of step with what the card is showing.
 * The Custom pill writes an empty word, which is both unrecognised (so the
 * input stays open) and blank (so the card shows its own fallback until the
 * host types something).
 */
function JoinerControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}): ReactElement {
  const isCustom = !JOINER_PRESETS.includes(value);

  return (
    <div
      role="group"
      aria-labelledby="joinerWord-label"
      className="flex flex-col items-center gap-2"
    >
      <span
        id="joinerWord-label"
        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        Joining word
      </span>

      <div className="flex flex-wrap justify-center gap-2">
        {JOINER_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={value === preset}
            onClick={() => onChange(preset)}
            className={pillClass(value === preset)}
          >
            {preset}
          </button>
        ))}

        <button
          type="button"
          aria-pressed={isCustom}
          /* Already custom: leave the typed word alone rather than wiping it. */
          onClick={() => {
            if (!isCustom) {
              onChange("");
            }
          }}
          className={pillClass(isCustom)}
        >
          Custom
        </button>
      </div>

      {isCustom ? (
        <input
          id="joinerWord"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={CUSTOM_JOINER_LIMIT}
          placeholder="ties with"
          aria-label="Custom joining word"
          autoComplete="off"
          /* Asked for by tapping Custom, so opening the keyboard is expected. */
          autoFocus
          className={`${INPUT_CLASS} max-w-[11rem] text-center`}
        />
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
        {/*
          The two party fields and the joining word are one thought — they
          build a single line of the card between them — so they sit under
          their own heading rather than loose among the other fields.
        */}
        <div
          className="flex flex-col gap-3"
          role="group"
          aria-labelledby="cardNames-heading"
        >
          <h3
            id="cardNames-heading"
            className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase"
          >
            Names on the card
          </h3>

          {/*
            One grid, two layouts. Stacked below 640px in reading order — name,
            joining word, name — which is the order the card sets them in. At
            640px and up the two names take a column each on the first row and
            the joining word is pulled under both, centred, so the control sits
            where its result will.

            Placement is by explicit row and column rather than by reordering,
            so the DOM keeps the reading order the mobile layout needs and the
            tab order stays first name → joiner → second name on both.
          */}
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4">
            <div className="sm:col-start-1 sm:row-start-1">
              <Field id="partyOneName" label="First name">
                <input
                  id="partyOneName"
                  type="text"
                  value={draft.partyOneName}
                  onChange={(event) =>
                    onChange("partyOneName", event.target.value)
                  }
                  placeholder="Aarav"
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>

            <div className="sm:col-span-2 sm:row-start-2">
              <JoinerControl
                value={draft.joinerWord}
                onChange={(joinerWord) => onChange("joinerWord", joinerWord)}
              />
            </div>

            <div className="sm:col-start-2 sm:row-start-1">
              <Field id="partyTwoName" label="Second name">
                <input
                  id="partyTwoName"
                  type="text"
                  value={draft.partyTwoName}
                  onChange={(event) =>
                    onChange("partyTwoName", event.target.value)
                  }
                  placeholder="Meera"
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
              </Field>
            </div>
          </div>
        </div>

        <Field
          id="hostNames"
          label="Or write one line yourself"
          hint={HOST_HINT}
        >
          <input
            id="hostNames"
            type="text"
            value={draft.hostNames}
            onChange={(event) => onChange("hostNames", event.target.value)}
            placeholder="Aarav and Meera"
            autoComplete="off"
            aria-describedby="hostNames-hint"
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
