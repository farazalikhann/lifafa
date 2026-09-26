"use client";

import { useId, type ReactElement, type ReactNode } from "react";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import ToggleSwitch from "@/components/editor/ToggleSwitch";
import {
  BUTTERFLY_ASPECT,
  BUTTERFLY_STYLES,
  LEAF_ASPECT,
  LEAF_SRC,
  butterflySources,
} from "@/lib/butterflies";
import {
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
    <h4 className="text-[0.625rem] tracking-[0.18em] text-[var(--lifafa-muted)] uppercase">
      {children}
    </h4>
  );
}

/**
 * Options that open below a row when it is switched on, and are gone when it
 * is off — not greyed out, gone.
 *
 * Height and opacity over 200ms. The height is a grid row going from 0fr to
 * 1fr, which a browser can animate where it cannot animate to `height: auto`.
 * `inert` while closed, so a keyboard cannot tab into chips nobody can see.
 * The padding inside keeps the selected chip's ring and the focus outline
 * clear of the clip.
 */
function Reveal({
  open,
  children,
}: {
  open: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <div
      inert={!open}
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="-mx-1 flex flex-col gap-3 px-1 pt-1 pb-3">{children}</div>
      </div>
    </div>
  );
}

/**
 * One floating element: its picture, its name and a switch on the right, and
 * whatever it offers below that while it is on. Butterflies, leaves and petals
 * all take this one shape, so a host who has worked one out has worked out
 * all three.
 */
function ElementRow({
  icon,
  name,
  on,
  onToggle,
  children,
}: {
  icon: ReactNode;
  name: string;
  on: boolean;
  onToggle: (on: boolean) => void;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-col">
      <div className="flex min-h-12 items-center justify-between gap-3">
        <h3 className="flex items-center gap-2.5 text-sm font-medium text-[var(--lifafa-cream)]">
          <span className="flex w-9 justify-center">{icon}</span>
          {name}
        </h3>
        <ToggleSwitch checked={on} onChange={onToggle} label={name} />
      </div>
      {children === undefined ? null : <Reveal open={on}>{children}</Reveal>}
    </div>
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
  lastButterflies,
  lastPetals,
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
  /**
   * What each switch turns back on to: the colour and the mode last chosen,
   * Mixed and Both before any were. Kept by the editor, because this panel
   * unmounts with its tab. The flower needs no such memory — it stays in the
   * card while petals are off.
   */
  lastButterflies: Exclude<ButterflyStyle, "none">;
  lastPetals: Exclude<PetalStyle, "none">;
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

  const butterfliesOn = butterflies !== "none";
  const petalsOn = petals !== "none";
  const hint = [
    petalsBurst(petals)
      ? petalFlower === "rose"
        ? "Petals shower once as the card opens, then fall away."
        : "Flowers and petals shower once as the card opens, then fall away."
      : null,
    held ? "Motion style is None, so they are holding still for now." : null,
  ].filter((sentence) => sentence !== null);

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

        A switch per element, and pills only for what the element offers once
        it is on — each with the real cut-out on it, because a host is choosing
        a butterfly or a flower, and the honest control for something you can
        look at is a picture of it.
      */}
      <CollapsibleSection
        title="Floating elements"
        summary={
          elementsOn.length === 0 ? (
            "Off"
          ) : (
            <>
              {/*
                A count on a phone, where three names would be cut off after
                the first; the names themselves from 480px up.
              */}
              <span className="truncate min-[480px]:hidden">
                {elementsOn.length} on
              </span>
              <span className="hidden truncate min-[480px]:block">
                {elementsOn.join(", ")}
              </span>
            </>
          )
        }
        {...sectionState(accordion, "elements")}
      >
        <div
          className="flex flex-col divide-y divide-[var(--lifafa-hairline)]"
          aria-describedby={hint.length > 0 ? elementsHintId : undefined}
        >
          <ElementRow
            icon={<ButterflyChip style={butterfliesOn ? butterflies : lastButterflies} />}
            name="Butterflies"
            on={butterfliesOn}
            onToggle={(on) => onButterfliesChange(on ? lastButterflies : "none")}
          >
            <div className="flex flex-wrap gap-2">
              {BUTTERFLY_STYLES.filter((option) => option.id !== "none").map(
                (option) => {
                  const isSelected = option.id === butterflies;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onButterfliesChange(option.id)}
                      className={`flex items-center gap-1.5 ${pillClass(isSelected)}`}
                    >
                      <ButterflyChip style={option.id} />
                      {option.label}
                    </button>
                  );
                },
              )}
            </div>
          </ElementRow>

          <ElementRow
            icon={<LeafChip />}
            name="Leaves"
            on={leaves}
            onToggle={onLeavesChange}
          />

          <ElementRow
            icon={<PetalChip pieces={FLOWER_CHIPS[petalFlower]} width={16} />}
            name="Flower petals"
            on={petalsOn}
            onToggle={(on) => onPetalsChange(on ? lastPetals : "none")}
          >
            <div className="flex flex-col gap-2">
              <SubHeading>Flower</SubHeading>
              <div className="flex flex-wrap gap-2">
                {PETAL_FLOWERS.map((option) => {
                  const isSelected = option.id === petalFlower;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onPetalFlowerChange(option.id)}
                      className={`flex items-center gap-1.5 ${pillClass(isSelected)}`}
                    >
                      <PetalChip pieces={FLOWER_CHIPS[option.id]} width={16} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/*
              Words only: the flower is chosen just above, and a picture of it
              on every one of these would say the same thing three more times.
            */}
            <div className="flex flex-col gap-2">
              <SubHeading>When</SubHeading>
              <div className="flex flex-wrap gap-2">
                {PETAL_STYLES.filter((option) => option.id !== "none").map(
                  (option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={option.id === petals}
                      onClick={() => onPetalsChange(option.id)}
                      className={pillClass(option.id === petals)}
                    >
                      {option.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          </ElementRow>
        </div>

        {/*
          Each sentence only when it is true, so the hint describes the card in
          front of the host rather than every option at once.
        */}
        {hint.length > 0 ? (
          <p
            id={elementsHintId}
            className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
          >
            {hint.join(" ")}
          </p>
        ) : null}
      </CollapsibleSection>
    </>
  );
}
