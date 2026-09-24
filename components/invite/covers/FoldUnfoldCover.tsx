"use client";

import { useId, type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { initialsOf } from "@/components/invite/covers/initials";
import { ABOVE_WORDS } from "@/components/invite/covers/layout";
import { stage } from "@/components/invite/covers/timing";
import type { CoverPalette } from "@/lib/coverPalette";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * The ribbon slips off as the cover starts to turn, the spread slides to the
 * middle and settles back to fit the screen while the cover is still turning,
 * gold rises off the spine as it lands, and the opened card comes towards the
 * guest before it has quite come to rest. The last stage ends on exactly 1.
 */
const RIBBON_START = 0;
const RIBBON_SHARE = 0.16;
const OPEN_START = 0.06;
const OPEN_SHARE = 0.46;
const SPARK_START = 0.3;
const SPARK_SHARE = 0.34;
const EXIT_START = 0.56;
const EXIT_SHARE = 0.44;
const BACKDROP_START = 0.62;
const BACKDROP_SHARE = 0.38;

/** Slow off the spine, quick through the middle, and settling flat. */
const OPEN_EASE = "cubic-bezier(0.5,0,0.2,1)";

/**
 * The cover's angles. At rest it stands a little open, which is what says
 * "this opens" without a word; opened, it lies flat on the left.
 */
const COVER_RESTING = -16;
const COVER_OPEN = -180;

/**
 * How far the opened spread settles back, so two panels fit a phone that one
 * panel nearly filled, and where the right-hand panel then sits: the point
 * the open card comes towards the guest about.
 */
const SPREAD_FIT = 0.74;
const RIGHT_PANEL_CENTRE = 50 + 25 * SPREAD_FIT;

/**
 * The spread is drawn on a 400 × 280 grid: two 5 × 7 panels side by side, the
 * spine at x = 200. The closed card is the right-hand panel.
 */
function box(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    left: `${(x / 400) * 100}%`,
    top: `${(y / 280) * 100}%`,
    width: `${(width / 400) * 100}%`,
    height: `${(height / 280) * 100}%`,
  };
}

/** Both spellings, because Safari before 15.4 only honours the prefixed one. */
const HIDE_BACKFACE: CSSProperties = {
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
};

/** Flecks of gold rising off the spine as the card lies open. */
const SPARKS: readonly { dx: number; dy: number; size: number; delay: number }[] = [
  { dx: -70, dy: -120, size: 9, delay: 0 },
  { dx: -30, dy: -160, size: 12, delay: 0.03 },
  { dx: 10, dy: -140, size: 8, delay: 0.01 },
  { dx: 46, dy: -170, size: 11, delay: 0.04 },
  { dx: 84, dy: -110, size: 8, delay: 0.02 },
  { dx: -96, dy: -60, size: 7, delay: 0.05 },
  { dx: 104, dy: -54, size: 7, delay: 0.03 },
  { dx: -8, dy: -200, size: 9, delay: 0.06 },
];

/** A curl of filigree for one corner of a panel, drawn for the top left. */
function Filigree({ colors, transform }: { colors: CoverPalette; transform?: string }): ReactElement {
  return (
    <g transform={transform} fill="none" stroke={colors.foil} strokeLinecap="round">
      <path d="M14 44 C14 26 26 14 44 14" strokeWidth="1.3" />
      <path d="M14 30 C18 22 22 18 30 14" strokeWidth="0.9" opacity="0.8" />
      <path d="M22 44 C24 36 30 30 38 30 C44 30 46 36 42 40 C38 44 32 40 34 36" strokeWidth="1" />
      <path d="M44 22 C36 24 30 30 30 38" strokeWidth="0.8" opacity="0.7" />
      <circle cx="14" cy="14" r="2.2" fill={colors.foil} stroke="none" />
      <circle cx="50" cy="14" r="1.3" fill={colors.foil} stroke="none" />
      <circle cx="14" cy="50" r="1.3" fill={colors.foil} stroke="none" />
    </g>
  );
}

/** A panel's frame of leaf: a double rule inset from the edge, and the four corners. */
function PanelFrame({ colors }: { colors: CoverPalette }): ReactElement {
  return (
    <>
      <rect x="9" y="9" width="182" height="262" rx="2" fill="none" stroke={colors.foil} strokeWidth="1.3" />
      <rect x="14" y="14" width="172" height="252" rx="1" fill="none" stroke={colors.foil} strokeWidth="0.6" opacity="0.7" />
      <Filigree colors={colors} />
      <Filigree colors={colors} transform="translate(200 0) scale(-1 1)" />
      <Filigree colors={colors} transform="translate(0 280) scale(1 -1)" />
      <Filigree colors={colors} transform="translate(200 280) scale(-1 -1)" />
    </>
  );
}

/**
 * A folded card that opens like a book, one panel at a time.
 *
 * DRESSED, NOT BLANK. The folded card used to be a small grey rectangle with a
 * diamond on it, opening onto two more grey rectangles. It is card stock now,
 * framed in metal leaf with filigree in the corners, the couple's initials in a
 * medallion on the front and a silk ribbon tied round it; it opens onto a
 * printed lining on the left and the couple's names on the right. Every colour
 * is the card's own — see the dressed tones in lib/coverPalette.ts.
 *
 * THE OPEN. The ribbon slips off, the cover turns over on its spine to show
 * its lining, the spread slides to the middle of the screen and settles to fit
 * it, gold rises off the spine, and the names come towards the guest and
 * dissolve into the real card underneath — the right-hand panel is cut from
 * the card's own ground, so nothing changes colour on the way.
 *
 * The cover is two faces turning together with their backs hidden, so which
 * one the guest sees is the browser's own backface culling at 90°, and nothing
 * in the stack ever changes places.
 */
export default function FoldUnfoldCover({
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
  const uid = `fold${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  const onOpen = (name: string, share: number, start: number, easing: string): string | undefined =>
    opening && !reducedMotion
      ? `${name} calc(var(--cover-ms)*${share}) ${easing} calc(var(--cover-ms)*${start}) both`
      : undefined;

  /* The card's ground, held over the card until the fold has come forward. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(stage("opacity", BACKDROP_SHARE, BACKDROP_START, "ease-in-out")),
    opacity: opening ? 0 : 1,
  };

  /* Paused, not removed, so the tap does not snap it back mid-breath. */
  const floatStyle: CSSProperties = {
    animationPlayState: opening ? "paused" : "running",
  };

  /* The open card coming towards the guest, about its right-hand panel. */
  const exitStyle: CSSProperties = {
    transformOrigin: `${RIGHT_PANEL_CENTRE}% 50%`,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", EXIT_SHARE, EXIT_START, "cubic-bezier(0.3,0,0.15,1)"),
      stage("opacity", EXIT_SHARE * 0.75, EXIT_START + EXIT_SHARE * 0.25, "ease-in"),
    ),
    transform: opening
      ? `translate3d(${-(RIGHT_PANEL_CENTRE - 50)}%, 0, 0) scale(1.8)`
      : "none",
    opacity: opening ? 0 : 1,
  };

  /* Two panels fitted to the screen that one panel nearly filled. */
  const fitStyle: CSSProperties = {
    willChange: "transform",
    transition: transition(stage("transform", OPEN_SHARE, OPEN_START, OPEN_EASE)),
    transform: opening ? `scale(${SPREAD_FIT})` : "scale(1)",
  };

  /*
    The spread, sliding from "card centred" to "spine centred". The perspective
    is here, on the panels' parent, so both share one vanishing point.
  */
  const spreadStyle: CSSProperties = {
    perspective: "1500px",
    willChange: "transform",
    transition: transition(stage("transform", OPEN_SHARE, OPEN_START, OPEN_EASE)),
    transform: opening ? "translate3d(0, 0, 0)" : "translate3d(-25%, 0, 0)",
  };

  /* Hinged on its left edge, which is the spine, and turned right over. */
  const coverStyle: CSSProperties = {
    ...box(200, 0, 200, 280),
    transformOrigin: "0% 50%",
    transformStyle: "preserve-3d",
    willChange: "transform",
    transition: transition(stage("transform", OPEN_SHARE, OPEN_START, OPEN_EASE)),
    transform: `rotateY(${opening ? COVER_OPEN : COVER_RESTING}deg)`,
  };

  /* Light falling off the cover as it turns away from the guest. */
  const shadeStyle: CSSProperties = {
    ...HIDE_BACKFACE,
    backgroundColor: "rgba(0,0,0,0.3)",
    transition: transition(stage("opacity", OPEN_SHARE * 0.5, OPEN_START, "ease-in")),
    opacity: opening ? 1 : 0,
  };

  /* The ribbon slipping down off the card as it opens. */
  const ribbonStyle: CSSProperties = {
    ...HIDE_BACKFACE,
    willChange: "transform, opacity",
    transition: transition(
      stage("transform", RIBBON_SHARE, RIBBON_START, "cubic-bezier(0.4,0,1,1)"),
      stage("opacity", RIBBON_SHARE, RIBBON_START, "ease-in"),
    ),
    transform: opening ? "translate3d(0, 18%, 0)" : "none",
    opacity: opening ? 0 : 1,
  };

  /* A shadow stays a shadow on every palette. It goes when the card does. */
  const shadowStyle: CSSProperties = {
    ...box(190, 250, 230, 60),
    backgroundImage:
      "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 68%)",
    transition: transition(
      stage("transform", OPEN_SHARE, OPEN_START, OPEN_EASE),
      stage("opacity", EXIT_SHARE * 0.5, EXIT_START, "ease-out"),
    ),
    transform: opening ? "translate3d(-45%, 0, 0) scaleX(1.7)" : "none",
    opacity: opening ? 0 : 1,
  };

  const stockFill = `url(#${uid}-stock)`;

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      {/* The card takes the space above the names; see ABOVE_WORDS. */}
      <div style={ABOVE_WORDS}>

        {/* A soft pool of light behind the card, so it sits in the room. */}
        <div
          className="absolute top-1/2 left-1/2 aspect-square w-[120vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            backgroundImage: `radial-gradient(circle, ${colors.foilHi} 0%, transparent 62%)`,
            opacity: opening ? 0 : colors.isLight ? 0.35 : 0.14,
            transition: transition(stage("opacity", 0.3, 0.6, "ease-out")),
          }}
        />

        {/*
          The spread's full width, two panels, of which the closed card is the
          right half — so the stage is wider than the card, and the slide below
          is what centres the card while it is shut.
        */}
        {/*
          The closed card is half this stage wide and 0.7 of it tall, so 120cqh
          keeps it to 84% of the height it has; see ABOVE_WORDS.
        */}
        <div
          className="relative aspect-[10/7] w-[min(128vw,640px)] shrink-0"
          style={{ width: "min(128cqw, 640px, 120cqh)" }}
        >
          <div className="absolute" style={shadowStyle} />

          <div
            className="absolute inset-0 animate-[lifafa-float_5.5s_ease-in-out_infinite] motion-reduce:animate-none"
            style={floatStyle}
          >
            <div className="absolute inset-0" style={exitStyle}>
              <div className="absolute inset-0" style={fitStyle}>
                <div className="absolute inset-0" style={spreadStyle}>
                  <svg className="absolute h-0 w-0" role="presentation" focusable="false">
                    <defs>
                      <linearGradient id={`${uid}-stock`} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={colors.stockHi} />
                        <stop offset="0.6" stopColor={colors.stock} />
                        <stop offset="1" stopColor={colors.stockLo} />
                      </linearGradient>
                      <pattern id={`${uid}-liner`} width="24" height="24" patternUnits="userSpaceOnUse">
                        <rect width="24" height="24" fill={colors.liner} />
                        <path d="M12 2 C16 8 16 16 12 22 C8 16 8 8 12 2 Z" fill="none" stroke={colors.linerInk} strokeWidth="0.8" opacity="0.6" />
                        <path d="M2 12 C8 8 16 8 22 12 C16 16 8 16 2 12 Z" fill="none" stroke={colors.linerInk} strokeWidth="0.8" opacity="0.6" />
                        <circle cx="12" cy="12" r="1.6" fill={colors.linerInk} opacity="0.8" />
                      </pattern>
                      <linearGradient id={`${uid}-ribbon`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor={colors.waxLo} />
                        <stop offset="0.3" stopColor={colors.waxHi} />
                        <stop offset="0.6" stopColor={colors.wax} />
                        <stop offset="1" stopColor={colors.waxLo} />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Inside right: the invitation, waiting under the cover. */}
                  <div
                    className="absolute overflow-hidden rounded-r-[4px] [container-type:inline-size]"
                    style={{
                      ...box(200, 0, 200, 280),
                      backgroundColor: colors.ground,
                      boxShadow: "0 20px 40px -24px rgba(0,0,0,0.6), 0 2px 6px -2px rgba(0,0,0,0.2)",
                    }}
                  >
                    <svg viewBox="0 0 200 280" className="absolute inset-0 h-full w-full" role="presentation" focusable="false">
                      <PanelFrame colors={colors} />
                    </svg>
                    {/* The crease, darkest at the spine. */}
                    <div
                      className="absolute inset-0"
                      style={{ backgroundImage: "linear-gradient(90deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 16%)" }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[5cqw] px-[16%] text-center">
                      <svg viewBox="0 0 80 14" className="w-[34%]" role="presentation" focusable="false">
                        <path d="M2 7 H28 M52 7 H78" stroke={colors.foil} strokeWidth="1" />
                        <path d="M40 1 L46 7 L40 13 L34 7 Z" fill={colors.foil} />
                        <circle cx="30" cy="7" r="1.5" fill={colors.foil} />
                        <circle cx="50" cy="7" r="1.5" fill={colors.foil} />
                      </svg>
                      {title !== undefined && title.length > 0 ? (
                        <span
                          className="block leading-[1.25] text-balance wrap-anywhere"
                          style={{ ...namesFont, color: colors.text, fontSize: "clamp(14px, 12cqw, 48px)" }}
                        >
                          {title}
                        </span>
                      ) : null}
                      <svg viewBox="0 0 120 10" className="w-[46%]" role="presentation" focusable="false">
                        <path d="M4 5 H52 M68 5 H116" stroke={colors.foil} strokeWidth="0.9" />
                        <path d="M60 1 L64 5 L60 9 L56 5 Z" fill={colors.foil} />
                      </svg>
                    </div>

                  </div>

                  {/*
                    Gold rising off the spine as the card lies open. Beside the
                    panel rather than in it, so the panel's clip does not cut the
                    flecks off at its top edge as they rise.
                  */}
                  <div className="absolute" style={box(200, 0, 200, 280)}>
                    {SPARKS.map((spark, index) => (
                      <span
                        key={index}
                        className="absolute top-[62%] left-0 opacity-0"
                        style={
                          {
                            width: spark.size,
                            height: spark.size,
                            marginLeft: -spark.size / 2,
                            "--dx": `${spark.dx}px`,
                            "--dy": `${spark.dy}px`,
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
                          <path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" fill={index % 2 === 0 ? colors.foilHi : colors.foil} />
                        </svg>
                      </span>
                    ))}
                  </div>

                  {/* The cover, hinged on the spine: two faces turning together. */}
                  <div className="absolute" style={coverStyle}>
                    {/* Outside: the front of the card. */}
                    <div className="absolute inset-0 overflow-hidden rounded-r-[4px]" style={HIDE_BACKFACE}>
                      <svg viewBox="0 0 200 280" className="absolute inset-0 h-full w-full" role="presentation" focusable="false">
                        <rect x="0" y="0" width="200" height="280" fill={stockFill} />
                        <PanelFrame colors={colors} />
                        {/* The medallion, with the couple's initials in its middle. */}
                        <g>
                          <circle cx="100" cy="128" r="40" fill="none" stroke={colors.foil} strokeWidth="1.4" />
                          <circle cx="100" cy="128" r="34" fill="none" stroke={colors.foil} strokeWidth="0.6" opacity="0.8" />
                          {Array.from({ length: 16 }, (_, index) => {
                            const angle = (index / 16) * Math.PI * 2;

                            return (
                              <circle
                                key={index}
                                cx={100 + Math.cos(angle) * 37}
                                cy={128 + Math.sin(angle) * 37}
                                r={index % 2 === 0 ? 1.3 : 0.8}
                                fill={colors.foil}
                              />
                            );
                          })}
                          {initials.length > 0 ? (
                            <text
                              x="100"
                              y="130"
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={initials.length > 1 ? 26 : 32}
                              fill={colors.foil}
                              style={namesFont}
                            >
                              {initials}
                            </text>
                          ) : (
                            <path d="M100 112 L112 128 L100 144 L88 128 Z" fill={colors.foil} />
                          )}
                          <path d="M78 196 H122" stroke={colors.foil} strokeWidth="0.9" />
                          <path d="M100 190 L105 196 L100 202 L95 196 Z" fill={colors.foil} />
                          <path d="M86 64 Q100 54 114 64" fill="none" stroke={colors.foil} strokeWidth="1" />
                          <circle cx="100" cy="58" r="2" fill={colors.foil} />
                        </g>
                      </svg>

                      {/* A silk ribbon round the card, near the spine, tied in a bow. */}
                      <div className="absolute inset-0" style={ribbonStyle}>
                        <svg viewBox="0 0 200 280" className="absolute inset-0 h-full w-full" role="presentation" focusable="false">
                          <rect x="30" y="0" width="16" height="280" fill={`url(#${uid}-ribbon)`} />
                          <path d="M30 0 V280 M46 0 V280" stroke={colors.waxLo} strokeWidth="0.8" opacity="0.6" />
                          <path d="M38 118 C14 98 4 110 12 124 C18 134 30 128 38 122 Z" fill={`url(#${uid}-ribbon)`} stroke={colors.waxLo} strokeWidth="0.8" />
                          <path d="M38 118 C62 98 72 110 64 124 C58 134 46 128 38 122 Z" fill={`url(#${uid}-ribbon)`} stroke={colors.waxLo} strokeWidth="0.8" />
                          <path d="M36 124 L24 160 L31 156 L34 164 Z" fill={`url(#${uid}-ribbon)`} />
                          <path d="M40 124 L52 162 L45 157 L42 165 Z" fill={`url(#${uid}-ribbon)`} />
                          <ellipse cx="38" cy="121" rx="6" ry="7" fill={colors.wax} stroke={colors.waxLo} strokeWidth="0.8" />
                        </svg>
                      </div>

                      {/* The sheen on the leaf, now and then. */}
                      <div className="absolute inset-0 overflow-hidden" style={{ opacity: opening ? 0 : 1 }}>
                        <div
                          className="absolute inset-y-0 left-0 w-1/2 animate-[lifafa-cover-sheen_5s_ease-in-out_1s_infinite] motion-reduce:animate-none"
                          style={{
                            ...floatStyle,
                            backgroundImage:
                              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)",
                            mixBlendMode: "soft-light",
                            transform: "translate3d(-130%, 0, 0)",
                          }}
                        />
                      </div>

                      <div className="absolute inset-0" style={shadeStyle} />
                    </div>

                    {/*
                      Inside: the lining, drawn the right way up once the cover has
                      turned half a revolution onto the left.
                    */}
                    <div
                      className="absolute inset-0 overflow-hidden rounded-l-[4px]"
                      style={{ ...HIDE_BACKFACE, transform: "rotateY(180deg)" }}
                    >
                      <svg viewBox="0 0 200 280" className="absolute inset-0 h-full w-full" role="presentation" focusable="false">
                        <rect x="0" y="0" width="200" height="280" fill={`url(#${uid}-liner)`} />
                        <rect x="9" y="9" width="182" height="262" rx="2" fill="none" stroke={colors.linerInk} strokeWidth="1.2" />
                      </svg>
                      <div
                        className="absolute inset-0"
                        style={{ backgroundImage: "linear-gradient(270deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 18%)" }}
                      />
                    </div>
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
