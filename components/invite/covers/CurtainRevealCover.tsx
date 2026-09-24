"use client";

import { useId, type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { initialsOf } from "@/components/invite/covers/initials";
import { stage } from "@/components/invite/covers/timing";
import type { CoverPalette } from "@/lib/coverPalette";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * The panels start at once and take most of the open, the pelmet lifts away
 * once they are well under way, and the gathered cloth fades off the sides
 * while it is still settling — so there is never a moment where the curtains
 * sit still and wait to be dismissed.
 */
const DRAW_SHARE = 0.8;
const PELMET_START = 0.34;
const PELMET_SHARE = 0.46;
const GLOW_START = 0.04;
const GLOW_SHARE = 0.5;
const FADE_START = 0.7;
const FADE_SHARE = 0.3;

/**
 * How quickly the ground behind the panels clears.
 *
 * Almost at once: the panels still cover the screen for the first few frames,
 * so by the time a gap has opened it is the card in the gap, not a blank ground
 * that pops into a card when the layer unmounts.
 */
const BACKDROP_SHARE = 0.16;

/**
 * How a panel ends up once drawn: gathered into a fraction of its width at the
 * outer edge, the way heavy cloth bunches into its folds, rather than slid off
 * the screen flat. Its folds crowd together as it goes, which is what makes
 * it read as cloth being drawn and not a board being pushed.
 */
const GATHER = 0.3;

/** Clear of the names under the shell's prompt: from 60% of the screen to 91%. */
const BRAID_MASK =
  "linear-gradient(180deg, #000 0%, #000 58%, transparent 64%, transparent 89%, #000 93%)";

/** Slow to start and slow to stop: the cloth has weight to get moving. */
const DRAW_EASE = "cubic-bezier(0.6,0,0.2,1)";

/*
  The drape: a crest of light, the body, and a deep hollow between folds, as
  one repeating gradient. Uneven stops on purpose — evenly spaced folds read
  as corrugation, and cloth does not hang in a regular wave.
*/
function velvet(colors: CoverPalette): string {
  const { velvetHi: hi, velvet: body, velvetLo: lo } = colors;

  return `repeating-linear-gradient(90deg, ${lo} 0px, ${body} 9px, ${hi} 17px, ${body} 26px, ${lo} 38px, ${body} 46px, ${hi} 51px, ${body} 58px, ${lo} 66px)`;
}

/** Light falling on the cloth from above, and failing towards the floor. */
const FALLOFF =
  "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 22%, rgba(255,255,255,0.05) 48%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.38) 100%)";

/** The gathered rope and its tassel that hold a panel back, drawn once and mirrored. */
function TieBack({ side, colors, gradientId }: { side: -1 | 1; colors: CoverPalette; gradientId: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 70 170"
      className={`absolute top-[58%] h-[150px] w-[62px] -translate-y-1/2 ${side < 0 ? "left-[14%]" : "right-[14%] -scale-x-100"}`}
      role="presentation"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={colors.foilLo} />
          <stop offset="0.45" stopColor={colors.foilHi} />
          <stop offset="1" stopColor={colors.foil} />
        </linearGradient>
      </defs>
      {/* The rope, a twisted cord looped round the gathered cloth. */}
      <path d="M4 40 C44 48 46 84 10 94" fill="none" stroke={colors.foilLo} strokeWidth="7" strokeLinecap="round" />
      <path d="M4 40 C44 48 46 84 10 94" fill="none" stroke={`url(#${gradientId})`} strokeWidth="5" strokeLinecap="round" />
      <path
        d="M4 40 C44 48 46 84 10 94"
        fill="none"
        stroke={colors.foilLo}
        strokeWidth="5"
        strokeDasharray="2 5"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* The knot, and the tassel hanging off it. */}
      <circle cx="36" cy="70" r="8" fill={`url(#${gradientId})`} stroke={colors.foilLo} strokeWidth="1.2" />
      <path d="M36 78 L36 92" stroke={colors.foil} strokeWidth="2.4" />
      <ellipse cx="36" cy="96" rx="7" ry="5" fill={`url(#${gradientId})`} />
      <path d="M29 99 L26 150 Q36 158 46 150 L43 99 Z" fill={`url(#${gradientId})`} />
      <path
        d="M30 104 L28 150 M33 104 L32 153 M36 104 L36 154 M39 104 L40 153 M42 104 L44 150"
        stroke={colors.foilLo}
        strokeWidth="0.9"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * Two velvet curtains drawn back off the invitation, under a swagged pelmet.
 *
 * DRESSED, NOT FLAT. The curtains used to be the card's ground with a little
 * ink mixed in, striped — grey on grey. They are velvet now, the card's accent
 * taken deep, with light falling on the folds from above, a braid of gold down
 * each leading edge, rope tie-backs with tassels, and a swagged pelmet across
 * the top carrying the couple's crest. See the dressed tones in
 * lib/coverPalette.ts; nothing here is a colour the card does not already use.
 *
 * THE DRAW. Each panel gathers into the side it hangs from, its folds crowding
 * as it goes, while a line of light opens between them onto the card. The
 * pelmet lifts away as the panels clear, and the gathered cloth fades off the
 * sides as it settles.
 *
 * Panels are elements rather than shapes in one SVG, because a curtain has to
 * reach every edge of the screen and a drawing with a fixed viewBox cannot: it
 * would letterbox on a tall phone and leave the card showing above and below
 * before anything had opened.
 */
export default function CurtainRevealCover({
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
  const uid = `cur${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  const transition = (...entries: string[]): string | undefined =>
    reducedMotion ? undefined : entries.join(", ");

  const onOpen = (name: string, share: number, start: number, easing: string): string | undefined =>
    opening && !reducedMotion
      ? `${name} calc(var(--cover-ms)*${share}) ${easing} calc(var(--cover-ms)*${start}) both`
      : undefined;

  /* The card's ground, cleared behind the panels as they start to move. */
  const backdropStyle: CSSProperties = {
    backgroundColor: colors.ground,
    transition: transition(stage("opacity", BACKDROP_SHARE, 0, "linear")),
    opacity: opening ? 0 : 1,
  };

  /* The gathered cloth leaving, once it is at the sides. */
  const layerStyle: CSSProperties = {
    transition: transition(stage("opacity", FADE_SHARE, FADE_START, "ease-in")),
    opacity: opening ? 0 : 1,
  };

  /* A panel drawn into its own side: gathered narrow, and a little further out. */
  const panel = (side: -1 | 1): CSSProperties => ({
    transformOrigin: side < 0 ? "0% 50%" : "100% 50%",
    transition: transition(stage("transform", DRAW_SHARE, 0, DRAW_EASE)),
    transform: opening
      ? `translate3d(${side * 12}%, 0, 0) scaleX(${GATHER})`
      : "translate3d(0, 0, 0) scaleX(1)",
    willChange: "transform",
  });

  /* The pelmet, lifted clear once the panels are well under way. */
  const pelmetStyle: CSSProperties = {
    transition: transition(
      stage("transform", PELMET_SHARE, PELMET_START, "cubic-bezier(0.5,0,0.3,1)"),
    ),
    transform: opening ? "translate3d(0, -115%, 0)" : "translate3d(0, 0, 0)",
    willChange: "transform",
  };

  /* The sway and sheen of a curtain hanging in a still room, stopped by the tap. */
  const idleStyle: CSSProperties = {
    animationPlayState: opening ? "paused" : "running",
  };

  return (
    <div
      aria-hidden
      style={{ ...rootStyle, ...layerStyle }}
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0" style={backdropStyle} />

      {/* The light let in between the panels as they part. */}
      <div
        className="absolute inset-y-0 left-1/2 w-[70vw] -translate-x-1/2 opacity-0"
        style={{
          backgroundImage: `radial-gradient(ellipse 30% 60% at 50% 50%, ${colors.foilHi} 0%, transparent 70%)`,
          animation: onOpen("lifafa-cover-flash", GLOW_SHARE, GLOW_START, "cubic-bezier(0.2,0.6,0.4,1)"),
        }}
      />

      {([-1, 1] as const).map((side) => (
        <div
          key={side}
          /*
            The extra pixel is the seam: two panels meeting exactly at 50% can
            leave a hairline of card showing between them at some widths.
          */
          className={`absolute inset-y-0 w-[calc(50%+1px)] ${side < 0 ? "left-0" : "right-0"}`}
          style={panel(side)}
        >
          <div
            className="absolute inset-0 origin-top animate-[lifafa-cover-drape-sway_7s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              ...idleStyle,
              animationDelay: side < 0 ? "0s" : "-3.5s",
              backgroundImage: velvet(colors),
              backgroundColor: colors.velvet,
            }}
          >
            <div className="absolute inset-0" style={{ backgroundImage: FALLOFF }} />

            {/* Deepest where the two panels meet, and at the wall. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(${side < 0 ? 90 : 270}deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.45) 100%)`,
              }}
            />

            {/* Light moving over the pile of the velvet, now and then. */}
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 w-2/3 animate-[lifafa-cover-sheen_6s_ease-in-out_infinite] motion-reduce:animate-none"
                style={{
                  ...idleStyle,
                  animationDelay: side < 0 ? "0.6s" : "1.1s",
                  backgroundImage:
                    "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%)",
                  transform: "translate3d(-130%, 0, 0)",
                }}
              />
            </div>

            {/*
              A braid of gold down the leading edge. It runs down the middle of
              the screen, which is also where the names are printed, so it is
              let go in the band they sit in and picks up again under them.
            */}
            <div
              className="absolute inset-0"
              style={{ maskImage: BRAID_MASK, WebkitMaskImage: BRAID_MASK }}
            >
              <div
                className={`absolute inset-y-0 w-[7px] ${side < 0 ? "right-[10px]" : "left-[10px]"}`}
                style={{
                  backgroundImage: `linear-gradient(90deg, ${colors.foilLo}, ${colors.foilHi} 45%, ${colors.foil} 70%, ${colors.foilLo}), repeating-linear-gradient(180deg, transparent 0 6px, rgba(0,0,0,0.25) 6px 8px)`,
                  backgroundBlendMode: "multiply",
                  boxShadow: "0 0 6px rgba(0,0,0,0.35)",
                }}
              />
              <div
                className={`absolute inset-y-0 w-px ${side < 0 ? "right-[21px]" : "left-[21px]"}`}
                style={{ backgroundColor: colors.foil, opacity: 0.6 }}
              />
            </div>
          </div>

          <TieBack side={side} colors={colors} gradientId={`${uid}-rope${side}`} />
        </div>
      ))}

      {/* The pelmet: a swagged valance across the top, with the couple's crest. */}
      <div className="absolute inset-x-0 top-0 h-[19vh] min-h-[120px]" style={pelmetStyle}>
        <svg
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]"
          role="presentation"
          focusable="false"
        >
          <defs>
            <linearGradient id={`${uid}-swag`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors.velvetLo} />
              <stop offset="0.55" stopColor={colors.velvet} />
              <stop offset="0.85" stopColor={colors.velvetHi} />
              <stop offset="1" stopColor={colors.velvet} />
            </linearGradient>
            <linearGradient id={`${uid}-trim`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={colors.foilLo} />
              <stop offset="0.25" stopColor={colors.foilHi} />
              <stop offset="0.5" stopColor={colors.foil} />
              <stop offset="0.75" stopColor={colors.foilHi} />
              <stop offset="1" stopColor={colors.foilLo} />
            </linearGradient>
          </defs>
          {/* Three swags, the middle one deepest, hung from a straight top. */}
          <path
            d="M0 0 H400 V62 Q367 98 333 70 Q266 116 200 76 Q134 116 67 70 Q33 98 0 62 Z"
            fill={`url(#${uid}-swag)`}
          />
          {/* The folds of each swag, following its curve. */}
          <path
            d="M0 36 Q33 64 67 44 Q134 82 200 50 Q266 82 333 44 Q367 64 400 36"
            fill="none"
            stroke={colors.velvetLo}
            strokeWidth="3"
            opacity="0.55"
          />
          <path
            d="M0 20 Q33 42 67 28 Q134 56 200 32 Q266 56 333 28 Q367 42 400 20"
            fill="none"
            stroke={colors.velvetHi}
            strokeWidth="2"
            opacity="0.35"
          />
          {/* The gold trim along the swags' hem. */}
          <path
            d="M0 62 Q33 98 67 70 Q134 116 200 76 Q266 116 333 70 Q367 98 400 62"
            fill="none"
            stroke={`url(#${uid}-trim)`}
            strokeWidth="3.2"
          />
          <path
            d="M0 56 Q33 90 67 64 Q134 108 200 70 Q266 108 333 64 Q367 90 400 56"
            fill="none"
            stroke={colors.foil}
            strokeWidth="0.9"
            opacity="0.7"
          />
          <rect x="0" y="0" width="400" height="7" fill={`url(#${uid}-trim)`} />
        </svg>

        {/* A tassel at each join, and the crest at the middle. */}
        {[16.75, 83.25].map((left) => (
          <svg
            key={left}
            viewBox="0 0 20 44"
            className="absolute h-[34px] w-[16px] -translate-x-1/2"
            style={{ left: `${left}%`, top: "calc(58% - 4px)" }}
            role="presentation"
            focusable="false"
          >
            <circle cx="10" cy="5" r="4.5" fill={colors.foil} stroke={colors.foilLo} strokeWidth="0.8" />
            <path d="M6 9 L4 40 Q10 44 16 40 L14 9 Z" fill={colors.foil} />
            <path d="M7 12 L6 40 M10 12 L10 42 M13 12 L14 40" stroke={colors.foilLo} strokeWidth="0.7" opacity="0.7" />
          </svg>
        ))}

        <div className="absolute top-[34%] left-1/2 aspect-square w-[64px] -translate-x-1/2 -translate-y-1/2">
          <svg viewBox="0 0 64 64" className="absolute inset-0 h-full w-full drop-shadow-[0_3px_5px_rgba(0,0,0,0.45)]" role="presentation" focusable="false">
            <circle cx="32" cy="32" r="29" fill={colors.velvetLo} stroke={`url(#${uid}-trim)`} strokeWidth="3" />
            <circle cx="32" cy="32" r="23.5" fill="none" stroke={colors.foil} strokeWidth="0.9" opacity="0.8" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <circle
                key={angle}
                cx={32 + Math.cos((angle * Math.PI) / 180) * 26.3}
                cy={32 + Math.sin((angle * Math.PI) / 180) * 26.3}
                r="1.1"
                fill={colors.foilHi}
              />
            ))}
            {initials.length > 0 ? (
              <text
                x="32"
                y="33"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={initials.length > 1 ? 17 : 21}
                fill={colors.foilHi}
                style={namesFont}
              >
                {initials}
              </text>
            ) : (
              <path d="M32 22 L40 32 L32 42 L24 32 Z" fill={colors.foilHi} />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
