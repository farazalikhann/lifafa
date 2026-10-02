"use client";

import { Fragment, type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { stage } from "@/components/invite/covers/timing";
import {
  GATEFOLD_ARCH_ASPECT,
  GATEFOLD_ENGRAVED,
  GATEFOLD_MEDALLION,
  GATEFOLD_RIBBON_ASPECT,
  gatefoldArt,
} from "@/lib/gatefoldArt";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms,
 * which is 1800ms.
 *
 * The ribbon is slipped off (400ms). The left door then swings, and the right
 * one 200ms behind it, each for 800ms. The two then fade together over what
 * is left, folded back at the sides, as the card settles in between them.
 *
 * SET TO THE RECORDING, public/sounds/fold-open.mp3: the ribbon's swish from
 * 0 to 0.4s, the left door at 0.4s, the right at 0.6s, and a chime at about
 * 1.35s, which is the moment the second door lands. Retime one and the other
 * is wrong.
 */
const RIBBON_SHARE = 0.22;
const LEFT_START = 0.222;
const RIGHT_START = 0.333;
const SWING_SHARE = 0.445;
const DOORS_FADE_START = 0.8;
const DOORS_FADE_SHARE = 0.2;

/** A door on a hinge: slow to start, a long glide, and a soft stop. */
const SWING_EASE = "cubic-bezier(0.6,0,0.25,1)";

/** The ribbon slipped down off the card: it gives, then goes. */
const RIBBON_EASE = "cubic-bezier(0.5,0,0.8,0.6)";

/**
 * How far a door swings: right round, until it lies folded back with its
 * lined inside to the guest and its free edge still raised towards them.
 */
const SWING = 150;

/**
 * How far in from the edge of the screen a door's hinge is carried as it
 * turns, in shares of the screen's width.
 *
 * THE ONE LIBERTY TAKEN WITH THE GEOMETRY. The doors are hinged at the edges
 * of the screen, and a door folded back on such a hinge lies wholly off the
 * screen: its lining would never be seen, and each door would simply narrow
 * to nothing at its edge. So the hinge drifts in by this much while the door
 * turns, which leaves a strip of the opened door standing at each side with
 * its lining showing and the card between them. Too gradual, and too small
 * beside the swing itself, to be seen as a slide.
 */
const HINGE_DRIFT = 15;

/**
 * How far the eye is from the card. On the doors' parent, so both swing
 * towards one vanishing point in the middle of the screen. Near enough that a
 * door coming towards the guest grows as a real one would; far enough that it
 * does not swallow the screen as it passes.
 */
const PERSPECTIVE = "1100px";

/**
 * The arch's width on the screen, as a CSS length. The cover's root is a size
 * container, and the arch, the ribbon and the lettering are all laid out from
 * this one number.
 *
 * The whole arch is always shown — it is a frame, and a frame cut off by the
 * edge of the screen is not one — so it is as large as fits both ways, with a
 * little margin. The paper runs on past it to fill the doors.
 */
const ARCH_WIDTH = `min(100cqw - 24px, (100cqh - 56px) * ${GATEFOLD_ARCH_ASPECT.toFixed(4)})`;

/** The ribbon's picture against the arch: its medallion sits in the arch's opening with room round it. */
const RIBBON_TO_ARCH = 1.76;

/** Both spellings, because Safari before 15.4 only honours the prefixed one. */
const HIDE_BACKFACE: CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/**
 * A gatefold card: two doors of paper under a gold arch, tied shut with a
 * ribbon, that open towards the guest onto the invitation.
 *
 * REAL PAPER AND GOLD. The cover used to be a small folded card drawn in the
 * card's own colours. It is the envelope's paper now, on doors that fill the
 * screen, with a filigree arch across them and a ribbon carrying the couple's
 * initials — see lib/gatefoldArt.ts for the pictures, and why this cover does
 * not take its colours from the card.
 *
 * CLOSED. Each door is half the screen. The arch is one picture of its left
 * half: the left door shows it against the seam and the right door shows it
 * again in a mirror, so the two halves are a pair by construction and meet on
 * the centre line at any width. The paper is one sheet across both. The
 * ribbon runs through the middle of the screen with its medallion over the
 * seam, and where the screen is wider than the ribbon's picture its two ends
 * are drawn on from the picture's own.
 *
 * THE OPEN. The ribbon slips down and off. The left door swings towards the
 * guest on its outer edge, and the right follows it; each fades as it comes
 * round, and the card is what stands behind them from the first moment a
 * door moves. Transform and opacity only.
 *
 * EACH DOOR IS TWO ELEMENTS: its outside, and its inside laid out as it would
 * lie once swung flat open — beyond the hinge — and turned half a revolution
 * back. Both turn about the same hinge with their backs hidden, so which one
 * the guest sees is the browser's own backface culling. They are direct
 * children of the root, which holds the perspective: an element between
 * would flatten the swing. See HINGE_DRIFT for how the inside comes to be on
 * the screen at all.
 *
 * Under reduced motion the shell never hands this the "opening" phase: the
 * closed gatefold crossfades to the card as one layer.
 */
export default function FoldUnfoldCover({
  phase,
  option,
  reducedMotion,
  colors,
  title,
  pair,
  headingFont,
  prompt,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const art = gatefoldArt(colors.isLight);

  /* The monogram: the same rules as the envelope's seal. */
  const pairLetters = pair?.map(initialOf).filter((letter) => letter.length > 0) ?? [];
  const lineLetters = pairLetters.length === 0 ? initialsOf(title) : "";

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
    "--aw": ARCH_WIDTH,
    "--ah": `calc(var(--aw) / ${GATEFOLD_ARCH_ASPECT.toFixed(4)})`,
    "--rw": `calc(var(--aw) * ${RIBBON_TO_ARCH})`,
    "--rh": `calc(var(--rw) / ${GATEFOLD_RIBBON_ASPECT.toFixed(4)})`,
    perspective: PERSPECTIVE,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /** A tile under a wash of shade. `from` is where the sheet starts, so one sheet can run across both doors. */
  const sheet = (src: string, size: string, shade: string, from: string): CSSProperties => ({
    backgroundImage: `${shade}, url(${src})`,
    backgroundSize: `100% 100%, ${size} auto`,
    backgroundPosition: `0 0, ${from}`,
    backgroundRepeat: "no-repeat, repeat",
  });

  /** One door's swing: its outside face, and its inside. `side` is -1 for the left door. */
  const swing = (side: -1 | 1, face: "outside" | "inside"): CSSProperties => {
    const start = side < 0 ? LEFT_START : RIGHT_START;
    /* Towards the guest: the left door's free edge comes forward on a negative turn, the right's on a positive. */
    const turned = opening ? side * SWING : 0;

    return {
      ...HIDE_BACKFACE,
      willChange: "transform, opacity",
      transition: transition(
        stage("transform", SWING_SHARE, start, SWING_EASE),
        stage("opacity", DOORS_FADE_SHARE, DOORS_FADE_START, "ease-in-out"),
      ),
      transform: `translate3d(${opening ? -side * HINGE_DRIFT : 0}cqw, 0, 0) rotateY(${face === "outside" ? turned : turned - side * 180}deg)`,
      opacity: opening ? 0 : 1,
    };
  };

  /* The shade a door throws on the card behind it, deepest beside the door, and gone when the door is. */
  const castStyle = (side: -1 | 1): CSSProperties => ({
    backgroundImage: `linear-gradient(${side < 0 ? 90 : 270}deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.44) ${HINGE_DRIFT * 2}%, rgba(0,0,0,0.12) 62%, rgba(0,0,0,0) 100%)`,
    transition: transition(stage("opacity", DOORS_FADE_SHARE, DOORS_FADE_START, "ease-in-out")),
    opacity: opening ? 0 : 1,
  });

  /* The ribbon, the monogram on it and the prompt under it, slipped off together. */
  const ribbonStyle: CSSProperties = {
    left: "calc(50% - var(--rw) / 2)",
    top: "calc(50% - var(--rh) / 2)",
    width: "var(--rw)",
    height: "var(--rh)",
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", RIBBON_SHARE, 0, RIBBON_EASE),
      stage("opacity", RIBBON_SHARE * 0.7, RIBBON_SHARE * 0.3, "ease-in"),
    ),
    transform: opening ? "translate3d(0, 85%, 0)" : "translate3d(0, 0, 0)",
    opacity: opening ? 0 : 1,
  };

  /* An end of the ribbon carried on to the edge of the screen: the picture's own end at its own size, in a mirror, so the satin runs on unbroken. */
  const ribbonEnd = (side: -1 | 1): CSSProperties => ({
    /* Tucked two pixels under the picture, whose own last column is soft and would show as a hairline. */
    [side < 0 ? "right" : "left"]: "calc(100% - 2px)",
    width: "max(0px, calc(50cqw - var(--rw) / 2 + 4px))",
    backgroundImage: `url(${art.ribbon})`,
    backgroundSize: "var(--rw) var(--rh)",
    backgroundPosition: side < 0 ? "0 0" : "100% 0",
    transform: "scaleX(-1)",
  });

  const engraved: CSSProperties = {
    ...headingFont,
    color: GATEFOLD_ENGRAVED.body,
    textShadow: GATEFOLD_ENGRAVED.shadow,
  };

  /* The paper is one sheet: the right door's starts half a screen further along it. */
  const paperTile = "calc(var(--aw) * 0.7)";
  const linerTile = "calc(var(--aw) * 0.5)";

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 overflow-hidden [container-type:size]"
    >
      {([-1, 1] as const).map((side) => (
        <div key={`cast${side}`} className={`absolute inset-y-0 w-1/2 ${side < 0 ? "left-0" : "right-0"}`} style={castStyle(side)} />
      ))}

      {([-1, 1] as const).map((side) => (
        <Fragment key={`door${side}`}>
          {/* The inside: beyond the hinge, where the door would lie flat open, turned back to lie shut. */}
          <div
            className={`absolute inset-y-0 w-1/2 ${side < 0 ? "right-full origin-right" : "left-full origin-left"}`}
            style={{
              ...swing(side, "inside"),
              ...sheet(
                art.liner,
                linerTile,
                `linear-gradient(${side < 0 ? 270 : 90}deg, rgba(20,2,4,0.5) 0%, rgba(20,2,4,0.12) 55%, rgba(20,2,4,0.3) 100%)`,
                "0 0",
              ),
            }}
          />

          {/* The outside: paper, and its half of the arch against the seam. */}
          <div
            className={`absolute inset-y-0 w-1/2 ${side < 0 ? "left-0 origin-left" : "left-1/2 origin-right"}`}
            style={{
              ...swing(side, "outside"),
              ...sheet(
                art.paper,
                paperTile,
                `linear-gradient(${side < 0 ? 90 : 270}deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 88%, rgba(0,0,0,0.14) 100%)`,
                side < 0 ? "0 0" : "-50cqw 0",
              ),
            }}
          >
            {/*
              Decoded before it is painted: the shell's loader has already
              waited for it. The right door's is the same picture, flipped.
            */}
            <img
              src={art.arch}
              alt=""
              decoding="sync"
              draggable={false}
              className={`absolute max-w-none select-none ${side < 0 ? "right-0" : "left-0 -scale-x-100"}`}
              style={{
                top: "calc(50% - var(--ah) / 2)",
                width: "calc(var(--aw) / 2)",
                height: "var(--ah)",
              }}
            />
          </div>
        </Fragment>
      ))}

      {/* Where the doors meet: a hair of shade, gone as soon as one moves. */}
      <div
        className="absolute inset-y-0 left-1/2 w-[10px] -translate-x-1/2"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.16) 42%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.16) 58%, rgba(0,0,0,0) 100%)",
          transition: transition(stage("opacity", 0.06, LEFT_START, "linear")),
          opacity: opening ? 0 : 1,
        }}
      />

      {/* The ribbon across both doors, its medallion over the seam. */}
      <div className="absolute" style={ribbonStyle}>
        <div className="absolute inset-y-0 bg-no-repeat" style={ribbonEnd(-1)} />
        <div className="absolute inset-y-0 bg-no-repeat" style={ribbonEnd(1)} />
        <img
          src={art.ribbon}
          alt=""
          decoding="sync"
          draggable={false}
          className="absolute inset-0 h-full w-full max-w-none select-none"
        />

        {/*
          The monogram, sized off the ribbon so it keeps its place on the
          medallion on any screen. The medallion's clear face is a fifth of
          the ribbon across; the widest pair a card can carry, "M & W", is
          about three ems, which at this size is four fifths of that.
        */}
        <div className="absolute inset-0 flex items-center justify-center">
          {pairLetters.length === 2 ? (
            <span
              data-cover-monogram=""
              className="leading-none whitespace-nowrap"
              style={{ ...engraved, fontSize: `calc(var(--rw) * ${GATEFOLD_MEDALLION} * 0.27)` }}
            >
              {pairLetters[0]}
              <span className="mx-[0.14em] text-[0.72em]" style={{ color: GATEFOLD_ENGRAVED.hi }}>
                &amp;
              </span>
              {pairLetters[1]}
            </span>
          ) : pairLetters.length === 1 || lineLetters.length > 0 ? (
            <span
              data-cover-monogram=""
              className="leading-none whitespace-nowrap"
              style={{
                ...engraved,
                letterSpacing: "0.04em",
                fontSize: `calc(var(--rw) * ${GATEFOLD_MEDALLION} * ${
                  pairLetters.length === 1 || lineLetters.length === 1 ? 0.46 : 0.36
                })`,
              }}
            >
              {pairLetters[0] ?? lineLetters}
            </span>
          ) : (
            <GoldFlower
              hi={GATEFOLD_ENGRAVED.hi}
              body={GATEFOLD_ENGRAVED.body}
              lo={GATEFOLD_ENGRAVED.lo}
              className="w-[10%] drop-shadow-[0_1px_0_rgba(255,238,178,0.8)]"
            />
          )}
        </div>

        {/* The way in, on the paper under the medallion. */}
        <span
          data-cover-prompt=""
          className="absolute top-full left-1/2 mt-[calc(var(--aw)*0.03)] -translate-x-1/2 animate-[lifafa-cover-breathe_2.6s_ease-in-out_infinite] tracking-[0.18em] whitespace-nowrap uppercase motion-reduce:animate-none"
          style={{
            ...headingFont,
            color: art.promptInk,
            fontSize: "clamp(11px, calc(var(--aw) * 0.04), 20px)",
          }}
        >
          {prompt}
        </span>
      </div>
    </div>
  );
}
