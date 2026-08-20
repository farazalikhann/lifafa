"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { CARD_SECTIONS } from "@/lib/cardSections";
import type { CardBlock, CustomSection } from "@/types/customSection";

const MAX_CUSTOM = 4;
const HEADING_LIMIT = 40;
const BODY_LIMIT = 300;

/** The cover is the guest's first impression; it always stays. */
const LOCKED_SECTION_ID = "cover";

const TAP_TARGET =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--lifafa-hairline)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-30";

const INPUT_CLASS = [
  "w-full min-h-12 rounded-xl px-4 py-2.5",
  "border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]",
  "text-[0.9375rem] text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/60",
  "focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none",
].join(" ");

function Arrow({ direction }: { direction: "up" | "down" }): ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      {direction === "up" ? (
        <path d="M10 16 V5 M5 10 L10 4.5 L15 10" />
      ) : (
        <path d="M10 4 V15 M5 10 L10 15.5 L15 10" />
      )}
    </svg>
  );
}

function RemoveIcon(): ReactElement {
  return (
    <svg
      viewBox="0 0 20 20"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M6 6 L14 14 M14 6 L6 14" />
    </svg>
  );
}

function blockLabel(block: CardBlock): string {
  if (block.kind === "builtin") {
    return CARD_SECTIONS[block.id].label;
  }

  const heading = block.section.heading.trim();
  return heading.length > 0 ? heading : "Untitled section";
}

function blockKey(block: CardBlock): string {
  return block.kind === "custom" ? block.section.id : block.id;
}

export default function SectionManager({
  blocks,
  onBlocksChange,
}: {
  blocks: readonly CardBlock[];
  onBlocksChange: (blocks: readonly CardBlock[]) => void;
}): ReactElement {
  /*
    Ids come from a ref counter, not Math.random or Date.now: those differ
    between server and client and would trip a hydration mismatch, and a
    changing id would also remount the editor mid-typing.
  */
  const nextCustomId = useRef<number>(1);
  const editorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [scrollToId, setScrollToId] = useState<string | null>(null);

  /* The new editor only exists after the parent re-renders, so scroll here. */
  useEffect(() => {
    if (scrollToId === null) {
      return;
    }

    editorRefs.current
      .get(scrollToId)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    setScrollToId(null);
  }, [scrollToId]);

  const customCount = blocks.filter((block) => block.kind === "custom").length;
  const atCap = customCount >= MAX_CUSTOM;

  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;

    if (target < 0 || target >= blocks.length) {
      return;
    }

    const next = [...blocks];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onBlocksChange(next);
  };

  const toggleEnabled = (index: number): void => {
    onBlocksChange(
      blocks.map((block, i) =>
        i === index && block.kind === "builtin"
          ? { ...block, enabled: !block.enabled }
          : block,
      ),
    );
  };

  const addCustom = (): void => {
    if (atCap) {
      return;
    }

    const id = `custom-${nextCustomId.current}`;
    nextCustomId.current += 1;

    const section: CustomSection = { id, heading: "", body: "" };
    onBlocksChange([...blocks, { kind: "custom", section }]);
    setScrollToId(id);
  };

  const removeCustom = (id: string): void => {
    editorRefs.current.delete(id);
    onBlocksChange(
      blocks.filter(
        (block) => block.kind !== "custom" || block.section.id !== id,
      ),
    );
  };

  const updateCustom = (
    id: string,
    patch: Partial<Pick<CustomSection, "heading" | "body">>,
  ): void => {
    onBlocksChange(
      blocks.map((block) =>
        block.kind === "custom" && block.section.id === id
          ? { ...block, section: { ...block.section, ...patch } }
          : block,
      ),
    );
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase">
        Card sections
      </h2>

      <ul className="flex flex-col gap-2.5">
        {blocks.map((block, index) => {
          const key = blockKey(block);
          const label = blockLabel(block);
          const isLocked =
            block.kind === "builtin" && block.id === LOCKED_SECTION_ID;
          const isEnabled = block.kind === "custom" || block.enabled;

          return (
            <li
              key={key}
              className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-3.5 py-3"
            >
              {/* Stacks below sm so the row never crowds at 360px. */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[0.9375rem] font-medium ${
                      isEnabled
                        ? "text-[var(--lifafa-cream)]"
                        : "text-[var(--lifafa-muted)] line-through"
                    }`}
                  >
                    {label}
                  </p>
                  {isLocked ? (
                    <p className="mt-0.5 text-xs text-[var(--lifafa-muted)]">
                      Always shown
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5">
                  {block.kind === "builtin" ? (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={block.enabled}
                      aria-label={`${block.enabled ? "Hide" : "Show"} ${label} section`}
                      disabled={isLocked}
                      onClick={() => toggleEnabled(index)}
                      className="flex h-11 w-12 shrink-0 items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] disabled:opacity-40"
                    >
                      <span
                        className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors duration-150 ${
                          block.enabled
                            ? "bg-[var(--lifafa-marigold)]"
                            : "bg-[var(--lifafa-hairline)]"
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full bg-[var(--lifafa-ink)] transition-transform duration-150 ${
                            block.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    aria-label={`Move ${label} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className={`${TAP_TARGET} text-[var(--lifafa-cream)] enabled:hover:border-[var(--lifafa-marigold)]`}
                  >
                    <Arrow direction="up" />
                  </button>

                  <button
                    type="button"
                    aria-label={`Move ${label} down`}
                    disabled={index === blocks.length - 1}
                    onClick={() => move(index, 1)}
                    className={`${TAP_TARGET} text-[var(--lifafa-cream)] enabled:hover:border-[var(--lifafa-marigold)]`}
                  >
                    <Arrow direction="down" />
                  </button>

                  {block.kind === "custom" ? (
                    <button
                      type="button"
                      aria-label={`Remove ${label}`}
                      onClick={() => removeCustom(block.section.id)}
                      className={`${TAP_TARGET} text-[var(--lifafa-rose)] hover:border-[var(--lifafa-rose)]`}
                    >
                      <RemoveIcon />
                    </button>
                  ) : null}
                </div>
              </div>

              {block.kind === "custom" ? (
                <div
                  ref={(node) => {
                    if (node === null) {
                      editorRefs.current.delete(block.section.id);
                    } else {
                      editorRefs.current.set(block.section.id, node);
                    }
                  }}
                  className="mt-3.5 flex flex-col gap-3 border-t border-[var(--lifafa-hairline)] pt-3.5"
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor={`${block.section.id}-heading`}
                      className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
                    >
                      Section heading
                    </label>
                    <input
                      id={`${block.section.id}-heading`}
                      type="text"
                      maxLength={HEADING_LIMIT}
                      value={block.section.heading}
                      onChange={(event) =>
                        updateCustom(block.section.id, {
                          heading: event.target.value,
                        })
                      }
                      placeholder="Dress code"
                      autoComplete="off"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <label
                        htmlFor={`${block.section.id}-body`}
                        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
                      >
                        Section text
                      </label>
                      <span className="text-xs tabular-nums text-[var(--lifafa-muted)]">
                        {block.section.body.length}/{BODY_LIMIT}
                      </span>
                    </div>
                    <textarea
                      id={`${block.section.id}-body`}
                      rows={3}
                      maxLength={BODY_LIMIT}
                      value={block.section.body}
                      onChange={(event) =>
                        updateCustom(block.section.id, {
                          body: event.target.value,
                        })
                      }
                      placeholder="Traditional Indian wear, please."
                      className={`${INPUT_CLASS} resize-y`}
                    />
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={atCap}
          onClick={addCustom}
          className="min-h-11 rounded-xl border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] enabled:hover:border-[var(--lifafa-marigold)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Add your own section
        </button>

        {atCap ? (
          <p className="text-xs text-[var(--lifafa-muted)]">
            You can add up to four extra sections.
          </p>
        ) : null}
      </div>
    </section>
  );
}
