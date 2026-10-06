"use client";

import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import { BorderPreview, FlowerPreview } from "@/components/create/StylePanel";
import CollapsibleSection, {
  sectionState,
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import { BUTTERFLY_ASPECT, butterflySources } from "@/lib/butterflies";
import { flowerChipScale, isPhotoBorder } from "@/lib/flowerFrame";
import { calligraphyGround } from "@/lib/calligraphy";
import { fontFamilyOf, getFontPair, namesFaceOf } from "@/lib/fontPairs";
import { defaultDesign, type DesignState } from "@/lib/designDefaults";
import { cardPalette } from "@/lib/textColors";
import { FLOWER_CHIPS } from "@/lib/petals";
import {
  PRESET_GROUPS,
  applyPreset,
  matchingPreset,
  sameDesign,
  type Preset,
} from "@/lib/presets";
import { resolveSlots } from "@/lib/ornaments/slots";
import { getTraditionPack } from "@/lib/traditionPacks";
import type { OccasionId } from "@/types/occasion";

/** How many of a pack's hanging shapes the miniature strings along its top. */
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
 * A preset's card in miniature, laid out the way the card itself is: its
 * frame, the border hanging across the top, the calligraphy it opens with, the
 * ornament over the names, the names in the pair's own face, the pieces in the
 * two bottom corners, and a butterfly and a few petals where the card has them.
 *
 * One small card, not a row of separate stickers: a host deciding between four
 * looks should see four invitations. Built from what the preset would actually
 * do to the card — `applyPreset` over the current design — rather than from
 * the preset's settings read directly, so the miniature and the card can never
 * tell two stories. Every picture is one the card already uses.
 */
function PresetMiniature({
  design,
  presetId,
  hostNames,
}: {
  design: DesignState;
  /** Keeps the drawings' own svg ids apart across the cards. */
  presetId: string;
  /** The names the card will carry, so the miniature is the host's own card. */
  hostNames: string;
}): ReactElement {
  const palette = cardPalette(design.style);
  const accent = design.style.accentOverride ?? palette.accent;
  const names = namesFaceOf(getFontPair(design.style.fontPairId));
  const pack = getTraditionPack(design.traditionId);
  const enabled = design.ornamentConfig.enabledOrnaments;

  /* A pack with places: what is in each. */
  const slots = resolveSlots(pack, enabled);

  /* The one calligraphy the card opens with, if any. */
  const calligraphyId =
    pack === null ? undefined : pack.calligraphyIds.find((id) => enabled.includes(id));
  const calligraphy =
    pack === null || calligraphyId === undefined ? null : pack.findOrnament(calligraphyId);

  /*
    A pack without places — the lanterns, moons and stars of a Nikah — has its
    hanging shapes strung along the top instead, as the card hangs them.
  */
  const hanging =
    pack === null || pack.slots !== null
      ? []
      : enabled
          .filter((id) => id !== pack.dividerId && !pack.calligraphyIds.includes(id))
          .map((id) => pack.findOrnament(id))
          .filter((entry) => entry !== null)
          .slice(0, HINT_LIMIT);

  const divider =
    pack !== null && pack.dividerId !== null && enabled.includes(pack.dividerId)
      ? pack.findOrnament(pack.dividerId)
      : null;

  /* The preset's own flower, so a marigold look does not show a rose. */
  const petals = FLOWER_CHIPS[design.petalFlower];
  const id = (part: string): string => `preset-${presetId}-${part}`;

  /*
    Where the opening starts, as a share of the miniature's height: under the
    top border, however deep that hangs. The border is 84% of the width, the
    miniature is 4 wide by 5 tall, and a border too shallow to reach the
    opening leaves it where it always was.
  */
  const openingTop =
    slots.top === null ? 21 : Math.max(21, Math.round(2 + (84 / slots.top.aspect) * 0.8 + 1));

  return (
    <span
      aria-hidden="true"
      className="relative block aspect-[4/5] w-full overflow-hidden rounded-lg border border-[var(--lifafa-hairline)]"
      style={{ backgroundColor: palette.background, color: accent }}
    >
      {/*
        The border grid's chip drawing, stretched to the whole miniature. Its
        pen is set for a 44px chip, so at this size the strokes are held to one
        screen pixel rather than scaled up into a slab.
      */}
      <span className="absolute inset-0 [&_*]:[vector-effect:non-scaling-stroke]">
        {design.borderStyle === "none" ? null : isPhotoBorder(design.borderStyle) ? (
          <FlowerPreview
            style={design.borderStyle}
            className="block h-full w-full"
            scale={flowerChipScale(design.borderStyle) * FRAME_ZOOM}
          />
        ) : (
          <BorderPreview id={design.borderStyle} className="h-full w-full" />
        )}
      </span>

      {/* Across the top: the garland or toran, edge to edge as on the card. */}
      {slots.top !== null ? (
        <span className="absolute inset-x-[8%] top-[2%]">
          <slots.top.Component instanceId={id("top")} className="block h-auto w-full" />
        </span>
      ) : null}
      {hanging.length > 0 ? (
        <span className="absolute inset-x-0 top-[6%] flex items-start justify-center gap-2">
          {hanging.map((entry) => (
            <entry.Component
              key={entry.id}
              size={Math.round(entry.chipSize * 0.42)}
              instanceId={id(entry.id)}
            />
          ))}
        </span>
      ) : null}

      {/* The opening: the calligraphy, the ornament over the names, the names. */}
      <span
        className="absolute inset-x-0 flex flex-col items-center gap-[0.35rem] px-[16%]"
        style={{ top: `${openingTop}%` }}
      >
        {calligraphy !== null ? (
          <span className="block w-full">
            <calligraphy.Component
              instanceId={id("calligraphy")}
              className="block h-auto w-full"
              ground={calligraphyGround(palette.background)}
            />
          </span>
        ) : null}

        {slots.aboveNames !== null ? (
          <slots.aboveNames.Component instanceId={id("above")} size={15} />
        ) : null}

        <span
          className="block max-w-full overflow-hidden pb-[0.15em] text-center leading-[1.15] text-ellipsis whitespace-nowrap"
          style={{
            color: palette.textPrimary,
            fontFamily: fontFamilyOf(names.variable, names.fallback),
            fontWeight: names.weight,
            fontSize: `${Math.round(13 * names.scale)}px`,
          }}
        >
          {hostNames}
        </span>

        {divider !== null ? (
          <divider.Component size={34} instanceId={id("divider")} />
        ) : (
          <span className="h-px w-6" style={{ backgroundColor: accent }} />
        )}
      </span>

      {/* The two bottom corners; one piece alone stands in both, mirrored. */}
      {slots.corners !== null ? (
        <>
          <span className="absolute bottom-[5%] left-[9%]">
            <slots.corners.left.Component instanceId={id("corner-left")} size={17} />
          </span>
          <span
            className="absolute right-[9%] bottom-[5%]"
            style={slots.corners.mirrorRight ? { transform: "scaleX(-1)" } : undefined}
          >
            <slots.corners.right.Component instanceId={id("corner-right")} size={17} />
          </span>
        </>
      ) : null}

      {/* The floating elements: a few petals in the margins, one butterfly. */}
      {design.petals !== "none" ? (
        <>
          <img
            src={petals[0].src}
            alt=""
            width={8}
            height={Math.round(8 / petals[0].aspect)}
            className="absolute top-[48%] left-[7%] block max-w-none rotate-[-24deg]"
          />
          <img
            src={petals[petals.length - 1].src}
            alt=""
            width={7}
            height={Math.round(7 / petals[petals.length - 1].aspect)}
            className="absolute top-[70%] right-[8%] block max-w-none rotate-[32deg]"
          />
        </>
      ) : null}
      {design.butterflies !== "none" ? (
        <img
          src={butterflySources(design.butterflies)[0]}
          alt=""
          width={14}
          height={Math.round(14 / BUTTERFLY_ASPECT)}
          className="absolute top-[15%] right-[12%] block max-w-none rotate-[12deg]"
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
  hostNames,
  onApply,
  onChooseTradition,
  accordion,
}: {
  /** The editor's current design values. */
  design: DesignState;
  /** Decides what the untouched design is; see defaultDesign. */
  occasionId: OccasionId;
  /** The names line the card's cover prints, for the miniatures. */
  hostNames: string;
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
    /* On for a new card and not a design choice until a look asks for it. */
    ...(design.royalTexture !== undefined ? { royalTexture: design.royalTexture } : null),
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
                    hostNames={hostNames}
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
