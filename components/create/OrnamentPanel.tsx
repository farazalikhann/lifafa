"use client";

import type { ReactElement } from "react";
import type { PackBlessing, TraditionPack } from "@/lib/traditionPacks";
import type { AnyOrnamentId, OrnamentConfig } from "@/types/ornament";

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
 * A row in the greeting or blessing list.
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
 * The line of script, or the note that stands in for it.
 *
 * A content file can ship an entry with its script blank, so this is a normal
 * state rather than an error one — the host is told the text is coming instead
 * of being shown a row that looks broken. The opt-out rows are exempt: "No
 * greeting" is not waiting on anything, which is what `pack.isOptOut` is asked.
 *
 * The pack's own ScriptRun draws the text. That is deliberately not a font name
 * passed down: Arabic sets dir="rtl" and Devanagari must set no dir at all and
 * sits inside a span tagged hi, and neither rule survives being reassembled
 * here from parts.
 */
function ScriptLine({
  entry,
  pack,
}: {
  entry: PackBlessing;
  pack: TraditionPack;
}): ReactElement | null {
  const { ScriptRun } = pack;

  if (entry.script.length === 0) {
    return pack.isOptOut(entry.id) ? null : (
      <MutedNote>{pack.pendingLabel}</MutedNote>
    );
  }

  return (
    <ScriptRun
      className={`w-full wrap-anywhere text-[var(--lifafa-cream)] ${pack.panelScriptClass}`}
    >
      {entry.script}
    </ScriptRun>
  );
}

/** One single-select list — the greeting list and the blessing list are the same thing. */
function BlessingList({
  rows,
  selectedId,
  pack,
  onSelect,
}: {
  rows: readonly PackBlessing[];
  selectedId: string | null;
  pack: TraditionPack;
  onSelect: (row: PackBlessing) => void;
}): ReactElement {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <OptionRow
          key={row.id}
          isSelected={selectedId === row.id}
          onSelect={() => onSelect(row)}
        >
          <>
            <span className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
              {row.label}
            </span>

            {row.occasionNote.length > 0 ? (
              <span className="text-[0.6875rem] tracking-[0.14em] text-[var(--lifafa-muted)] uppercase">
                {row.occasionNote}
              </span>
            ) : null}

            <ScriptLine entry={row} pack={pack} />

            {row.transliteration.length > 0 ? (
              <span className="text-xs text-[var(--lifafa-muted)] italic">
                {row.transliteration}
              </span>
            ) : null}

            {row.translation.length > 0 ? (
              <span className="text-xs text-[var(--lifafa-muted)]">
                {row.translation}
              </span>
            ) : null}
          </>
        </OptionRow>
      ))}
    </ul>
  );
}

/**
 * Ornaments, greeting and blessing for one tradition's card.
 *
 * ONE PANEL FOR EVERY TRADITION. The pack is the parameter — its ornaments, its
 * two lists, its script and its two muted notes — and nothing in this file
 * names a tradition or a script. A pack with no entry in lib/traditionPacks.tsx
 * never reaches here, because the caller only renders this when the lookup
 * returns one.
 *
 * The caller also owns resetting `config` when the host moves to a different
 * tradition, so no selection from one pack can survive into the next.
 */
export default function OrnamentPanel({
  pack,
  config,
  onChange,
}: {
  pack: TraditionPack;
  config: OrnamentConfig;
  onChange: (next: OrnamentConfig) => void;
}): ReactElement {
  const toggleOrnament = (id: AnyOrnamentId): void => {
    const isOn = config.enabledOrnaments.includes(id);

    onChange({
      ...config,
      enabledOrnaments: isOn
        ? config.enabledOrnaments.filter((current) => current !== id)
        : [...config.enabledOrnaments, id],
    });
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
          {pack.ornaments.map(({ id, label, Component, chipSize }) => {
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
                  `chipSize` — see the note on the pack's entry type.
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

        <MutedNote>{pack.ornamentsNote}</MutedNote>
      </div>

      {/* 2 — Greeting */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>Greeting</GroupHeading>

        <BlessingList
          rows={pack.greetings}
          selectedId={config.greetingId}
          pack={pack}
          onSelect={(row) => onChange({ ...config, greetingId: row.id })}
        />
      </div>

      {/* 3 — Dua, or shlok, or whatever this tradition calls the slot */}
      <div className="flex flex-col gap-2.5">
        <GroupHeading>{pack.blessingLabel}</GroupHeading>

        <BlessingList
          rows={pack.blessings}
          selectedId={config.blessingId}
          pack={pack}
          onSelect={(row) => onChange({ ...config, blessingId: row.id })}
        />

        <MutedNote>{pack.blessingNote}</MutedNote>
      </div>
    </section>
  );
}
