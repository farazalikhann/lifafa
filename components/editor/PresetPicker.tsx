"use client";

import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { BorderPreview, FlowerPreview } from "@/components/create/StylePanel";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { BUTTERFLY_ASPECT, butterflySources } from "@/lib/butterflies";
import { flowerChipScale, isPhotoBorder } from "@/lib/flowerFrame";
import { fontFamilyOf, getFontPair } from "@/lib/fontPairs";
import { defaultDesign, type DesignState } from "@/lib/designDefaults";
import { getPalette } from "@/lib/palettes";
import { PETALS } from "@/lib/petals";
import {
  PRESET_GROUPS,
  applyPreset,
  matchingPreset,
  sameDesign,
  type Preset,
} from "@/lib/presets";
import { getTraditionPack } from "@/lib/traditionPacks";
import type { OccasionId } from "@/types/occasion";

/** How many of a preset's shapes its miniature has room to show. */
const HINT_LIMIT = 3;

/**
 * How much larger than a border chip a photo frame is drawn here.
 *
 * The chip's scale gives the frame 32px of band on a 44px chip. A miniature is
 * more than twice that tall, and at the chip's scale the slim frames shrank to
 * a few specks in the corners — Noir all but vanished on the navy.
 */
const FRAME_ZOOM = 1.5;

/**
 * A preset's card in miniature: its palette, its border, its type and a few of
 * its ornaments.
 *
 * Built from what the preset would actually do to the card — `applyPreset`
 * over the current design — rather than from the preset's settings read
 * directly, so the miniature and the card can never tell two stories. The
 * border is the border grid's own chip drawing, and the ornaments are the
 * pack's own components, drawn in the card's accent the way the card draws
 * them. Nothing here is a new picture.
 */
function PresetMiniature({
  design,
  presetId,
}: {
  design: DesignState;
  /** Keeps the drawings' own svg ids apart across the four cards. */
  presetId: string;
}): ReactElement {
  const palette = getPalette(design.style.paletteId);
  const accent = design.style.accentOverride ?? palette.accent;
  const face = getFontPair(design.style.fontPairId);
  const pack = getTraditionPack(design.traditionId);

  /* The shapes that are not the divider, which gets a line of its own below. */
  const hints =
    pack === null
      ? []
      : design.ornamentConfig.enabledOrnaments
          .filter(
            (id) => id !== pack.dividerId && !pack.calligraphyIds.includes(id),
          )
          .map((id) => pack.findOrnament(id))
          .filter((entry) => entry !== null)
          .slice(0, HINT_LIMIT);

  const divider =
    pack !== null &&
    pack.dividerId !== null &&
    design.ornamentConfig.enabledOrnaments.includes(pack.dividerId)
      ? pack.findOrnament(pack.dividerId)
      : null;

  return (
    <span
      aria-hidden="true"
      className="relative block aspect-[16/11] w-full overflow-hidden rounded-lg border border-[var(--lifafa-hairline)]"
      style={{ backgroundColor: palette.background, color: accent }}
    >
      {/*
        The border grid's chip drawing, stretched to the whole miniature. Its
        pen is set for a 44px chip, so at this size the strokes are held to one
        screen pixel rather than scaled up into a slab.
      */}
      <span className="absolute inset-0 [&_*]:[vector-effect:non-scaling-stroke]">
        {design.borderStyle === "none" ? null : isPhotoBorder(
            design.borderStyle,
          ) ? (
          <FlowerPreview
            style={design.borderStyle}
            className="block h-full w-full"
            scale={flowerChipScale(design.borderStyle) * FRAME_ZOOM}
          />
        ) : (
          <BorderPreview id={design.borderStyle} className="h-full w-full" />
        )}
      </span>

      {/* What hangs or sits on the card, strung along the top edge. */}
      {hints.length > 0 ? (
        <span className="absolute inset-x-0 top-[17%] flex items-start justify-center gap-2.5">
          {hints.map(({ id, Component, chipSize }) => (
            <Component
              key={id}
              size={Math.round(chipSize * 0.5)}
              instanceId={`preset-${presetId}-${id}`}
            />
          ))}
        </span>
      ) : null}

      <span className="absolute inset-x-0 top-[52%] flex flex-col items-center gap-1">
        <span
          className="text-[1.125rem] leading-none"
          style={{
            color: palette.textPrimary,
            fontFamily: fontFamilyOf(face.headingVar, face.headingFallback),
            fontWeight: face.headingWeight,
          }}
        >
          Aa
        </span>

        {divider !== null ? (
          <divider.Component
            size={36}
            instanceId={`preset-${presetId}-divider`}
          />
        ) : (
          <span
            className="h-px w-6"
            style={{ backgroundColor: accent }}
          />
        )}
      </span>

      {/* The floating elements, one of each in the lower corners. */}
      {design.petals !== "none" ? (
        <img
          src={PETALS[0].src}
          alt=""
          width={11}
          height={Math.round(11 / PETALS[0].aspect)}
          className="absolute bottom-[12%] left-[12%] block max-w-none"
        />
      ) : null}
      {design.butterflies !== "none" ? (
        <img
          src={butterflySources(design.butterflies)[0]}
          alt=""
          width={16}
          height={Math.round(16 / BUTTERFLY_ASPECT)}
          className="absolute right-[10%] bottom-[12%] block max-w-none"
        />
      ) : null}
    </span>
  );
}

/**
 * Ready-made looks, one click each: the first section of the Design tab.
 *
 * A preset sets the values the sections below it set — palette, type, border,
 * motion, floating elements, motifs, cover — and nothing else, so a host can
 * start from one and change any of it by hand afterwards. What it may and may
 * not touch is lib/presets.ts's business; this file draws the choice.
 *
 * ONLY THE CARD'S OWN TRADITION'S PRESETS are offered, found by each preset's
 * `tradition` field, so a tradition gets a group here by having entries in
 * lib/presets.ts and nothing else. A tradition with none yet says so rather
 * than hiding the section, and its header reads "Coming soon". A card with no
 * tradition chosen is sent to the Details question instead, since there is no
 * tradition yet to offer designs for.
 *
 * THE HEADER NAMES THE LOOK THE CARD IS WEARING, worked out from the design
 * rather than remembered: the preset's name while the design is exactly that
 * preset, "Custom" as soon as anything differs, and "None" on a card nobody
 * has designed yet.
 *
 * ASKING FIRST, BUT ONLY WHEN THERE IS SOMETHING TO LOSE. A card still on its
 * defaults, or wearing another preset untouched, holds no choices of the
 * host's own, so a click applies at once — trying the four in turn should be
 * four clicks. A design the host has worked on gets an inline question first.
 */
export default function PresetPicker({
  design,
  occasionId,
  onApply,
  onChooseTradition,
  accordion,
}: {
  /** The editor's current design values. */
  design: DesignState;
  /** Decides what the untouched design is; see defaultDesign. */
  occasionId: OccasionId;
  onApply: (preset: Preset) => void;
  /** Takes the host to the Religion / tradition question in Details. */
  onChooseTradition: () => void;
  /** The Design tab's open section; see CollapsibleSection. */
  accordion: Accordion;
}): ReactElement {
  const [pending, setPending] = useState<Preset | null>(null);
  const applyRef = useRef<HTMLButtonElement>(null);
  const confirmTextId = useId();

  const active = matchingPreset(design);
  /*
    Choosing the tradition, like choosing the occasion, is not designing: a
    host who has only answered the Details question has nothing to lose.
  */
  const isUntouched = sameDesign(design, {
    ...defaultDesign(occasionId),
    traditionId: design.traditionId,
  });
  const hasOwnDesign = !isUntouched && active === null;
  const noTradition = design.traditionId === "none";
  const groups = PRESET_GROUPS.filter(
    (group) => group.tradition === design.traditionId,
  );

  /*
    The question takes the focus when it appears, so a keyboard host answers
    it where they are rather than tabbing past four cards to reach it — and a
    host on a phone has it scrolled into view.
  */
  useEffect(() => {
    if (pending !== null) {
      applyRef.current?.focus();
    }
  }, [pending]);

  const choose = (preset: Preset): void => {
    if (hasOwnDesign) {
      setPending(preset);
      return;
    }

    setPending(null);
    onApply(preset);
  };

  return (
    <CollapsibleSection
      title="Quick presets"
      summary={
        noTradition
          ? "Choose tradition"
          : groups.length === 0
            ? "Coming soon"
            : (active?.name ?? (isUntouched ? "None" : "Custom"))
      }
      {...sectionState(accordion, "presets")}
    >
      <p className="text-xs text-[var(--lifafa-muted)]">
        {noTradition
          ? "Choose your religion or tradition in Details to see ready-made designs."
          : groups.length === 0
            ? "Ready-made designs for this tradition are coming soon. You can design your own using the sections below."
            : "Start from a ready-made look, then change anything you like below."}
      </p>

      {noTradition ? (
        <div>
          <button
            type="button"
            onClick={onChooseTradition}
            className="min-h-11 rounded-full border border-[var(--lifafa-marigold)]/60 px-5 text-[0.8125rem] font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          >
            Choose tradition
          </button>
        </div>
      ) : null}

      {groups.map((group) => (
        <div
          key={group.tradition}
          role="group"
          aria-label={`${group.label} presets`}
          className="flex flex-col gap-2"
        >
          <h3 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
            {group.label}
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {group.presets.map((preset) => {
              const isActive = active?.id === preset.id;
              const isPending = pending?.id === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => choose(preset)}
                  className={[
                    "flex min-h-11 min-w-0 flex-col gap-2 rounded-xl border p-2 text-left transition-colors duration-150",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
                    isActive || isPending
                      ? "border-transparent bg-[var(--lifafa-ink-raised)] ring-2 ring-[var(--lifafa-marigold)]"
                      : "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60",
                  ].join(" ")}
                >
                  <PresetMiniature
                    design={applyPreset(design, preset)}
                    presetId={preset.id}
                  />

                  <span className="flex min-w-0 flex-col gap-0.5 px-0.5 pb-0.5">
                    <span className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]">
                      {preset.name}
                    </span>
                    <span className="text-[0.6875rem] leading-snug text-[var(--lifafa-muted)]">
                      {preset.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {pending !== null &&
          group.presets.some((preset) => preset.id === pending.id) ? (
            <div
              role="group"
              aria-labelledby={confirmTextId}
              className="flex flex-col gap-3 rounded-xl border border-[var(--lifafa-marigold)]/45 bg-[var(--lifafa-ink-raised)] px-3.5 py-3"
            >
              <p
                id={confirmTextId}
                className="text-[0.8125rem] leading-relaxed text-[var(--lifafa-cream)]"
              >
                This will replace your current design. Your text and details
                stay the same.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  ref={applyRef}
                  type="button"
                  aria-label={`Apply ${pending.name}`}
                  onClick={() => {
                    onApply(pending);
                    setPending(null);
                  }}
                  className="min-h-11 rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.8125rem] font-semibold text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  className="min-h-11 rounded-full border border-[var(--lifafa-hairline)] px-5 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </CollapsibleSection>
  );
}
