"use client";

import type { ReactElement } from "react";
import {
  DUAS,
  GREETINGS,
  isOptOut,
  type Dua,
  type Greeting,
} from "@/lib/arabicContent";
import { MUSLIM_ORNAMENTS } from "@/lib/ornaments/muslim";
import type { OrnamentConfig, OrnamentId } from "@/types/ornament";

/**
 * What Arabic script is set in.
 *
 * The same variable the card resolves — declared once in globals.css — so the
 * row the host picks and the line that lands on the card are the same face.
 */
const ARABIC_FONT_STACK = "var(--lifafa-arabic)";

function GroupHeading({ children }: { children: string }): ReactElement {
  return (
    <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
      {children}
    </h3>
  );
}

function MutedNote({ children }: { children: string }): ReactElement {
  return <p className="text-xs text-[var(--lifafa-muted)]">{children}</p>;
}

/**
 * A row in the greeting or dua list.
 *
 * Both lists are single-select and both are drawn the same way, so the shell —
 * the ring, the pressed state, the tap target — lives here once and each list
 * supplies only what goes inside it.
 */
function OptionRow({
  isSelected,
  onSelect,
  children,
}: {
  isSelected: boolean;
  onSelect: () => void;
  children: ReactElement;
}): ReactElement {
  return (
    <li>
      <button
        type="button"
        aria-pressed={isSelected}
        onClick={onSelect}
        className={[
          "flex min-h-14 w-full flex-col items-start gap-1 rounded-xl border px-3.5 py-3 text-left transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
          isSelected
            ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
            : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60",
        ].join(" ")}
      >
        {children}
      </button>
    </li>
  );
}

/**
 * The Arabic line, or the note that stands in for it.
 *
 * lib/arabicContent.ts ships every Arabic string empty on purpose, so this is
 * the normal state today rather than an error one — the host is told the text
 * is coming instead of being shown a row that looks broken. The opt-out rows
 * are exempt: "No greeting" is not waiting on anything.
 */
function ArabicLine({
  arabic,
  optOut,
  pendingLabel,
}: {
  arabic: string;
  optOut: boolean;
  pendingLabel: string;
}): ReactElement | null {
  if (arabic.length === 0) {
    return optOut ? null : <MutedNote>{pendingLabel}</MutedNote>;
  }

  return (
    <p
      dir="rtl"
      lang="ar"
      className="w-full text-[1.0625rem] leading-[1.9] wrap-anywhere text-[var(--lifafa-cream)]"
      style={{ fontFamily: ARABIC_FONT_STACK }}
    >
      {arabic}
    </p>
  );
}

/**
 * Ornaments, greeting and dua for a Muslim card.
 *
 * Rendered only when the tradition is "muslim" — the caller owns that gate, and
 * also owns resetting `config` back to its defaults when the host moves to a
 * different tradition, so nothing from this pack can survive on a card that is
 * no longer a Muslim one.
 */
export default function OrnamentPanel({
  config,
  onChange,
}: {
  config: OrnamentConfig;
  onChange: (next: OrnamentConfig) => void;
}): ReactElement {
  const toggleOrnament = (id: OrnamentId): void => {
    const isOn = config.enabledOrnaments.includes(id);

    onChange({
      ...config,
      enabledOrnaments: isOn
        ? config.enabledOrnaments.filter((current) => current !== id)
        : [...config.enabledOrnaments, id],
    });
  };

  const selectGreeting = (greeting: Greeting): void => {
    onChange({ ...config, greetingId: greeting.id });
  };

  const selectDua = (dua: Dua): void => {
    onChange({ ...config, duaId: dua.id });
  };

  return (
    <section className="mt-2 flex flex-col gap-5 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <h3 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        Ornaments
      </h3>

      {/* 1 — Add to your card */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Add to your card</GroupHeading>

        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {MUSLIM_ORNAMENTS.map(({ id, label, Component, chipSize }) => {
            const isSelected = config.enabledOrnaments.includes(id);

            return (
              <button
                key={id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggleOrnament(id)}
                className={[
                  "flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                  isSelected
                    ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                    : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60",
                ].join(" ")}
              >
                {/*
                  Fixed height box with the drawing centred in it, so a 0.55:1
                  lantern and a 6.7:1 vine sit on the same baseline and all
                  seven chips come out one size. Each ornament brings its own
                  `chipSize` — see the note on OrnamentEntry.
                */}
                <span
                  aria-hidden="true"
                  className={`flex h-10 items-center justify-center ${
                    isSelected
                      ? "text-[var(--lifafa-marigold)]"
                      : "text-[var(--lifafa-muted)]"
                  }`}
                >
                  <Component size={chipSize} instanceId={`chip-${id}`} />
                </span>

                <span className="text-center text-[0.75rem] font-medium text-[var(--lifafa-cream)]">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        <MutedNote>
          Lanterns, moons and lights hang from the top of your card.
        </MutedNote>
      </div>

      {/* 2 — Greeting */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Greeting</GroupHeading>

        <ul className="flex flex-col gap-2">
          {GREETINGS.map((greeting) => {
            const optOut = isOptOut(greeting.id);

            return (
              <OptionRow
                key={greeting.id}
                isSelected={config.greetingId === greeting.id}
                onSelect={() => selectGreeting(greeting)}
              >
                <>
                  <span className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
                    {greeting.label}
                  </span>

                  <ArabicLine
                    arabic={greeting.arabic}
                    optOut={optOut}
                    pendingLabel="Arabic text pending"
                  />

                  {greeting.transliteration.length > 0 ? (
                    <span className="text-xs text-[var(--lifafa-muted)] italic">
                      {greeting.transliteration}
                    </span>
                  ) : null}

                  {greeting.translation.length > 0 ? (
                    <span className="text-xs text-[var(--lifafa-muted)]">
                      {greeting.translation}
                    </span>
                  ) : null}
                </>
              </OptionRow>
            );
          })}
        </ul>
      </div>

      {/* 3 — Dua */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Dua</GroupHeading>

        <ul className="flex flex-col gap-2">
          {DUAS.map((dua) => {
            const optOut = isOptOut(dua.id);

            return (
              <OptionRow
                key={dua.id}
                isSelected={config.duaId === dua.id}
                onSelect={() => selectDua(dua)}
              >
                <>
                  <span className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
                    {dua.label}
                  </span>

                  {dua.occasionNote.length > 0 ? (
                    <span className="text-[0.6875rem] tracking-[0.14em] text-[var(--lifafa-muted)] uppercase">
                      {dua.occasionNote}
                    </span>
                  ) : null}

                  <ArabicLine
                    arabic={dua.arabic}
                    optOut={optOut}
                    pendingLabel="Text pending"
                  />

                  {dua.translation.length > 0 ? (
                    <span className="text-xs text-[var(--lifafa-muted)]">
                      {dua.translation}
                    </span>
                  ) : null}
                </>
              </OptionRow>
            );
          })}
        </ul>

        <MutedNote>The dua appears at the top of your card.</MutedNote>
      </div>
    </section>
  );
}
