"use client";

import type { CSSProperties, ReactElement, ReactNode, Ref } from "react";
import FrameStage from "@/components/card/FrameStage";
import { OpeningCorner } from "@/components/card/decor/SlotOrnaments";
import { HeroName } from "@/components/card/sections/CoverSection";
import {
  firstNameOf,
  placeholderOpacity,
  resolve,
  resolveCoverNames,
} from "@/lib/cardFormat";
import type { FrameArt } from "@/lib/cardDecor";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import type { Ornament } from "@/lib/ornaments/frame";
import type { CornerPair } from "@/lib/ornaments/slots";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * A card's opening and its names as one screen, for a pack that opens that
 * way (`namesOpening` in lib/traditionPacks.tsx): "You are invited", the
 * calligraphy, the blessing in its own script, the names inside a frame, and
 * the event's title under it. The names had a screen of their own after the
 * opening; here they are what the opening ends on.
 *
 * FIRST NAMES IN THE FRAME. "Aarav", the joining word, "Ananya": the frame
 * is where the names are largest, and a surname halves them. The names in
 * full are on Meet the Couple, in the band pinned to the top of the screen
 * and everywhere else the card has always set them. See firstNameOf.
 *
 * ONE SCREEN, AND WHAT GIVES WAY TO KEEP IT ONE. As the first screen of a
 * card sized to the phone, the block is exactly as tall as the room above the
 * scroll cue, and three things in it are let move: the calligraphy, between
 * its full size and three quarters of it; the two gaps either side of the
 * frame, between GAP and GAP_MIN; and the frame, between FRAME_MIN and
 * FRAME_HEIGHT. Everything else is the size it is. All three start at their
 * least and are grown into the room there is, the frame first, then the
 * gaps, then the calligraphy, each a thousand times as readily as the next:
 * read the other way, on a shorter screen the calligraphy comes down first,
 * by up to a quarter, then the gaps close, and only then the frame. If even
 * the least of all three does not fit, the block is as tall as they need
 * (`min-height: fit-content`) and the screen runs on under the cue; nothing
 * is cut off or laid over anything else.
 *
 * THE FRAME IS AS WIDE AS THE CARD LETS IT BE: out through the screen's own
 * side padding to where a border's flowers begin, less a little air. A wide
 * frame is bound by that width and a tall one by the height it is given.
 *
 * Anywhere else (the editor's frame, a printed sheet, a card whose host moved
 * the names down) nothing has to fit a screen, and both are their full size.
 *
 * THE NAMES NEVER TOUCH THE FRAME. They are set in the box the frame's
 * picture has clear (`words`), and FrameStage brings them down a size until
 * they fit it, so a long name is smaller, not across the artwork.
 *
 * The pair from the pack's bottom corners stand either side of the title, in
 * one row with it at the foot of the screen: under the frame and the names,
 * beside the title and never over it. Beside the frame they took its width,
 * and a frame is the one thing here that is better for every pixel.
 */

/** The frame's full height and its least, in card px. */
const FRAME_HEIGHT = 300;
const FRAME_MIN = 120;

/** The least the calligraphy is drawn at, as a share of its full size. */
const CALLIGRAPHY_MIN = 0.75;

/** The gap either side of the frame, and the least it closes to, in card px. */
const GAP = 12;
const GAP_MIN = 6;

/**
 * The joining word: this share of the names' size, and never drawn under
 * JOINER_MIN_PX. The names are brought down a size to fit the frame
 * (FrameStage, which says by how much in --frame-fit), so the least is
 * divided by that to come out at 13px as drawn.
 */
const JOINER_SHARE = 0.45;
const JOINER_MIN_PX = 13;

/**
 * The names' leading inside the frame. A script face is set looser than this
 * on a screen of its own, for its swashes; here the joining word is between
 * the two names, the swashes have that to reach into, and every pixel of
 * height the stack gives back is the names' size.
 */
const NAMES_LEADING = "0.9";

export interface OpeningCalligraphy {
  id: string;
  /** Width over height. */
  aspect: number;
  Component: Ornament;
}

export default function NamesOpening({
  rootRef,
  rootProps,
  draft,
  theme,
  occasionId,
  language,
  invited,
  calligraphy,
  calligraphyGround,
  blessing,
  frame,
  corners,
  fitted,
  style,
}: {
  rootRef?: Ref<HTMLDivElement>;
  /** Attributes for the block itself: the first screen's marker. */
  rootProps?: Record<string, string>;
  draft: EventDraft;
  theme: Theme;
  occasionId: OccasionId;
  language: CardLanguage;
  /** "You are invited", already drawn, where this is the card's first screen. */
  invited: ReactNode;
  calligraphy: readonly OpeningCalligraphy[];
  calligraphyGround: "light" | "dark";
  /** The blessing, already drawn. */
  blessing: ReactNode;
  frame: FrameArt;
  /**
   * The pack's bottom-corner pair, or null. Not drawn under 390px, where a
   * frame and two of them do not fit side by side; see globals.css.
   */
  corners: CornerPair | null;
  /**
   * Whether the block is fitted to a screen: its height is given in `style`
   * and the calligraphy and the frame move to fill it. Otherwise it is as
   * tall as its content, and at least the `minHeight` in `style`.
   */
  fitted: boolean;
  /** Height or min-height, and the insets. */
  style: CSSProperties;
}): ReactElement {
  const copy = cardCopy(language);
  const names = resolveCoverNames(draft, occasionId, language);
  const title = resolve(draft.eventTitle, copy.cover.titlePlaceholder);

  return (
    <div
      ref={rootRef}
      {...rootProps}
      className={`lifafa-names-opening relative flex flex-col items-center justify-center px-7 text-center ${
        fitted ? "lifafa-names-opening-fitted" : ""
      }`}
      style={
        {
          ...style,
          "--opening-gap": cardPx(GAP),
          "--opening-gap-min": cardPx(GAP_MIN),
        } as CSSProperties
      }
    >
      {invited !== null && invited !== undefined && invited !== false ? (
        <div className="lifafa-opening-fixed-gap">{invited}</div>
      ) : null}

      {calligraphy.map((panel) => (
        <div
          key={panel.id}
          /*
            A box of the piece's own shape that may be shorter than it, with
            the piece drawn as tall as the box and centred: so it comes down
            whole, not squashed. See .lifafa-opening-calligraphy.
          */
          className="lifafa-opening-calligraphy lifafa-opening-fixed-gap flex justify-center"
          style={
            {
              aspectRatio: String(panel.aspect),
              "--opening-calligraphy-aspect": String(panel.aspect),
              "--opening-calligraphy-min": String(CALLIGRAPHY_MIN),
            } as CSSProperties
          }
        >
          <panel.Component
            instanceId={`cover-calligraphy-${panel.id}`}
            className="block h-full max-w-none"
            ground={calligraphyGround}
            /* What a piece drawn as a shape is filled with: the card's accent. */
            style={{ color: theme.accent }}
          />
        </div>
      ))}

      {blessing}

      {/* The two gaps that close before the frame gives anything up; see .lifafa-opening-gap. */}
      <div aria-hidden="true" className="lifafa-opening-gap" />

      <div
        className="lifafa-opening-frame-row -mx-7 flex justify-center self-stretch"
        style={
          {
            "--opening-frame-height": cardPx(FRAME_HEIGHT),
            "--opening-frame-min": cardPx(FRAME_MIN),
          } as CSSProperties
        }
      >
        {/*
          The room the frame has, as a container: the frame is drawn as large
          as fits it both ways, which a picture with one shape needs said in
          both the room's width and its height.
        */}
        <div
          className="lifafa-opening-frame-cell flex min-w-0 flex-1 items-center justify-center self-stretch"
          style={{ "--opening-frame-aspect": frame.aspect.toFixed(4) } as CSSProperties}
        >
          {/* As large as fits the cell both ways; the cell says how in globals.css. */}
          <FrameStage art={frame} width="var(--opening-frame-width)" eager>
            {names.kind === "pair" ? (
              /*
                Three lines, one unit, centred in the frame's opening. The
                group is set at the names' own size, so the joining word can
                be a share of it.
              */
              <div
                className="flex w-max max-w-[calc(20*var(--card-rem,1rem))] flex-col items-center gap-0.5 text-[calc(2.4375rem*var(--card-names-scale,1))] sm:text-[calc(2.75*var(--card-rem,1rem)*var(--card-names-scale,1))]"
                style={{ "--card-names-leading": NAMES_LEADING } as CSSProperties}
              >
                <HeroName text={firstNameOf(names.first)} isPlaceholder={false} script={copy.script} />
                {/*
                  In the accent, as the theme resolves it for small text, and
                  letter spaced. Padded on the left by its tracking, which
                  otherwise trails the last letter and sets the word off
                  centre.
                */}
                <p
                  className={`pl-[0.22em] tracking-[0.22em] break-words lowercase ${
                    copy.script === "devanagari" ? "leading-normal" : "leading-none"
                  }`}
                  style={{
                    color: textRoles(theme).mark,
                    fontSize: `max(${JOINER_SHARE}em, calc(${JOINER_MIN_PX}px / var(--frame-fit, 1)))`,
                  }}
                >
                  {names.joiner}
                </p>
                <HeroName text={firstNameOf(names.second)} isPlaceholder={false} script={copy.script} />
              </div>
            ) : (
              <div
                className="flex w-max max-w-[calc(20*var(--card-rem,1rem))] flex-col items-center"
                style={{ "--card-names-leading": NAMES_LEADING } as CSSProperties}
              >
                <HeroName
                  text={names.text}
                  isPlaceholder={names.isPlaceholder}
                  script={copy.script}
                />
              </div>
            )}
          </FrameStage>
        </div>

      </div>

      <div aria-hidden="true" className="lifafa-opening-gap" />

      {/* The title, between the pair where the card has one: let out into the screen's padding. */}
      <div className="-mx-4 flex items-end justify-center gap-2 self-stretch">
        {corners !== null ? (
          <OpeningCorner entry={corners.left} side="left" accent={theme.accent} />
        ) : null}

        <p
          className="min-w-0 flex-1 text-[calc(0.84*var(--card-rem,1rem))] tracking-[0.28em] break-words uppercase text-balance"
          style={{
            color: textRoles(theme).title,
            opacity: placeholderOpacity(title.isPlaceholder, "muted"),
          }}
        >
          {title.text}
        </p>

        {corners !== null ? (
          <OpeningCorner
            entry={corners.right}
            side="right"
            mirror={corners.mirrorRight}
            accent={theme.accent}
          />
        ) : null}
      </div>
    </div>
  );
}
