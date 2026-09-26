"use client";

import { useId, type ReactElement } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import {
  BUTTERFLY_ASPECT,
  BUTTERFLY_STYLES,
  LEAF_ASPECT,
  LEAF_SRC,
  butterflySources,
} from "@/lib/butterflies";
import {
  FALL_PIECES,
  FLOWER_CHIPS,
  PETAL_FLOWERS,
  PETAL_STYLES,
  petalsBurst,
  petalsFall,
  type FlowerPiece,
} from "@/lib/petals";
import type {
  ButterflyStyle,
  DecorIntensity,
  DecorMotion,
  PetalFlower,
  PetalStyle,
} from "@/types/card";

const MOTIONS: readonly { id: DecorMotion; label: string }[] = [
  { id: "float", label: "Float" },
  { id: "fall", label: "Fall" },
  { id: "drift", label: "Drift" },
  { id: "roam", label: "Roam" },
  { id: "none", label: "None" },
];

const INTENSITIES: readonly { id: DecorIntensity; label: string }[] = [
  { id: "subtle", label: "Subtle" },
  { id: "normal", label: "Normal" },
  { id: "lively", label: "Lively" },
];

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
 * The butterfly on a chip, at the size a pill has room for.
 *
 * The real cut-out rather than a swatch of its colour, for the reason the
 * border chips are miniatures of the real border: "Purple" names a colour, and
 * what a host is actually choosing is an insect. "Mixed" shows all three
 * overlapping, which is the only honest picture of what it does.
 */
function ButterflyChip({ style }: { style: ButterflyStyle }): ReactElement {
  const width = style === "mixed" ? 15 : 20;

  return (
    <span aria-hidden="true" className="flex items-center -space-x-1">
      {butterflySources(style === "none" ? "red" : style).map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          width={width}
          height={Math.round(width / BUTTERFLY_ASPECT)}
          className="block max-w-none"
        />
      ))}
    </span>
  );
}

/** The leaf on its chip, as the butterflies are on theirs. */
function LeafChip(): ReactElement {
  return (
    <img
      src={LEAF_SRC}
      alt=""
      aria-hidden="true"
      width={20}
      height={Math.round(20 / LEAF_ASPECT)}
      className="block max-w-none"
    />
  );
}

/**
 * Flower pieces, overlapping, on a chip.
 *
 * The mode chips show what falls for the chosen flower — the two rose petals,
 * as they always did, until another flower is picked — and each flower chip
 * shows its own flower, the way a butterfly chip shows its insect.
 */
function PetalChip({
  pieces,
  width,
}: {
  pieces: readonly FlowerPiece[];
  width: number;
}): ReactElement {
  /* The same file twice (Mogra's stand-in bud) is one picture, not two. */
  const unique = pieces.filter(
    (piece, index) => pieces.findIndex((other) => other.src === piece.src) === index,
  );

  return (
    <span aria-hidden="true" className="flex items-center -space-x-1.5">
      {unique.map((piece) => (
        <img
          key={piece.src}
          src={piece.src}
          alt=""
          width={width}
          height={Math.round(width / piece.aspect)}
          className="block max-w-none"
        />
      ))}
    </span>
  );
}

function SubHeading({ children }: { children: string }): ReactElement {
  return (
    <h3 className="text-[0.625rem] tracking-[0.18em] text-[var(--lifafa-muted)] uppercase">
      {children}
    </h3>
  );
}

/**
 * What moves on the card and how: two sections of the Design tab.
 *
 * Motion and the floating elements were one bordered panel with a rule
 * between them. They are two sections of the tab's accordion now, because they
 * are two questions — how decoration moves, and which decoration there is —
 * and a host looking for the butterflies should find them by name.
 */
export default function MotionPicker({
  motion,
  intensity,
  butterflies,
  leaves,
  petals,
  petalFlower,
  onMotionChange,
  onIntensityChange,
  onButterfliesChange,
  onLeavesChange,
  onPetalsChange,
  onPetalFlowerChange,
  accordion,
}: {
  motion: DecorMotion;
  intensity: DecorIntensity;
  butterflies: ButterflyStyle;
  onMotionChange: (motion: DecorMotion) => void;
  onIntensityChange: (intensity: DecorIntensity) => void;
  leaves: boolean;
  petals: PetalStyle;
  onButterfliesChange: (butterflies: ButterflyStyle) => void;
  onLeavesChange: (leaves: boolean) => void;
  onPetalsChange: (petals: PetalStyle) => void;
  /** Which flower the petals are. Kept while petals are off, for when they return. */
  petalFlower: PetalFlower;
  onPetalFlowerChange: (flower: PetalFlower) => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const elementsHintId = useId();

  /*
    What "Motion style: None" is holding still, named so the host is not left
    looking for it in the preview. The shower on opening is not among them —
    it is the card opening, not the card moving.
  */
  const held =
    motion === "none" &&
    (butterflies !== "none" || leaves || petalsFall(petals));

  /* Which of the three are on, for the header. */
  const elementsOn = [
    butterflies !== "none" ? "Butterflies" : null,
    leaves ? "Leaves" : null,
    petals !== "none"
      ? `${PETAL_FLOWERS.find((option) => option.id === petalFlower)?.label ?? "Rose"} petals`
      : null,
  ].filter((name) => name !== null);
  const petalsOff = petals === "none";

  return (
    <>
      <CollapsibleSection
        title="Motion"
        summary={
          motion === "none"
            ? "None"
            : [
                MOTIONS.find((option) => option.id === motion)?.label,
                INTENSITIES.find((option) => option.id === intensity)?.label,
              ].join(" · ")
        }
        {...sectionState(accordion, "motion")}
      >
        <div className="flex flex-col gap-2">
          <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
            Motion style
          </h3>
          <div className="flex flex-wrap gap-2">
            {MOTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === motion}
                onClick={() => onMotionChange(option.id)}
                className={pillClass(option.id === motion)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
            Amount
          </h3>
          <div className="flex flex-wrap gap-2">
            {INTENSITIES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === intensity}
                onClick={() => onIntensityChange(option.id)}
                className={pillClass(option.id === intensity)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--lifafa-muted)]">
          Decoration moves as guests scroll through your card.
        </p>
      </CollapsibleSection>

      {/*
        Here and not in the border grid, because what a host is turning on
        here is movement. Every row reads the Amount in the section above
        rather than bringing a count of its own.

        Pills with the real cut-out on them, not switches and not colour
        swatches: a host is choosing a butterfly, a leaf or a petal, and the
        border grid beside this one already settled that the honest control for
        something you can look at is a picture of it.
      */}
      <CollapsibleSection
        title="Floating elements"
        summary={elementsOn.length > 0 ? elementsOn.join(", ") : "Off"}
        {...sectionState(accordion, "elements")}
      >
        <div className="flex flex-col gap-3" aria-describedby={elementsHintId}>
          <div className="flex flex-col gap-2">
            <SubHeading>Butterflies</SubHeading>
            <div className="flex flex-wrap gap-2">
              {BUTTERFLY_STYLES.map((option) => {
                const isSelected = option.id === butterflies;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onButterfliesChange(option.id)}
                    className={`flex items-center gap-1.5 ${pillClass(isSelected)}`}
                  >
                    {option.id === "none" ? null : (
                      <ButterflyChip style={option.id} />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SubHeading>Leaves</SubHeading>
            <div className="flex flex-wrap gap-2">
              {[false, true].map((isOn) => (
                <button
                  key={String(isOn)}
                  type="button"
                  aria-pressed={leaves === isOn}
                  onClick={() => onLeavesChange(isOn)}
                  className={`flex items-center gap-1.5 ${pillClass(leaves === isOn)}`}
                >
                  {isOn ? <LeafChip /> : null}
                  {isOn ? "On" : "Off"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SubHeading>Flower petals</SubHeading>
            {/*
              Which flower, above when it comes down. Disabled rather than
              hidden while petals are off, so the host can see there is a
              choice waiting — and the pick is kept for when they turn it on.
            */}
            <div className="flex flex-wrap gap-2">
              {PETAL_FLOWERS.map((option) => {
                const isSelected = option.id === petalFlower;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={petalsOff}
                    onClick={() => onPetalFlowerChange(option.id)}
                    className={`flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40 ${pillClass(isSelected)}`}
                  >
                    <PetalChip pieces={FLOWER_CHIPS[option.id]} width={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {PETAL_STYLES.map((option) => {
                const isSelected = option.id === petals;

                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onPetalsChange(option.id)}
                    className={`flex items-center gap-1.5 ${pillClass(isSelected)}`}
                  >
                    {option.id === "none" ? null : (
                      <PetalChip pieces={FALL_PIECES[petalFlower]} width={14} />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/*
            Each sentence only when it is true, so the hint describes the card in
            front of the host rather than every option at once.
          */}
          <p
            id={elementsHintId}
            className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
          >
            They stay in the margins, clear of your writing.
            {petalsBurst(petals)
              ? petalFlower === "rose"
                ? " Petals shower once as the card opens, then fall away."
                : " Flowers and petals shower once as the card opens, then fall away."
              : ""}
            {held ? " Motion style is None, so they are holding still for now." : ""}
          </p>
        </div>
      </CollapsibleSection>
    </>
  );
}
