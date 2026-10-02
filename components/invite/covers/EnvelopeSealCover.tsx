"use client";

import { useId, type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { ABOVE_WORDS } from "@/components/invite/covers/layout";
import { stage } from "@/components/invite/covers/timing";
import { envelopeArt } from "@/lib/envelopeArt";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms,
 * which is 2400ms.
 *
 * Four movements, each handing to the next with a little overlap, because
 * paper does not stop between one movement and the next: the seal is peeled
 * away (300ms), the flap turns over while the seal is still leaving (700ms),
 * the letter is drawn out as the flap lands (800ms), and the envelope sinks
 * away as the letter comes forward to become the card (600ms). The last stage
 * ends on exactly 1, so nothing is moving when the shell unmounts. The seal's
 * sound in lib/coverSound.ts keeps the same times.
 */
const PEEL_START = 0;
const PEEL_SHARE = 0.125;
const FLAP_START = 0.09;
const FLAP_SHARE = 0.29;
const RISE_START = 0.36;
const RISE_SHARE = 0.33;
const DROP_START = 0.72;
const DROP_SHARE = 0.28;
/* The pocket is gone before the letter grows past it, since it sits in front. */
const DROP_FADE_SHARE = 0.17;
const ZOOM_START = 0.75;
const ZOOM_SHARE = 0.25;
/*
  The card's ground clears as the letter comes out, so the card and its petal
  burst arrive behind the envelope rather than after it.
*/
const BACKDROP_START = 0.58;
const BACKDROP_SHARE = 0.38;

/** Wax coming off paper: it holds, then gives. */
const PEEL_EASE = "cubic-bezier(0.4,0,0.7,0.6)";

/** Slow off the fold, quick through the middle, slow onto the back. */
const FLAP_EASE = "cubic-bezier(0.6,0,0.35,1)";

/** The letter drawn out by hand: an easy start and a long settle. */
const RISE_EASE = "cubic-bezier(0.4,0,0.2,1)";

/** Everything the envelope is made of sinks away on this curve. */
const DROP_EASE = "cubic-bezier(0.5,0,0.75,0.5)";

/** The letter coming up to meet the guest, easing into place as it arrives. */
const ZOOM_EASE = "cubic-bezier(0.3,0,0.15,1)";

/**
 * The envelope is laid out on a 400 × 280 grid, the proportions of a good
 * invitation envelope. Every piece is its own element placed on that grid in
 * percentages, so the envelope keeps its shape at any width.
 */
const GRID_W = 400;
const GRID_H = 280;
/** How far down the flap's point comes, and where the pocket's folds meet. */
const FLAP_H = 172;
const SIDE_MEET_Y = 150;
const BOTTOM_PEAK_Y = 124;

function box(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: `${(x / GRID_W) * 100}%`,
    top: `${(y / GRID_H) * 100}%`,
    width: `${(width / GRID_W) * 100}%`,
    height: `${(height / GRID_H) * 100}%`,
  };
}

/** The seal sits on the flap's point, and is a third of the envelope's width. */
const SEAL_X = 200;
const SEAL_Y = 160;
const SEAL_SIZE = 134;

/**
 * How wide the tiles are drawn, as a share of the envelope's own width (it is
 * a size container), so the print keeps its scale against the envelope on any
 * screen. The paper's paisleys come out about a thumbnail high.
 */
const PAPER_TILE = "62cqw";
const LINER_TILE = "44cqw";

/** The gold of the flap's edge line and the monogram: lit, body, shade. */
const GOLD_HI = "#F6E3A6";
const GOLD = "#DDB65C";
const GOLD_LO = "#8F6420";

/**
 * The monogram, as a share of the seal's width (the seal is a size container).
 *
 * The seal's empty centre is 52% of its width across, and the widest pair a
 * card can carry — "M & W", in a wide capital face — is about three ems. So
 * the pair is set small enough for that one to fit with air around it, and
 * every other pair has room to spare. Measured, not guessed: see the checks
 * this was shipped with.
 */
const PAIR_SIZE = "16.5cqw";
const SINGLE_SIZE = "26cqw";

/** Both spellings, because Safari before 15.4 only honours the prefixed one. */
const HIDE_BACKFACE: CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/** The same distance from the eye for both faces of the flap, or they would part as they turn. */
const FLAP_PERSPECTIVE = "perspective(1100px)";

/** Gold pressed into wax: a lit edge above, the wax's own shade below. */
const EMBOSS = `0 -0.04em 0 ${GOLD_HI}, 0 0.05em 0.02em rgba(52, 6, 8, 0.85), 0 0.1em 0.14em rgba(0, 0, 0, 0.35)`;

/**
 * The envelope a guest opens.
 *
 * REAL PAPER ON A DRAWN SHAPE. The pocket, the V of its front and the flap
 * are still shapes cut in code, so the envelope keeps its proportions on any
 * screen; what fills them is photographed paper, tiled, with the lining
 * printed inside the flap and a wax seal on its point. See lib/envelopeArt.ts
 * for which paper a card gets, and why this cover does not take its colours
 * from the card. The letter inside is still cut from the card's own ground,
 * so it dissolves into the real card without changing colour on the way.
 *
 * LAYERS, NOT ONE DRAWING. Each moving piece is an element of its own, which
 * the browser moves on the compositor. Back to front: the lined inside, the
 * flap's inside face, the letter, the pocket, the flap's outside face, the
 * seal.
 *
 * THE FLAP IS TWO ELEMENTS, and nothing ever changes places in the stack. The
 * outside face is above the letter and the inside face below it, each turning
 * through the same half revolution about the same hinge with its back hidden,
 * so the hand-off at 90° is the browser's own backface culling. Each is
 * turned directly rather than inside a shared 3D parent, so each can clip its
 * paper to a triangle without flattening the turn.
 *
 * THE OPEN, in the order a guest sees it: the seal is peeled up and away, the
 * flap swings over to show its lining, the letter is drawn up out of the
 * pocket with the couple's names on it, and the envelope sinks away as the
 * letter comes forward and becomes the card. Transform and opacity only.
 *
 * It never takes a pointer event — the shell's button is the whole click
 * surface — so this is only ever a picture of what tapping does. Under
 * reduced motion the shell never hands it the "opening" phase: the closed
 * envelope crossfades to the card as one layer.
 */
export default function EnvelopeSealCover({
  phase,
  option,
  reducedMotion,
  colors,
  title,
  pair,
  namesFont,
  headingFont,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const art = envelopeArt(colors.isLight);
  /* Gradient ids are document-wide; anything but a plain name breaks url(#…). */
  const uid = `env${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  /*
    The monogram. Two names give their two first letters either side of an
    ampersand; a card that names one person, or a family in one line, gives
    the initials of that line, as it always has; and a card that names nobody
    gets the flower below.
  */
  const pairLetters = pair?.map(initialOf).filter((letter) => letter.length > 0) ?? [];
  const lineLetters = pairLetters.length === 0 ? initialsOf(title) : "";

  /*
    Every transition below is a fraction of this, so the drawing cannot drift
    out of step with the setTimeout that unmounts it.
  */
  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /** Paper, tiled, under a wash of shade: a fold catching or losing the light. */
  const paper = (shade: string, offset: string): CSSProperties => ({
    backgroundImage: `${shade}, url(${art.paper})`,
    backgroundSize: `100% 100%, ${PAPER_TILE} auto`,
    backgroundPosition: `0 0, ${offset}`,
    backgroundRepeat: "no-repeat, repeat",
  });

  const liner = (shade: string, offset: string): CSSProperties => ({
    backgroundImage: `${shade}, url(${art.liner})`,
    backgroundSize: `100% 100%, ${LINER_TILE} auto`,
    backgroundPosition: `0 0, ${offset}`,
    backgroundRepeat: "no-repeat, repeat",
  });

  /* The card's ground, held over the card until the letter is on its way out. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(stage("opacity", BACKDROP_SHARE, BACKDROP_START, "ease-in-out")),
    opacity: opening ? 0 : 1,
  };

  /*
    The idle bob. Paused rather than removed on the tap: taking the animation
    away would snap the envelope back to its rest position mid-breath.
  */
  const floatStyle: CSSProperties = {
    animationPlayState: opening ? "paused" : "running",
  };

  /* Back, pocket and flap all sink away together once the letter is out. */
  const dropStyle = (zIndex: number): CSSProperties => ({
    zIndex,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", DROP_SHARE, DROP_START, DROP_EASE),
      stage("opacity", DROP_FADE_SHARE, DROP_START, "ease-in"),
    ),
    transform: opening ? "translate3d(0, 30%, 0)" : "translate3d(0, 0, 0)",
    opacity: opening ? 0 : 1,
  });

  /*
    The flap's outside face: hinged on its top edge and swung towards the
    guest, all the way over. The perspective is in the transform itself, so
    the 3D depends on nothing above it.
  */
  const flapOutsideStyle: CSSProperties = {
    ...box(0, 0, GRID_W, FLAP_H),
    ...HIDE_BACKFACE,
    transformOrigin: "50% 0%",
    willChange: "transform",
    transition: transition(stage("transform", FLAP_SHARE, FLAP_START, FLAP_EASE)),
    transform: `${FLAP_PERSPECTIVE} rotateX(${opening ? 180 : 0}deg)`,
  };

  /*
    Its inside face, laid out as it stands once open — above the envelope,
    point up, on the same hinge — and turned back half a revolution to lie
    shut, where its back is to the guest and is not drawn.
  */
  const flapInsideStyle: CSSProperties = {
    ...box(0, -FLAP_H, GRID_W, FLAP_H),
    ...HIDE_BACKFACE,
    transformOrigin: "50% 100%",
    willChange: "transform",
    transition: transition(stage("transform", FLAP_SHARE, FLAP_START, FLAP_EASE)),
    transform: `${FLAP_PERSPECTIVE} rotateX(${opening ? 0 : -180}deg)`,
  };

  /* The letter coming up out of the pocket… */
  const riseStyle: CSSProperties = {
    willChange: "transform",
    transition: transition(stage("transform", RISE_SHARE, RISE_START, RISE_EASE)),
    transform: opening ? "translate3d(0, -62%, 0)" : "translate3d(0, 0, 0)",
  };

  /* …and then towards the guest, filling the screen as it dissolves into the card. */
  const letterExitStyle: CSSProperties = {
    ...box(22, 14, 356, 252),
    zIndex: 2,
    /*
      Grown about the letter as it stands risen, 62% of its height above this
      box, so it comes towards the guest rather than up off the screen — and
      brought down to the middle of the screen as it does.
    */
    transformOrigin: "50% -12%",
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", ZOOM_SHARE, ZOOM_START, ZOOM_EASE),
      stage("opacity", ZOOM_SHARE * 0.7, ZOOM_START + ZOOM_SHARE * 0.2, "ease-in"),
    ),
    transform: opening ? "translate3d(0, 70%, 0) scale(1.75)" : "none",
    opacity: opening ? 0 : 1,
  };

  /* The seal peeled off the paper: up, a little over, and gone. */
  const peelStyle: CSSProperties = {
    transformOrigin: "50% 100%",
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", PEEL_SHARE, PEEL_START, PEEL_EASE),
      stage("opacity", PEEL_SHARE * 0.8, PEEL_START + PEEL_SHARE * 0.2, "ease-in"),
    ),
    transform: opening
      ? "translate3d(4%, -16%, 0) rotate(-7deg) scale(1.1)"
      : "translate3d(0, 0, 0) rotate(0deg) scale(1)",
    opacity: opening ? 0 : 1,
  };

  /* A shadow stays a shadow on every palette. It goes when the envelope does. */
  const shadowStyle: CSSProperties = {
    ...box(10, 244, 380, 70),
    backgroundImage:
      "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 68%)",
    transition: transition(stage("opacity", DROP_SHARE * 0.6, DROP_START, "ease-out")),
    opacity: opening ? 0 : 1,
  };

  const sealBox = box(SEAL_X - SEAL_SIZE / 2, SEAL_Y - SEAL_SIZE / 2, SEAL_SIZE, SEAL_SIZE);
  const pct = (value: number, of: number): string => `${((value / of) * 100).toFixed(2)}%`;

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      {/* The envelope takes the space above the names; see ABOVE_WORDS. */}
      <div style={ABOVE_WORDS}>
        {/*
          As wide as a phone allows, and no taller than about half the space it
          has: the flap and the letter rise above it as it opens, and on a short
          screen they need that room. Set a little below the middle for the same
          reason. A size container, so the tiles and the seal are sized off it.
        */}
        <div
          className="relative aspect-[10/7] w-[min(92vw,480px)] shrink-0 [container-type:inline-size]"
          style={{ width: "min(92cqw, 480px, calc(52cqh * 10 / 7))", marginTop: "12cqh" }}
        >
          <div className="absolute" style={shadowStyle} />

          <div
            className="absolute inset-0 animate-[lifafa-float_5.5s_ease-in-out_infinite] motion-reduce:animate-none"
            style={floatStyle}
          >
            {/* The inside of the envelope: lined, in its own shade, seen only once the flap is up. */}
            <div className="absolute inset-0" style={dropStyle(1)}>
              <div
                className="absolute inset-0 rounded-[6px] shadow-[0_18px_40px_-22px_rgba(0,0,0,0.6),0_2px_6px_-2px_rgba(0,0,0,0.2)]"
                style={liner(
                  "linear-gradient(180deg, rgba(20,2,4,0.5) 0%, rgba(20,2,4,0.28) 60%, rgba(20,2,4,0.4) 100%)",
                  "50% 0",
                )}
              />
            </div>

            {/*
              The flap's inside face, behind the letter: paper at its edge and
              the lining within, standing open above the envelope with the
              letter rising in front of it.
            */}
            <div className="absolute inset-0" style={dropStyle(1)}>
              <div className="absolute" style={flapInsideStyle}>
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: "polygon(0 100%, 100% 100%, 51.5% 2%, 48.5% 2%)",
                    ...paper("linear-gradient(0deg, rgba(0,0,0,0.12), rgba(0,0,0,0.02))", "30% 20%"),
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: "polygon(4.5% 100%, 95.5% 100%, 50.6% 10%, 49.4% 10%)",
                    ...liner(
                      "linear-gradient(0deg, rgba(20,2,4,0.34) 0%, rgba(20,2,4,0) 38%, rgba(255,240,210,0.06) 100%)",
                      "50% 100%",
                    ),
                  }}
                />
              </div>
            </div>

            {/* The letter: the card itself, in the card's own colours. */}
            <div className="absolute" style={letterExitStyle}>
              <div
                className="absolute inset-0 overflow-hidden rounded-[3px] [container-type:inline-size]"
                style={{
                  ...riseStyle,
                  backgroundColor: colors.ground,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.12), 0 8px 24px -12px rgba(0,0,0,0.35)",
                }}
              >
                {/* A double rule of leaf, inset from the edge. */}
                <div
                  className="absolute inset-[4.5%] rounded-[2px] border"
                  style={{ borderColor: colors.foil }}
                />
                <div
                  className="absolute inset-[6.5%] rounded-[1px] border"
                  style={{ borderColor: colors.foil, opacity: 0.55 }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-[3cqw] px-[12%] text-center">
                  <svg viewBox="0 0 80 12" className="w-[22%]" role="presentation" focusable="false">
                    <path d="M2 6 H30 M50 6 H78" stroke={colors.foil} strokeWidth="1" />
                    <path d="M40 1 L45 6 L40 11 L35 6 Z" fill={colors.foil} />
                    <circle cx="31.5" cy="6" r="1.4" fill={colors.foil} />
                    <circle cx="48.5" cy="6" r="1.4" fill={colors.foil} />
                  </svg>
                  {title !== undefined && title.length > 0 ? (
                    <span
                      className="block leading-[1.2] text-balance wrap-anywhere"
                      style={{ ...namesFont, color: colors.text, fontSize: "clamp(15px, 9cqw, 44px)" }}
                    >
                      {title}
                    </span>
                  ) : (
                    <span
                      className="block text-[clamp(18px,12cqw,54px)] leading-none"
                      style={{ ...namesFont, color: colors.text }}
                    >
                      ✦
                    </span>
                  )}
                  <svg viewBox="0 0 120 10" className="w-[34%]" role="presentation" focusable="false">
                    <path d="M4 5 H52 M68 5 H116" stroke={colors.foil} strokeWidth="0.9" />
                    <path d="M60 1 L64 5 L60 9 L56 5 Z" fill={colors.foil} />
                  </svg>
                </div>
              </div>
            </div>

            {/*
              The pocket, in front of the letter: two side folds and the bottom
              fold over them, each its own piece of the paper, started at a
              different place in the print so the folds do not line up as one
              flat sheet would.
            */}
            <div className="absolute inset-0" style={dropStyle(3)}>
              <div className="absolute inset-0 overflow-hidden rounded-[6px]">
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: `polygon(0 0, 50% ${pct(SIDE_MEET_Y, GRID_H)}, 0 100%)`,
                    ...paper("linear-gradient(90deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.16) 50%)", "12% 8%"),
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: `polygon(100% 0, 50% ${pct(SIDE_MEET_Y, GRID_H)}, 100% 100%)`,
                    ...paper("linear-gradient(270deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.16) 50%)", "70% 34%"),
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: `polygon(0 100%, 50% ${pct(BOTTOM_PEAK_Y, GRID_H)}, 100% 100%)`,
                    ...paper("linear-gradient(0deg, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0.06) 100%)", "40% 60%"),
                  }}
                />
                {/*
                  The folds themselves: the bottom fold's shade on the two
                  beneath it, soft, and a hair of light on its own edge.
                */}
                <svg
                  viewBox={`0 0 ${GRID_W} ${GRID_H}`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  role="presentation"
                  focusable="false"
                >
                  <defs>
                    <filter id={`${uid}-soft`} x="-5%" y="-10%" width="110%" height="120%">
                      <feGaussianBlur stdDeviation="3.2" />
                    </filter>
                    <clipPath id={`${uid}-above`}>
                      <path d={`M0 0 H${GRID_W} V${GRID_H} L${SEAL_X} ${BOTTOM_PEAK_Y} L0 ${GRID_H} Z`} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${uid}-above)`}>
                    <path
                      d={`M0 ${GRID_H} L${SEAL_X} ${BOTTOM_PEAK_Y} L${GRID_W} ${GRID_H}`}
                      fill="none"
                      stroke="#000000"
                      strokeWidth="9"
                      opacity="0.34"
                      filter={`url(#${uid}-soft)`}
                    />
                  </g>
                  <path
                    d={`M0 ${GRID_H} L${SEAL_X} ${BOTTOM_PEAK_Y} L${GRID_W} ${GRID_H}`}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="0.8"
                    opacity="0.22"
                  />
                </svg>
              </div>
            </div>

            {/*
              The flap's outside face, in front of the letter: shut over the
              pocket until the seal lets it go. Its shade falls on the pocket,
              and a thin line of gold runs just inside its edge.
            */}
            <div className="absolute inset-0" style={dropStyle(4)}>
              <div className="absolute" style={flapOutsideStyle}>
                <svg
                  viewBox={`0 0 ${GRID_W} ${FLAP_H}`}
                  preserveAspectRatio="none"
                  overflow="visible"
                  className="absolute inset-0 h-full w-full"
                  role="presentation"
                  focusable="false"
                >
                  <defs>
                    <filter id={`${uid}-lift`} x="-10%" y="-10%" width="120%" height="140%">
                      <feGaussianBlur stdDeviation="5" />
                    </filter>
                  </defs>
                  <path
                    d={`M4 6 L${GRID_W - 4} 6 L${SEAL_X} ${FLAP_H + 4} Z`}
                    fill="#000000"
                    opacity="0.4"
                    filter={`url(#${uid}-lift)`}
                  />
                </svg>
                <div
                  className="absolute inset-0"
                  style={{
                    clipPath: "polygon(1.5% 0, 98.5% 0, 100% 3.5%, 51.5% 98%, 48.5% 98%, 0 3.5%)",
                    ...paper(
                      "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 30%, rgba(255,255,255,0.07) 100%)",
                      "56% 4%",
                    ),
                  }}
                />
                <svg
                  viewBox={`0 0 ${GRID_W} ${FLAP_H}`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  role="presentation"
                  focusable="false"
                >
                  <defs>
                    <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor={GOLD_LO} />
                      <stop offset="0.28" stopColor={GOLD_HI} />
                      <stop offset="0.5" stopColor={GOLD} />
                      <stop offset="0.72" stopColor={GOLD_HI} />
                      <stop offset="1" stopColor={GOLD_LO} />
                    </linearGradient>
                  </defs>
                  <path
                    d={`M13 5 L${SEAL_X} ${FLAP_H - 13} L${GRID_W - 13} 5`}
                    fill="none"
                    stroke={`url(#${uid}-gold)`}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>

            {/*
              The wax seal, on the flap's point. A size container, so the
              monogram is sized off the seal and fits its centre on any screen.
            */}
            <div className="absolute z-[8] [container-type:inline-size]" style={sealBox}>
              <div
                className="absolute inset-0 animate-[lifafa-seal-pulse_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
                style={floatStyle}
              >
                <div className="absolute inset-0" style={peelStyle}>
                  {/* The wax's own shadow on the paper. */}
                  <div
                    className="absolute inset-[3%] translate-x-[2%] translate-y-[5%] rounded-full"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0) 72%)",
                    }}
                  />
                  {/*
                    Decoded before it is painted: the shell's loader has
                    already waited for it, and a late decode here would be the
                    seal arriving a frame after the envelope.
                  */}
                  <img
                    src={art.seal}
                    alt=""
                    decoding="sync"
                    draggable={false}
                    className="absolute inset-0 h-full w-full select-none"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {pairLetters.length === 2 ? (
                      <span
                        data-seal-monogram=""
                        className="leading-none whitespace-nowrap"
                        style={{
                          ...headingFont,
                          fontSize: PAIR_SIZE,
                          color: GOLD,
                          textShadow: EMBOSS,
                        }}
                      >
                        {pairLetters[0]}
                        <span className="mx-[0.16em] text-[0.74em]">&amp;</span>
                        {pairLetters[1]}
                      </span>
                    ) : pairLetters.length === 1 || lineLetters.length > 0 ? (
                      <span
                        data-seal-monogram=""
                        className="leading-none whitespace-nowrap"
                        style={{
                          ...headingFont,
                          fontSize:
                            pairLetters.length === 1 || lineLetters.length === 1
                              ? SINGLE_SIZE
                              : "20cqw",
                          letterSpacing: "0.04em",
                          color: GOLD,
                          textShadow: EMBOSS,
                        }}
                      >
                        {pairLetters[0] ?? lineLetters}
                      </span>
                    ) : (
                      /* Nobody named: a small flower in the same gold. See GoldFlower. */
                      <GoldFlower
                        hi={GOLD_HI}
                        body={GOLD}
                        lo={GOLD_LO}
                        className="w-[30%] drop-shadow-[0_1px_0.5px_rgba(52,6,8,0.85)]"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
