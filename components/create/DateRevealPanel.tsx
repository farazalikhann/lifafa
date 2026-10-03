"use client";

import type { ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { scrollArt, type ScrollVariant } from "@/lib/royalScroll";
import type { DateReveal } from "@/types/card";

const REVEALS: readonly { id: DateReveal; label: string; hint: string }[] = [
  { id: "scroll", label: "Royal scroll", hint: "Unrolls as the guest reaches the date." },
  { id: "scratch", label: "Scratch to reveal", hint: "The guest scratches gold foil off the date." },
  { id: "simple", label: "Simple", hint: "The date is simply there." },
];

/** A scroll's two rollers and what is between them, at thumbnail size: the picture of the whole scroll. */
function ScrollPreview({ variant }: { variant: ScrollVariant }): ReactElement {
  return (
    <img
      src={scrollArt(variant).full}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className="h-full w-auto select-none"
    />
  );
}

/** A gold foil panel with a stroke scratched through it. */
function ScratchPreview(): ReactElement {
  return (
    <svg viewBox="0 0 48 60" aria-hidden="true" focusable="false" className="h-full w-auto">
      <rect x="4" y="14" width="40" height="32" rx="6" fill="#C9A14A" />
      <rect x="4" y="14" width="40" height="32" rx="6" fill="none" stroke="#F1D38A" strokeWidth="1" />
      <path
        d="M11 38 C17 24 21 40 26 28 S35 30 38 21"
        fill="none"
        stroke="#3A2A12"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/** The date as it is set with nothing over it: a month, a numeral, a rule. */
function SimplePreview(): ReactElement {
  return (
    <svg viewBox="0 0 48 60" aria-hidden="true" focusable="false" className="h-full w-auto">
      <rect x="15" y="12" width="18" height="2.5" rx="1.25" fill="currentColor" opacity="0.5" />
      <text
        x="24"
        y="40"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fontFamily="Georgia, serif"
        fill="currentColor"
      >
        14
      </text>
      <rect x="18" y="47" width="12" height="1.5" rx="0.75" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

/**
 * How the date arrives on its own screen: on the royal scroll, behind a
 * scratch panel, or simply there.
 *
 * ONE OF THE THREE, AND ONLY EVER ONE. The scroll and the scratch panel are
 * both a way of making the guest wait a moment for the date, and a card that
 * did both would be making them wait twice for one thing. So choosing either
 * takes the other off the date; the editor does that in the handler this
 * calls, and the card will not draw both even if a saved one asks for it
 * (lib/royalScroll.ts).
 *
 * The scratch panel's own section, "Reveal effect", is still where a host
 * hides the venue or the countdown, and picks the panel's frame. Hiding the
 * date there and choosing Scratch here are the same act.
 */
export default function DateRevealPanel({
  dateReveal,
  scrollVariant,
  onDateRevealChange,
  accordion,
}: {
  /** What the card does now, resolved: never undefined. */
  dateReveal: DateReveal;
  /** The scroll this card would get, so the thumbnail is the one the host will see. */
  scrollVariant: ScrollVariant;
  onDateRevealChange: (reveal: DateReveal) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const current = REVEALS.find((option) => option.id === dateReveal);

  return (
    <CollapsibleSection
      title="Date reveal"
      summary={current?.label}
      {...sectionState(accordion, "date-reveal")}
    >
      <div className="grid grid-cols-3 gap-2">
        {REVEALS.map((option) => {
          const isSelected = option.id === dateReveal;

          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onDateRevealChange(option.id)}
              className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
            >
              <span
                className={[
                  "flex h-24 w-full items-center justify-center rounded-lg border bg-[var(--lifafa-ink-raised)] p-2 text-[var(--lifafa-cream)] transition-shadow duration-150",
                  isSelected
                    ? "border-transparent ring-2 ring-[var(--lifafa-marigold)] ring-offset-2 ring-offset-[var(--lifafa-ink)]"
                    : "border-[var(--lifafa-hairline)]",
                ].join(" ")}
              >
                {option.id === "scroll" ? (
                  <ScrollPreview variant={scrollVariant} />
                ) : option.id === "scratch" ? (
                  <ScratchPreview />
                ) : (
                  <SimplePreview />
                )}
              </span>
              <span
                className={`text-center text-[0.6875rem] leading-tight ${
                  isSelected ? "text-[var(--lifafa-cream)]" : "text-[var(--lifafa-muted)]"
                }`}
              >
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--lifafa-muted)]">{current?.hint}</p>
    </CollapsibleSection>
  );
}
