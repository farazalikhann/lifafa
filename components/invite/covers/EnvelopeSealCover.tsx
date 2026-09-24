"use client";

import { useId, type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { initialsOf } from "@/components/invite/covers/initials";
import { stage } from "@/components/invite/covers/timing";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * Overlapping rather than end to end. The seal cracks and the ribbon falls away
 * together, the flap starts to lift while the halves of the seal are still in
 * the air, the letter rises before the flap has landed, and the envelope falls
 * away while the letter is still coming towards the guest. Paper does not stop
 * between one movement and the next, so nothing here waits for anything. The
 * last stage ends on exactly 1, so nothing is moving when the shell unmounts.
 */
const CRACK_START = 0;
const CRACK_SHARE = 0.26;
const SPARK_START = 0.02;
const SPARK_SHARE = 0.34;
const RIBBON_START = 0.03;
const RIBBON_SHARE = 0.2;
const FLAP_START = 0.12;
const FLAP_SHARE = 0.3;
const RISE_START = 0.36;
const RISE_SHARE = 0.3;
const DROP_START = 0.56;
const DROP_SHARE = 0.34;
/* The pocket is gone before the letter grows past it, since it sits in front. */
const DROP_FADE_SHARE = 0.16;
const ZOOM_START = 0.64;
const ZOOM_SHARE = 0.36;
const BACKDROP_START = 0.7;
const BACKDROP_SHARE = 0.3;

/** Slow off the fold, quick through the middle, slow onto the back. */
const FLAP_EASE = "cubic-bezier(0.6,0,0.35,1)";

/** The halves of the seal: flung, then falling. */
const CRACK_EASE = "cubic-bezier(0.2,0.7,0.5,1)";

/** Everything the envelope is made of falls away on this curve. */
const DROP_EASE = "cubic-bezier(0.55,0,0.75,0.4)";

/** The letter coming up to meet the guest, easing into place as it arrives. */
const ZOOM_EASE = "cubic-bezier(0.3,0,0.15,1)";

/**
 * The envelope is drawn on a 400 × 280 grid, the proportions of a good
 * invitation envelope. Every piece is its own element placed on that grid in
 * percentages, so the envelope keeps its shape at any width.
 */
const GRID_W = 400;
const GRID_H = 280;

function box(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: `${(x / GRID_W) * 100}%`,
    top: `${(y / GRID_H) * 100}%`,
    width: `${(width / GRID_W) * 100}%`,
    height: `${(height / GRID_H) * 100}%`,
  };
}

/** Where the flap's point closes, and the seal sits over it. */
const SEAL_X = 200;
const SEAL_Y = 158;
const SEAL_SIZE = 104;

/**
 * The seal's outline: a disc of wax that spread as it was pressed, so its edge
 * wanders rather than being drawn with a compass. Fixed numbers, worked out
 * once, so the server and the browser draw the same seal.
 */
const WAX_EDGE: string = (() => {
  const lobes = 22;
  const points = Array.from({ length: lobes }, (_, index) => {
    const angle = (index / lobes) * Math.PI * 2;
    const radius =
      46 * (1 + 0.035 * Math.sin(index * 2.7) + 0.025 * Math.cos(index * 5.3));
    return [50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius];
  });
  const mid = (a: number[], b: number[]): string =>
    `${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`;
  const start = mid(points[lobes - 1], points[0]);

  return `M${start} ${points
    .map(
      (point, index) =>
        `Q${point[0].toFixed(2)} ${point[1].toFixed(2)} ${mid(point, points[(index + 1) % lobes])}`,
    )
    .join(" ")} Z`;
})();

/**
 * The line the seal breaks along, as the two halves' clip paths: ragged, as
 * wax cracks, and each half the other's exact complement so nothing is lost
 * or doubled down the seam.
 */
const CRACK = ["52% 0", "46% 20%", "57% 38%", "44% 58%", "55% 76%", "47% 100%"];
const LEFT_HALF = `polygon(0 0, ${CRACK.join(", ")}, 0 100%)`;
const RIGHT_HALF = `polygon(${CRACK.join(", ")}, 100% 100%, 100% 0)`;

/** The flecks of gold thrown off by the break: angle in degrees, distance in px. */
const SPARKS: readonly { angle: number; distance: number; size: number; delay: number }[] = [
  { angle: -90, distance: 150, size: 12, delay: 0 },
  { angle: -58, distance: 128, size: 8, delay: 0.02 },
  { angle: -26, distance: 160, size: 11, delay: 0.01 },
  { angle: 4, distance: 118, size: 7, delay: 0.04 },
  { angle: 34, distance: 140, size: 10, delay: 0.02 },
  { angle: 66, distance: 104, size: 7, delay: 0.05 },
  { angle: 108, distance: 112, size: 8, delay: 0.03 },
  { angle: 142, distance: 146, size: 10, delay: 0.01 },
  { angle: 176, distance: 124, size: 7, delay: 0.04 },
  { angle: 206, distance: 158, size: 11, delay: 0.02 },
  { angle: 236, distance: 120, size: 8, delay: 0.05 },
  { angle: 262, distance: 172, size: 9, delay: 0.03 },
];

/** Both spellings, because Safari before 15.4 only honours the prefixed one. */
const HIDE_BACKFACE: CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/**
 * The envelope a guest tears open.
 *
 * DRESSED, NOT DRAWN IN OUTLINE. It used to be the card's ground with a little
 * ink mixed in, at a fifth of the screen, with a flat disc for a seal — a grey
 * shape on a grey page, and the first thing a guest saw of the invitation. Now
 * it is card stock with a lining printed inside, a band of metal leaf round it,
 * a satin ribbon, and a seal of real-looking wax with the couple's initials
 * pressed into it. Every colour is still the card's own; see the dressed tones
 * in lib/coverPalette.ts.
 *
 * LAYERS, NOT ONE DRAWING. Each moving piece is an HTML element holding its own
 * small SVG, which the browser moves on the compositor in real perspective.
 * Browsers do not composite individual SVG shapes, and Chrome flattens 3D
 * transforms on SVG children, so a single drawing both stuttered and never
 * swung its flap. Back to front: the lined inside, the flap's inside face, the
 * letter, the pocket, the flap's outside face, the ribbon, the seal and the
 * gold it throws off.
 *
 * THE FLAP IS TWO LAYERS, and nothing ever changes places in the stack. The
 * outside face is above the letter and the inside face below it, both turning
 * through the same half revolution with their backs hidden, so the hand-off at
 * 90° is the browser's own backface culling.
 *
 * THE OPEN, in the order a guest sees it: the seal cracks in two and the halves
 * fly off, gold leaf scatters from the break, the ribbon falls away, the flap
 * swings up to show its lining, the letter rises with the couple's names on it
 * and comes towards the guest, and the envelope falls out from under it. The
 * letter is cut from the card's own ground, so it dissolves into the real
 * card underneath without changing colour on the way.
 *
 * It never takes a pointer event — the shell's button is the whole click
 * surface — so this is only ever a picture of what tapping does.
 */
export default function EnvelopeSealCover({
  phase,
  option,
  reducedMotion,
  colors,
  title,
  namesFont,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const initials = initialsOf(title);
  /* Gradient ids are document-wide; anything but a plain name breaks url(#…). */
  const uid = `env${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const ids = {
    liner: `${uid}-liner`,
    stock: `${uid}-stock`,
    stockSide: `${uid}-stock-side`,
    flap: `${uid}-flap`,
    foil: `${uid}-foil`,
    ribbon: `${uid}-ribbon`,
    wax: `${uid}-wax`,
    lift: `${uid}-lift`,
  };

  /*
    Every transition below is a fraction of this, so the drawing cannot drift
    out of step with the setTimeout that unmounts it.
  */
  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  /* A keyframe run that starts on the tap, sized to the same timer. */
  const onOpen = (name: string, share: number, start: number, easing: string): string | undefined =>
    opening && !reducedMotion
      ? `${name} calc(var(--cover-ms)*${share}) ${easing} calc(var(--cover-ms)*${start}) both`
      : undefined;

  /* The card's ground, held over the card until the envelope has gone. */
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

  /* Back, pocket, flap and ribbon all fall away together once the letter is out. */
  const dropStyle = (zIndex: number): CSSProperties => ({
    zIndex,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", DROP_SHARE, DROP_START, DROP_EASE),
      stage("opacity", DROP_FADE_SHARE, DROP_START, "ease-in"),
    ),
    transform: opening ? "translate3d(0, 34%, 0)" : "translate3d(0, 0, 0)",
    opacity: opening ? 0 : 1,
  });

  /*
    Hinged on its top edge and swung towards the guest, all the way over. The
    perspective is in the transform itself, so the 3D depends on nothing above.
  */
  const flapStyle: CSSProperties = {
    ...box(0, 0, GRID_W, 172),
    transformOrigin: "50% 0%",
    transformStyle: "preserve-3d",
    willChange: "transform",
    transition: transition(stage("transform", FLAP_SHARE, FLAP_START, FLAP_EASE)),
    transform: opening
      ? "perspective(1100px) rotateX(180deg)"
      : "perspective(1100px) rotateX(0deg)",
  };

  /* The letter coming up out of the pocket… */
  const riseStyle: CSSProperties = {
    willChange: "transform",
    transition: transition(stage("transform", RISE_SHARE, RISE_START, "cubic-bezier(0.4,0,0.2,1)")),
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
      stage("opacity", ZOOM_SHARE * 0.62, ZOOM_START + ZOOM_SHARE * 0.12, "ease-in"),
    ),
    transform: opening ? "translate3d(0, 70%, 0) scale(1.75)" : "none",
    opacity: opening ? 0 : 1,
  };

  /* The ribbon's two ends, cut by the break and slipping away to each side. */
  const ribbonEnd = (side: -1 | 1): CSSProperties => ({
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", RIBBON_SHARE, RIBBON_START, "cubic-bezier(0.4,0,1,1)"),
      stage("opacity", RIBBON_SHARE, RIBBON_START, "ease-in"),
    ),
    transform: opening
      ? `translate3d(${side * 18}%, 22%, 0) rotate(${side * 7}deg)`
      : "none",
    opacity: opening ? 0 : 1,
  });

  /* A half of the seal, flung off its side of the crack and turning as it falls. */
  const sealHalf = (side: -1 | 1): CSSProperties => ({
    clipPath: side < 0 ? LEFT_HALF : RIGHT_HALF,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", CRACK_SHARE, CRACK_START, CRACK_EASE),
      stage("opacity", CRACK_SHARE * 0.6, CRACK_START + CRACK_SHARE * 0.4, "ease-in"),
    ),
    transform: opening
      ? `translate3d(${side * 70}%, 60%, 0) rotate(${side * 38}deg) scale(0.86)`
      : "none",
    opacity: opening ? 0 : 1,
  });

  /* The sprig tucked under the seal, loosed with it. */
  const sprigStyle: CSSProperties = {
    transition: transition(stage("opacity", CRACK_SHARE * 0.5, CRACK_START, "ease-in")),
    opacity: opening ? 0 : 1,
  };

  /* The sheen on the leaf and the ribbon stops the moment the guest taps. */
  const sheenStyle: CSSProperties = {
    transition: transition(stage("opacity", 0.08, 0, "ease-out")),
    opacity: opening ? 0 : 1,
  };

  /* A shadow stays a shadow on every palette. It goes when the envelope does. */
  const shadowStyle: CSSProperties = {
    ...box(10, 244, 380, 70),
    backgroundImage:
      "radial-gradient(ellipse at center, rgba(0,0,0,0.26) 0%, rgba(0,0,0,0) 68%)",
    transition: transition(stage("opacity", DROP_SHARE * 0.6, DROP_START, "ease-out")),
    opacity: opening ? 0 : 1,
  };

  const sealBox = box(SEAL_X - SEAL_SIZE / 2, SEAL_Y - SEAL_SIZE / 2, SEAL_SIZE, SEAL_SIZE);

  /* The seal's own drawing, used whole for its two halves. */
  const sealArt = (
    <svg
      viewBox="0 0 100 100"
      overflow="visible"
      className="absolute inset-0 h-full w-full"
      role="presentation"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${ids.wax}-${"x"}`} cx="38%" cy="32%" r="72%">
          <stop offset="0" stopColor={colors.waxHi} />
          <stop offset="0.45" stopColor={colors.wax} />
          <stop offset="1" stopColor={colors.waxLo} />
        </radialGradient>
      </defs>
      {/* The wax's own shadow on the paper. */}
      <path d={WAX_EDGE} fill="rgba(0,0,0,0.28)" transform="translate(2.5 4)" />
      <path d={WAX_EDGE} fill={`url(#${ids.wax}-x)`} />
      {/* The pressed ring, sunk into the wax: a dark lip and a lit one. */}
      <circle cx="50" cy="50" r="31" fill="none" stroke={colors.waxLo} strokeWidth="3" opacity="0.7" />
      <circle cx="50.8" cy="51.2" r="31" fill="none" stroke={colors.waxHi} strokeWidth="1.2" opacity="0.55" />
      <circle cx="50" cy="50" r="26" fill={colors.waxLo} opacity="0.16" />
      {initials.length > 0 ? (
        <g style={namesFont}>
          <text
            x="50"
            y="52"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={initials.length > 1 ? 25 : 30}
            fill={colors.waxLo}
            opacity="0.9"
          >
            {initials}
          </text>
          <text
            x="49.2"
            y="50.8"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={initials.length > 1 ? 25 : 30}
            fill={colors.waxHi}
            opacity="0.85"
          >
            {initials}
          </text>
        </g>
      ) : (
        /* No usable name: a pressed diamond, the product's own mark. */
        <g>
          <path d="M50 34 L63 50 L50 66 L37 50 Z" fill={colors.waxLo} opacity="0.7" transform="translate(0.8 1)" />
          <path d="M50 34 L63 50 L50 66 L37 50 Z" fill={colors.waxHi} opacity="0.7" />
        </g>
      )}
      {/* A glint on the crown of the wax. */}
      <ellipse cx="36" cy="30" rx="10" ry="5" fill="#FFFFFF" opacity="0.28" transform="rotate(-30 36 30)" />
    </svg>
  );

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-5 pb-[14vh]"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      {/* A soft pool of light behind the envelope, so it sits in the room. */}
      <div
        className="absolute top-[40%] left-1/2 aspect-square w-[130vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          backgroundImage: `radial-gradient(circle, ${colors.foilHi} 0%, transparent 62%)`,
          opacity: colors.isLight ? 0.35 : 0.14,
          transition: transition(stage("opacity", 0.3, 0.6, "ease-out")),
          ...(opening ? { opacity: 0 } : null),
        }}
      />

      <div className="relative aspect-[10/7] w-full max-w-[min(92vw,480px)]">
        <div className="absolute" style={shadowStyle} />

        <div
          className="absolute inset-0 animate-[lifafa-float_5.5s_ease-in-out_infinite] motion-reduce:animate-none"
          style={floatStyle}
        >
          {/* The inside of the envelope: lined, seen only once the flap is up. */}
          <div className="absolute inset-0" style={dropStyle(1)}>
            <svg
              viewBox={`0 0 ${GRID_W} ${GRID_H}`}
              className="absolute inset-0 h-full w-full"
              role="presentation"
              focusable="false"
            >
              <defs>
                <pattern id={ids.liner} width="22" height="22" patternUnits="userSpaceOnUse">
                  <rect width="22" height="22" fill={colors.liner} />
                  <path
                    d="M11 1 L21 11 L11 21 L1 11 Z"
                    fill="none"
                    stroke={colors.linerInk}
                    strokeWidth="0.9"
                    opacity="0.55"
                  />
                  <circle cx="11" cy="11" r="1.6" fill={colors.linerInk} opacity="0.7" />
                  <circle cx="0" cy="0" r="1.1" fill={colors.linerInk} opacity="0.5" />
                  <circle cx="22" cy="22" r="1.1" fill={colors.linerInk} opacity="0.5" />
                </pattern>
              </defs>
              <rect x="0" y="0" width={GRID_W} height={GRID_H} rx="6" fill={`url(#${ids.liner})`} />
              <rect
                x="0"
                y="0"
                width={GRID_W}
                height={GRID_H}
                rx="6"
                fill="none"
                stroke={colors.stockLo}
                strokeWidth="2"
              />
            </svg>
          </div>

          {/*
            The flap's inside face, behind the letter: its lining. Turned away
            from the guest until the flap passes edge on, and only seen after
            that, standing open above the envelope with the letter rising in
            front of it. Drawn point up and turned half a revolution in place,
            so after the flap's own half turn it stands upright on the hinge.
          */}
          <div className="absolute inset-0" style={dropStyle(1)}>
            <div className="absolute" style={flapStyle}>
              <svg
                viewBox={`0 0 ${GRID_W} 172`}
                preserveAspectRatio="none"
                overflow="visible"
                className="absolute inset-0 h-full w-full"
                style={{ ...HIDE_BACKFACE, transform: "rotateX(180deg)" }}
                role="presentation"
                focusable="false"
              >
                <defs>
                  <pattern id={`${ids.liner}-f`} width="22" height="22" patternUnits="userSpaceOnUse">
                    <rect width="22" height="22" fill={colors.liner} />
                    <path
                      d="M11 1 L21 11 L11 21 L1 11 Z"
                      fill="none"
                      stroke={colors.linerInk}
                      strokeWidth="0.9"
                      opacity="0.55"
                    />
                    <circle cx="11" cy="11" r="1.6" fill={colors.linerInk} opacity="0.7" />
                  </pattern>
                </defs>
                <path
                  d={`M0 172 L${GRID_W} 172 L206 6 Q200 0 194 6 Z`}
                  fill={colors.stock}
                />
                <path
                  d={`M12 172 L${GRID_W - 12} 172 L204 18 Q200 13 196 18 Z`}
                  fill={`url(#${ids.liner}-f)`}
                />
              </svg>
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

          {/* The pocket and side panels, in front of the letter. */}
          <div className="absolute inset-0" style={dropStyle(3)}>
            <div
              className="absolute inset-0 rounded-[6px]"
              style={{ boxShadow: "0 18px 40px -22px rgba(0,0,0,0.55), 0 2px 6px -2px rgba(0,0,0,0.18)" }}
            />
            <svg
              viewBox={`0 0 ${GRID_W} ${GRID_H}`}
              className="absolute inset-0 h-full w-full"
              role="presentation"
              focusable="false"
            >
              <defs>
                <linearGradient id={ids.stockSide} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={colors.stockHi} />
                  <stop offset="1" stopColor={colors.stockLo} />
                </linearGradient>
                <linearGradient id={ids.stock} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={colors.stock} />
                  <stop offset="1" stopColor={colors.stockHi} />
                </linearGradient>
                <linearGradient id={ids.foil} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor={colors.foilLo} />
                  <stop offset="0.3" stopColor={colors.foilHi} />
                  <stop offset="0.55" stopColor={colors.foil} />
                  <stop offset="0.8" stopColor={colors.foilHi} />
                  <stop offset="1" stopColor={colors.foilLo} />
                </linearGradient>
              </defs>
              <path d={`M0 6 Q0 0 6 0 L${SEAL_X} 150 L0 ${GRID_H} Z`} fill={`url(#${ids.stockSide})`} />
              <path
                d={`M${GRID_W} 6 Q${GRID_W} 0 ${GRID_W - 6} 0 L${SEAL_X} 150 L${GRID_W} ${GRID_H} Z`}
                fill={`url(#${ids.stockSide})`}
              />
              <path
                d={`M0 ${GRID_H - 6} L${SEAL_X} 124 L${GRID_W} ${GRID_H - 6} Q${GRID_W} ${GRID_H} ${GRID_W - 6} ${GRID_H} L6 ${GRID_H} Q0 ${GRID_H} 0 ${GRID_H - 6} Z`}
                fill={`url(#${ids.stock})`}
              />
              {/* The crease where the bottom fold meets the sides, catching the light. */}
              <path
                d={`M2 ${GRID_H - 4} L${SEAL_X} 124 L${GRID_W - 2} ${GRID_H - 4}`}
                fill="none"
                stroke={colors.stockLo}
                strokeWidth="1.2"
                opacity="0.8"
              />
              {/* A line of leaf along the bottom fold. */}
              <path
                d={`M22 ${GRID_H - 12} L${SEAL_X} 140 L${GRID_W - 22} ${GRID_H - 12}`}
                fill="none"
                stroke={`url(#${ids.foil})`}
                strokeWidth="1.6"
              />
              {/* Metal leaf round the whole front, the envelope's own frame. */}
              <rect
                x="7"
                y="7"
                width={GRID_W - 14}
                height={GRID_H - 14}
                rx="3"
                fill="none"
                stroke={`url(#${ids.foil})`}
                strokeWidth="1.4"
                opacity="0.9"
              />
              <rect
                x="0.75"
                y="0.75"
                width={GRID_W - 1.5}
                height={GRID_H - 1.5}
                rx="6"
                fill="none"
                stroke={colors.stockLo}
                strokeWidth="1.5"
              />
            </svg>
          </div>

          {/*
            The flap's outside face, in front of the letter: shut over the
            pocket until the seal lets it go, and turned away from the guest
            from the moment it passes edge on. Its shadow falls on the pocket.
          */}
          <div className="absolute inset-0" style={dropStyle(4)}>
            <div className="absolute" style={flapStyle}>
              <svg
                viewBox={`0 0 ${GRID_W} 172`}
                preserveAspectRatio="none"
                overflow="visible"
                className="absolute inset-0 h-full w-full"
                style={HIDE_BACKFACE}
                role="presentation"
                focusable="false"
              >
                <defs>
                  <linearGradient id={ids.flap} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={colors.stockLo} />
                    <stop offset="0.35" stopColor={colors.stock} />
                    <stop offset="1" stopColor={colors.stockHi} />
                  </linearGradient>
                  <filter id={ids.lift} x="-10%" y="-10%" width="120%" height="140%">
                    <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000000" floodOpacity="0.28" />
                  </filter>
                </defs>
                <path
                  d={`M0 6 Q0 0 6 0 L${GRID_W - 6} 0 Q${GRID_W} 0 ${GRID_W} 6 L206 166 Q200 172 194 166 Z`}
                  fill={`url(#${ids.flap})`}
                  filter={`url(#${ids.lift})`}
                />
                <path d={`M16 8 L200 152 L${GRID_W - 16} 8`} fill="none" stroke={colors.foil} strokeWidth="1.4" strokeLinejoin="round" opacity="0.9" />
              </svg>
            </div>
          </div>

          {/* The satin ribbon round the envelope, cut when the seal breaks. */}
          <div className="absolute inset-0 z-[5] overflow-hidden rounded-[6px]" style={dropStyle(5)}>
            {([-1, 1] as const).map((side) => (
              <div
                key={side}
                className="absolute"
                style={{
                  ...box(side < 0 ? 0 : SEAL_X, SEAL_Y - 13, SEAL_X, 26),
                  ...ribbonEnd(side),
                }}
              >
                <svg
                  viewBox={`0 0 ${SEAL_X} 26`}
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  role="presentation"
                  focusable="false"
                >
                  <defs>
                    <linearGradient id={`${ids.ribbon}-${side}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={colors.foilLo} />
                      <stop offset="0.28" stopColor={colors.foilHi} />
                      <stop offset="0.6" stopColor={colors.foil} />
                      <stop offset="1" stopColor={colors.foilLo} />
                    </linearGradient>
                  </defs>
                  <rect x="0" y="0" width={SEAL_X} height="26" fill={`url(#${ids.ribbon}-${side})`} />
                  <path d={`M0 3.5 H${SEAL_X} M0 22.5 H${SEAL_X}`} stroke={colors.foilLo} strokeWidth="0.8" opacity="0.6" />
                </svg>
              </div>
            ))}

            {/* Light running along the leaf and the satin, now and then. */}
            <div className="absolute inset-0" style={sheenStyle}>
              <div
                className="absolute inset-y-0 left-0 w-1/3 animate-[lifafa-cover-sheen_4.8s_ease-in-out_1.2s_infinite] motion-reduce:animate-none"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.32) 50%, rgba(255,255,255,0) 100%)",
                  mixBlendMode: "soft-light",
                  transform: "translate3d(-130%, 0, 0)",
                }}
              />
            </div>
          </div>

          {/* The glow behind the seal, so it reads as the thing to tap. */}
          <div
            className="absolute z-[6]"
            style={{
              ...box(SEAL_X - 90, SEAL_Y - 90, 180, 180),
              ...sheenStyle,
            }}
          >
            <div
              className="absolute inset-0 rounded-full animate-[lifafa-cover-halo_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{ backgroundImage: `radial-gradient(circle, ${colors.foilHi} 0%, transparent 60%)` }}
            />
          </div>

          {/* A sprig of leaf tucked under the wax, either side. */}
          <div className="absolute z-[7]" style={{ ...box(SEAL_X - 92, SEAL_Y - 40, 184, 80), ...sprigStyle }}>
            <svg viewBox="0 0 184 80" className="absolute inset-0 h-full w-full" role="presentation" focusable="false">
              {([-1, 1] as const).map((side) => (
                <g key={side} transform={side < 0 ? undefined : "translate(184 0) scale(-1 1)"}>
                  <path d="M92 44 C70 42 44 34 18 22" fill="none" stroke={colors.foilLo} strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M40 30 C34 18 42 10 52 10 C52 22 48 28 40 30 Z" fill={colors.foil} />
                  <path d="M28 25 C18 26 12 18 14 10 C24 12 28 18 28 25 Z" fill={colors.foilHi} />
                  <path d="M58 37 C56 50 44 54 36 50 C42 42 50 38 58 37 Z" fill={colors.foil} opacity="0.9" />
                  <path d="M70 40 C72 28 82 24 88 26 C84 36 78 40 70 40 Z" fill={colors.foilHi} opacity="0.9" />
                  <circle cx="17" cy="21" r="2.4" fill={colors.foilHi} />
                </g>
              ))}
            </svg>
          </div>

          {/* The wax seal: two halves of one drawing, split along the crack. */}
          <div className="absolute z-[8]" style={sealBox}>
            <div
              className="absolute inset-0 animate-[lifafa-seal-pulse_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
              style={floatStyle}
            >
              <div className="absolute inset-0" style={sealHalf(-1)}>
                {sealArt}
              </div>
              <div className="absolute inset-0" style={sealHalf(1)}>
                {sealArt}
              </div>
            </div>

            {/* The flash as the wax gives way. */}
            <div
              className="absolute -inset-[60%] rounded-full opacity-0"
              style={{
                backgroundImage: `radial-gradient(circle, ${colors.foilHi} 0%, transparent 58%)`,
                animation: onOpen("lifafa-cover-flash", 0.34, 0, "cubic-bezier(0.2,0.6,0.4,1)"),
              }}
            />

            {/* Gold leaf thrown off the break. */}
            {SPARKS.map((spark, index) => {
              const radians = (spark.angle * Math.PI) / 180;

              return (
                <span
                  key={index}
                  className="absolute top-1/2 left-1/2 opacity-0"
                  style={
                    {
                      width: spark.size,
                      height: spark.size,
                      marginLeft: -spark.size / 2,
                      marginTop: -spark.size / 2,
                      "--dx": `${Math.round(Math.cos(radians) * spark.distance)}px`,
                      "--dy": `${Math.round(Math.sin(radians) * spark.distance)}px`,
                      animation: onOpen(
                        "lifafa-cover-spark",
                        SPARK_SHARE,
                        SPARK_START + spark.delay,
                        "cubic-bezier(0.15,0.7,0.4,1)",
                      ),
                    } as CSSProperties
                  }
                >
                  <svg viewBox="0 0 10 10" className="h-full w-full" role="presentation" focusable="false">
                    <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={index % 3 === 0 ? colors.foilHi : colors.foil} />
                  </svg>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
