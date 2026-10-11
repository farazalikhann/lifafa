"use client";

import type { CSSProperties, ReactElement, ReactNode } from "react";
import FrameStage from "@/components/card/FrameStage";
import { OpeningCorner } from "@/components/card/decor/SlotOrnaments";
import { HeroName } from "@/components/card/sections/CoverSection";
import { useInView } from "@/hooks/useInView";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  firstNameOf,
  lineDelay,
  placeholderOpacity,
  resolve,
  resolveCoverNames,
  revealClass,
} from "@/lib/cardFormat";
import type { FrameArt } from "@/lib/cardDecor";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import type { CornerPair } from "@/lib/ornaments/slots";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * The names' screen of a card whose pack sets them in a frame (`framedNames`
 * in lib/traditionPacks.tsx): the ornament above the names, the names inside
 * the frame the host picked, and the event's title under it, between the
 * pair from the pack's bottom corners. It is the screen after the opening,
 * where every other card has its names, and takes the place of CoverSection
 * there.
 *
 * FIRST NAMES IN THE FRAME. "Aarav", the joining word, "Ananya": the frame
 * is where the names are largest, and a surname halves them. The names in
 * full are on Meet the Couple, in the band pinned to the top of the screen
 * and everywhere else the card has always set them. See firstNameOf.
 *
 * ONE SCREEN, AND WHAT GIVES WAY TO KEEP IT ONE. The block is exactly as
 * tall as a section, and two things in it are let move: the gaps either side
 * of the frame, between GAP and GAP_MIN, and the frame, between FRAME_MIN and
 * FRAME_HEIGHT. Everything else is the size it is. The frame is as tall as
 * its picture is at the width the card allows; on a shorter screen the gaps
 * close first, and only then the frame comes down.
 * If even the least of both does not fit, the block is as tall as they need
 * (`min-height: fit-content`); nothing is cut off or laid over anything else.
 * Whatever room is left over once the frame is at its full height is shared
 * above and below the group, which stands in the middle of the screen.
 *
 * THE FRAME IS AS WIDE AS THE CARD LETS IT BE: out through the screen's own
 * side padding to where a border's flowers begin, less a little air, and
 * never nearer the card's edge than 16px. A wide frame is bound by that width
 * and a tall one by the height it is given. FRAME_HEIGHT is more than any of
 * the four needs at the card's full width, so with a screen to itself every
 * frame is as wide as the card allows.
 *
 * THE NAMES NEVER TOUCH THE FRAME. They are set in the box the frame's
 * picture has clear (`words`), and FrameStage brings them down a size until
 * they fit it, so a long name is smaller, not across the artwork.
 *
 * The pair from the pack's bottom corners stand either side of the title, in
 * one row with it at the foot of the group: under the frame and the names,
 * beside the title and never over it.
 */

/** The frame's full height and its least, in card px. */
const FRAME_HEIGHT = 360;
const FRAME_MIN = 120;

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
 * on a plain names' screen, for its swashes; here the joining word is between
 * the two names with room of its own either side (JOINER_ROOM), and every
 * pixel of height the stack gives back is the names' size.
 */
const NAMES_LEADING = "0.9";

/**
 * Room between the joining word and each name, as a share of the names' size.
 * At this leading a name's capital rises to the top of its line and a
 * script's swash above it, and a "y" or a "g" in the name overhead comes down
 * under its own: both reach the joining word without this. Measured on every
 * pair's names face, it keeps the word 2px or more from either name.
 * Devanagari is set at a leading of its own for its matras, which is room
 * enough already.
 */
const JOINER_ROOM = "0.14em";

export default function NamesFrameScreen({
  draft,
  theme,
  occasionId,
  language,
  invited = null,
  aboveNames = null,
  frame,
  corners,
  height,
  padTop,
  padBottom,
}: {
  draft: EventDraft;
  theme: Theme;
  occasionId: OccasionId;
  language: CardLanguage;
  /** "You are invited", already drawn, where this is the card's first screen. */
  invited?: ReactNode;
  /**
   * The pack's ornament for the place above the names, already drawn (see
   * SlotOrnaments). Left off a screen under 700px tall, where its height is
   * the frame's; see globals.css.
   */
  aboveNames?: ReactNode;
  frame: FrameArt;
  /**
   * The pack's bottom-corner pair, or null. Not drawn under 390px, where a
   * title and two of them do not fit side by side.
   */
  corners: CornerPair | null;
  /** How tall the screen is: a section's height, as a CSS length. */
  height: string;
  /** The insets at its top and foot, in card px. */
  padTop: number;
  padBottom: number;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);
  const copy = cardCopy(language);
  const names = resolveCoverNames(draft, occasionId, language);
  const title = resolve(draft.eventTitle, copy.cover.titlePlaceholder);

  /* On the block's own children, which are the flex items the fitting rules name. */
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;
  const hasInvited = invited !== null && invited !== undefined && invited !== false;
  const hasAbove = aboveNames !== null && aboveNames !== undefined && aboveNames !== false;

  return (
    <section
      ref={ref}
      className="lifafa-names-screen relative flex flex-col items-center justify-center px-7 text-center"
      style={
        {
          "--names-screen-height": height,
          "--names-gap": cardPx(GAP),
          "--names-gap-min": cardPx(GAP_MIN),
          paddingTop: cardPx(padTop),
          paddingBottom: cardPx(padBottom),
        } as CSSProperties
      }
    >
      {hasInvited ? (
        <div className={`lifafa-names-fixed-gap ${reveal}`} style={lineDelay(0)}>
          {invited}
        </div>
      ) : null}

      {hasAbove ? (
        <div className={`lifafa-names-above ${reveal}`} style={lineDelay(0)}>
          {aboveNames}
        </div>
      ) : null}

      {/* The gaps that close before the frame gives anything up; see .lifafa-names-gap. */}
      {hasAbove ? <div aria-hidden="true" className="lifafa-names-gap lifafa-names-above" /> : null}

      <div
        className={`lifafa-names-frame-row -mx-7 flex justify-center self-stretch ${reveal}`}
        style={
          {
            ...lineDelay(1),
            "--names-frame-aspect": frame.aspect.toFixed(4),
            "--names-frame-height": cardPx(FRAME_HEIGHT),
            "--names-frame-min": cardPx(FRAME_MIN),
          } as CSSProperties
        }
      >
        {/*
          The room the frame has, as a container: the frame is drawn as large
          as fits it both ways, which a picture with one shape needs said in
          both the room's width and its height.
        */}
        <div
          className="lifafa-names-frame-cell flex min-w-0 flex-1 items-center justify-center self-stretch"
        >
          {/* As large as fits the cell both ways; the cell says how in globals.css. */}
          <FrameStage art={frame} width="var(--names-frame-width)" eager={hasInvited}>
            {names.kind === "pair" ? (
              /*
                Three lines, one unit, centred in the frame's opening. The
                group is set at the names' own size, so the joining word can
                be a share of it.
              */
              <div
                className="flex w-max max-w-[calc(20*var(--card-rem,1rem))] flex-col items-center text-[calc(2.4375rem*var(--card-names-scale,1))] sm:text-[calc(2.75*var(--card-rem,1rem)*var(--card-names-scale,1))]"
                style={
                  {
                    "--card-names-leading": NAMES_LEADING,
                    gap: copy.script === "devanagari" ? cardPx(2) : JOINER_ROOM,
                  } as CSSProperties
                }
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

      <div aria-hidden="true" className="lifafa-names-gap" />

      {/* The title, between the pair where the card has one: let out into the screen's padding. */}
      <div
        className={`-mx-4 flex items-end justify-center gap-2 self-stretch ${reveal}`}
        style={lineDelay(2)}
      >
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
    </section>
  );
}
