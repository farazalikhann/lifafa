"use client";

import type { CSSProperties, ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { stage } from "@/components/invite/covers/timing";
import {
  GUST_PIECES,
  PETAL_COVER_ASPECT,
  PETAL_OVAL,
  petalCoverArt,
} from "@/lib/petalCoverArt";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms,
 * which is 1800ms.
 *
 * The gust is a wave: a tile's own delay is how far it is from the tap, up to
 * WAVE for the furthest, and each then takes FLY to leave. So the last tile
 * has stopped moving at 0.98, and has finished fading a little before that.
 * The wave is given the larger share: the furthest tiles lie at the edge of
 * the screen and are blown straight off it, so a long flight for them is
 * time in which nothing is seen to move. The loose petals keep the same wave.
 */
const WAVE = 0.68;
const FLY = 0.3;
const FADE_START = 0.08;
const FADE_SHARE = 0.2;
const PIECE_FLY = 0.3;
/** The lettering in the oval goes at once: the guest has done what it asked. */
const WORDS_SHARE = 0.1;

/** Lifted off the cover and carried: slow to start, then away. */
const GUST_EASE = "cubic-bezier(0.45,0,0.7,0.9)";

/**
 * The cover is cut into this many tiles, each one a piece of the photograph,
 * and each blown off on its own.
 */
const COLS = 8;
const ROWS = 12;

/**
 * How much larger than its cell a tile is drawn, each way. The tiles are not
 * the squares of the grid: each is a rounded patch reaching well into its
 * neighbours, so that what flies off is the shape of a handful of petals and
 * not a square, and what it leaves is a soft-edged gap. At rest they overlap
 * like scales and still show one unbroken picture, every one drawing the
 * piece that belongs where it lies. 0.3 is enough that the rounded corners of
 * four neighbours always cover the point where their cells meet.
 */
const OVERLAP = 0.3;

/** How many loose petals fly with them. */
const PIECES = 26;

/**
 * The picture's width on the screen, as a CSS length. The cover's root is a
 * size container, and everything is laid out from this one number.
 *
 * Three rules, in order. It covers the screen — and a hair more than its
 * height needs (71% of it across, not 66.7%), because the oval sits a little
 * above the picture's middle and the slack is what lets it be put in the
 * middle of the screen with no bare strip at the foot. It is the same picture
 * `object-fit: cover` would draw, centred on the oval. And on a screen wider
 * than it is tall it stops growing at the width where the oval still fits the
 * height with room to spare; past that the picture would be cut across the
 * oval's rim, so it stays that size and the sides are filled behind it.
 */
const STAGE_WIDTH = "min(max(100cqw, 71cqh), 118.5cqh)";

/**
 * A number in [0, 1) from two whole numbers: the scatter's own dice.
 *
 * Not Math.random, which would put one arrangement in the server's HTML and
 * another in the browser's; and not built on Math.sin, whose last digits
 * differ between engines. Integer arithmetic comes out the same everywhere.
 */
function dice(index: number, salt: number): number {
  let value = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value ^= value >>> 13;

  return ((value >>> 0) % 10000) / 10000;
}

const round = (value: number): number => Math.round(value * 100) / 100;

/** The loose petals: where each lies, which it is, how big, and how it lies. */
const LOOSE = Array.from({ length: PIECES }, (_, index) => ({
  x: dice(index, 1),
  y: dice(index, 2),
  src: GUST_PIECES[index % GUST_PIECES.length],
  /* In cqw: between a ninth and a sixth of a phone's width. */
  size: round(11 + dice(index, 3) * 6),
  rest: Math.round(dice(index, 4) * 360),
}));

/**
 * How a thing at (x, y), in shares of the screen, is blown by a gust from
 * `origin`: when it goes, as a share of WAVE's span, and which way.
 *
 * Distance is measured with the height stretched, a phone being about twice
 * as tall as it is wide, so the wave spreads as a circle on the glass and
 * not as an ellipse. Straight up for anything lying right on the tap.
 */
function gust(
  x: number,
  y: number,
  origin: { x: number; y: number },
): { when: number; nx: number; ny: number } {
  const TALL = 1.9;
  const dx = x - origin.x;
  const dy = (y - origin.y) * TALL;
  const distance = Math.hypot(dx, dy);
  const furthest = Math.hypot(
    Math.max(origin.x, 1 - origin.x),
    Math.max(origin.y, 1 - origin.y) * TALL,
  );

  return {
    when: Math.min(1, distance / furthest),
    nx: distance < 0.02 ? 0 : dx / distance,
    ny: distance < 0.02 ? -1 : dy / distance,
  };
}

/**
 * A carpet of petals lying over the invitation, with the couple's initials in
 * an oval at its heart, blown away by one gust from wherever the guest taps.
 *
 * A PHOTOGRAPH, NOT A SCATTER. The cover used to be some forty petals and
 * gilt leaves placed by hand round a drawn wreath. It is one picture now —
 * see lib/petalCoverArt.ts for which, and why this cover does not take its
 * colours from the card.
 *
 * CLOSED, it is that picture whole, breathing very slightly. The monogram and
 * the prompt are lettered into its oval, here rather than by the shell, which
 * has no ground of its own to print them on.
 *
 * THE GUST. Under the whole picture lies the same picture in tiles, each
 * drawing its own piece of it (and each a rounded patch overlapping its
 * neighbours, not a square: see OVERLAP). On the tap the whole one is taken away —
 * there is no change to see, since the tiles are the same picture in the same
 * place — and each tile is blown off: away from the tap and a little upward,
 * turning, shrinking and fading, nearest first, so the gust crosses the
 * screen as a wave and the card is what it leaves behind. Loose petals fly
 * with the tiles, so the wave's edge is petals and not squares.
 *
 * Transform and opacity only. Every tile is its own compositor layer from the
 * start, so nothing is promoted or painted on the tap. Under reduced motion
 * the shell never hands this the "opening" phase: the whole cover crossfades
 * to the card.
 */
export default function PetalDustCover({
  phase,
  option,
  reducedMotion,
  colors,
  title,
  pair,
  headingFont,
  prompt,
  origin,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const art = petalCoverArt(colors.isLight);
  /* A tap that reported no place, from a keyboard, opens from the oval. */
  const from = origin ?? { x: PETAL_OVAL.x, y: 0.5 };

  /* The monogram: the same rules as the envelope's seal. */
  const pairLetters = pair?.map(initialOf).filter((letter) => letter.length > 0) ?? [];
  const lineLetters = pairLetters.length === 0 ? initialsOf(title) : "";

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
    "--sw": STAGE_WIDTH,
    "--sh": `calc(var(--sw) / ${PETAL_COVER_ASPECT})`,
    "--sl": "calc(50cqw - var(--sw) / 2)",
    "--st": `calc(50cqh - var(--sh) * ${PETAL_OVAL.y})`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /*
    The card's ground behind everything. Gone on the tap: the tiles cover the
    screen until each one leaves, and what a leaving tile shows is the card.
  */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    opacity: opening ? 0 : 1,
  };

  /* The idle breath. Paused on the tap, not removed, so the cover does not snap back to size. */
  const breathStyle: CSSProperties = {
    animationPlayState: opening ? "paused" : "running",
  };

  /* The picture, where `object-fit: cover` centred on the oval would put it. */
  const stageBox: CSSProperties = {
    left: "var(--sl)",
    top: "var(--st)",
    width: "var(--sw)",
    height: "var(--sh)",
  };

  const lettering: CSSProperties = {
    ...headingFont,
    color: art.gold,
    textShadow: art.emboss,
  };

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 overflow-hidden [container-type:size]"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      {/*
        On a screen wider than the picture can fill (see STAGE_WIDTH): the
        same picture, large and out of focus, behind it. Not drawn at all on a
        phone, where it would be a blur nobody sees.
      */}
      <div
        className="absolute -inset-[6%] hidden bg-cover bg-center blur-2xl brightness-[0.82] [@media(min-aspect-ratio:118/100)]:block"
        style={{
          backgroundImage: `url(${art.cover})`,
          transition: transition(stage("opacity", 0.6, 0, "ease-out")),
          opacity: opening ? 0 : 1,
        }}
      />

      <div
        className="absolute inset-0 animate-[lifafa-cover-swell_9s_ease-in-out_infinite] motion-reduce:animate-none"
        style={breathStyle}
      >
        {/* The picture in tiles, under the whole one until the tap. */}
        {Array.from({ length: COLS * ROWS }, (_, index) => {
          const col = index % COLS;
          const row = (index - col) / COLS;
          const wind = gust((col + 0.5) / COLS, (row + 0.5) / ROWS, from);
          const delay = round(wind.when * WAVE);
          /* Each its own distance, lift and turn, so the wave does not leave in ranks. */
          const reach = 0.75 + dice(index, 5) * 0.5;
          const dx = round(wind.nx * 58 * reach);
          const dy = round(wind.ny * 30 * reach - (12 + dice(index, 6) * 12));
          const turn = Math.round((dice(index, 7) - 0.5) * 2 * (60 + dice(index, 8) * 120));
          const left = round(((col - OVERLAP) / COLS) * 100);
          const top = round(((row - OVERLAP) / ROWS) * 100);
          /* No two patches the same outline: each corner rounded by its own amount. */
          const corner = (salt: number): number => Math.round(40 + dice(index, salt) * 10);

          return (
            <div
              key={index}
              className="absolute bg-no-repeat"
              style={{
                left: `${left}cqw`,
                top: `${top}cqh`,
                width: `${round(((1 + OVERLAP * 2) / COLS) * 100)}cqw`,
                height: `${round(((1 + OVERLAP * 2) / ROWS) * 100)}cqh`,
                borderRadius: `${corner(12)}% ${corner(13)}% ${corner(14)}% ${corner(15)}% / ${corner(16)}% ${corner(17)}% ${corner(18)}% ${corner(19)}%`,
                backgroundImage: `url(${art.cover})`,
                backgroundSize: "var(--sw) var(--sh)",
                /* The picture's own place on the screen, less this patch's: its piece of it. */
                backgroundPosition: `calc(var(--sl) - ${left}cqw) calc(var(--st) - ${top}cqh)`,
                willChange: "transform, opacity",
                transition: transition(
                  stage("transform", FLY, delay, GUST_EASE),
                  stage("opacity", FADE_SHARE, round(delay + FADE_START), "ease-in"),
                ),
                transform: opening
                  ? `translate3d(${dx}cqw, ${dy}cqh, 0) rotate3d(${round(dice(index, 9) - 0.5)}, ${round(dice(index, 10) - 0.5)}, 1, ${turn}deg) scale(0.7)`
                  : "translate3d(0, 0, 0)",
                opacity: opening ? 0 : 1,
              }}
            />
          );
        })}

        {/*
          The picture whole. Taken away on the tap in one step, with no fade:
          the tiles under it are the same picture, so nothing is seen to
          change, and a fade would only hold a still copy over the gust.
          Decoded before it is painted, the shell's loader having waited for it.
        */}
        <img
          src={art.cover}
          alt=""
          decoding="sync"
          draggable={false}
          className="absolute max-w-none select-none"
          style={{ ...stageBox, opacity: opening ? 0 : 1 }}
        />

        {/* The oval's own lettering: the monogram, a rule, and the way in. */}
        <div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{
            left: `calc(var(--sl) + var(--sw) * ${round(PETAL_OVAL.x - PETAL_OVAL.width / 2)})`,
            top: `calc(var(--st) + var(--sh) * ${round(PETAL_OVAL.y - PETAL_OVAL.height / 2)})`,
            width: `calc(var(--sw) * ${PETAL_OVAL.width})`,
            height: `calc(var(--sh) * ${PETAL_OVAL.height})`,
            gap: "calc(var(--sw) * 0.03)",
            transition: transition(stage("opacity", WORDS_SHARE, 0, "ease-out")),
            opacity: opening ? 0 : 1,
          }}
        >
          {/*
            Sized off the picture, so it keeps its place in the oval on any
            screen. The oval is 51% of the picture across; the widest pair a
            card can carry, "M & W", is about three ems, which at this size
            is 36% of it.
          */}
          {pairLetters.length === 2 ? (
            <span
              data-cover-monogram=""
              className="leading-none whitespace-nowrap"
              style={{ ...lettering, fontSize: "calc(var(--sw) * 0.12)" }}
            >
              {pairLetters[0]}
              <span className="mx-[0.16em] text-[0.7em]" style={{ color: art.goldHi }}>
                &amp;
              </span>
              {pairLetters[1]}
            </span>
          ) : pairLetters.length === 1 || lineLetters.length > 0 ? (
            <span
              data-cover-monogram=""
              className="leading-none whitespace-nowrap"
              style={{
                ...lettering,
                letterSpacing: "0.04em",
                fontSize:
                  pairLetters.length === 1 || lineLetters.length === 1
                    ? "calc(var(--sw) * 0.17)"
                    : "calc(var(--sw) * 0.14)",
              }}
            >
              {pairLetters[0] ?? lineLetters}
            </span>
          ) : (
            <GoldFlower hi={art.goldHi} body={art.gold} lo={art.goldLo} className="w-[32%]" />
          )}

          <span aria-hidden className="flex items-center gap-[0.5em]" style={{ color: art.gold }}>
            <span className="h-px w-[calc(var(--sw)*0.06)] bg-current opacity-70" />
            <svg viewBox="0 0 10 10" className="h-[0.5em] w-[0.5em]" focusable="false">
              <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="currentColor" />
            </svg>
            <span className="h-px w-[calc(var(--sw)*0.06)] bg-current opacity-70" />
          </span>

          <span
            data-cover-prompt=""
            className="animate-[lifafa-cover-breathe_2.6s_ease-in-out_infinite] tracking-[0.18em] whitespace-nowrap uppercase motion-reduce:animate-none"
            style={{ ...lettering, fontSize: "clamp(11px, calc(var(--sw) * 0.026), 22px)" }}
          >
            {prompt}
          </span>
        </div>

        {/*
          The loose petals. Not seen until the gust reaches them: each comes
          up off the cover as the wave passes and is carried further than the
          tiles round it.
        */}
        {LOOSE.map((piece, index) => {
          const wind = gust(piece.x, piece.y, from);
          const delay = round(wind.when * WAVE);
          const reach = 0.9 + dice(index, 11) * 0.6;

          return (
            <span
              key={index}
              className="absolute opacity-0"
              style={
                {
                  left: `calc(${round(piece.x * 100)}cqw - ${piece.size / 2}cqw)`,
                  top: `calc(${round(piece.y * 100)}cqh - ${piece.size / 2}cqw)`,
                  width: `min(${piece.size}cqw, 96px)`,
                  height: `min(${piece.size}cqw, 96px)`,
                  willChange: "transform, opacity",
                  "--dx": `${round(wind.nx * 70 * reach)}cqw`,
                  "--dy": `${round(wind.ny * 36 * reach - 22)}cqh`,
                  "--turn": `${Math.round((dice(index, 20) - 0.5) * 540)}deg`,
                  animation:
                    opening && !reducedMotion
                      ? `lifafa-cover-gust calc(var(--cover-ms)*${PIECE_FLY}) cubic-bezier(0.3,0.3,0.6,1) calc(var(--cover-ms)*${delay}) both`
                      : undefined,
                } as CSSProperties
              }
            >
              <img
                src={piece.src}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-contain select-none"
                style={{ transform: `rotate(${piece.rest}deg)` }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
