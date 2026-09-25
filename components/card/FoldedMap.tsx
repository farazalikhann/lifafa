import { useId, type ReactElement } from "react";
import { mixHex, readableOn } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";

/**
 * The drawing is laid out on a 300 x 180 sheet, folded into three panels of
 * 100 x 180. Every coordinate below is on that sheet.
 */
const SHEET_W = 300;
const SHEET_H = 180;
const PANEL_W = SHEET_W / 3;

/** Where the pin's tip touches the map: the middle of the sheet. */
const PIN_X = 150;
const PIN_Y = 98;

/**
 * The map printed on the paper: roads, a park, a lake. Drawn once and shown
 * through three windows, one per panel, so the panels can fold apart and the
 * roads still meet across the creases when they are flat.
 *
 * DECORATIVE, NOT A MAP. Nothing here is the venue's street plan and nothing
 * is labelled: a drawing with street names on it would be read as directions,
 * and it would be wrong. The pin, the compass and the path are on the overlay,
 * not on the paper, so they stay put while the paper unfolds under them.
 */
function Terrain({ theme }: { theme: Theme }): ReactElement {
  const road = mixHex(theme.surface, theme.textPrimary, 0.13);
  const roadEdge = mixHex(theme.surface, theme.textPrimary, 0.2);
  const minor = mixHex(theme.surface, theme.textPrimary, 0.09);
  const park = mixHex(theme.surface, theme.accent, 0.16);
  const tree = mixHex(theme.surface, theme.accent, 0.32);
  const lake = mixHex(theme.surface, theme.textMuted, 0.24);
  const block = mixHex(theme.surface, theme.textPrimary, 0.05);

  return (
    <g>
      <rect width={SHEET_W} height={SHEET_H} fill={theme.surface} />

      {/* City blocks, barely there, so the roads have something to run between. */}
      {[
        [18, 18, 34, 22],
        [118, 16, 40, 26],
        [238, 60, 30, 22],
        [120, 132, 28, 30],
        [244, 108, 36, 20],
        [30, 66, 26, 24],
      ].map(([x, y, w, h]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx={3} fill={block} />
      ))}

      {/* A park, bottom left, with a scatter of trees. */}
      <path
        d="M8 142c10-18 38-22 56-12 16 9 18 30 4 40-14 9-44 10-58 2-9-6-10-20-2-30Z"
        fill={park}
      />
      {[
        [26, 146],
        [40, 140],
        [52, 152],
        [32, 160],
        [58, 138],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3.2} fill={tree} />
      ))}

      {/* A lake, right. */}
      <path
        d="M236 142c8-12 34-14 48-4 11 8 8 24-8 30-15 6-36 4-42-6-4-7-3-14 2-20Z"
        fill={lake}
      />

      {/* Minor streets. */}
      <g fill="none" stroke={minor} strokeWidth={4} strokeLinecap="round">
        <path d="M-10 44c70 12 150-14 320 4" />
        <path d="M184 -10c-6 60 14 120 4 200" />
        <path d="M-10 96c40-4 70 8 96 4" />
      </g>

      {/* The main roads, with an edge so they read as roads and not lines. */}
      <g fill="none" strokeLinecap="round">
        <path d="M-10 124c70-22 120 30 190-12s100-50 130-36" stroke={roadEdge} strokeWidth={10} />
        <path d="M70 -10c12 60-14 120 22 200" stroke={roadEdge} strokeWidth={9} />
        <path d="M-10 124c70-22 120 30 190-12s100-50 130-36" stroke={road} strokeWidth={7.5} />
        <path d="M70 -10c12 60-14 120 22 200" stroke={road} strokeWidth={6.5} />
      </g>
    </g>
  );
}

/**
 * The folded paper map at the head of the location card.
 *
 * Three panels, each showing its third of the same drawing, with the creases
 * shaded the way folded paper catches light: a valley darkens towards the
 * fold, the next panel lifts off it. On arrival the two outer panels swing
 * open from the middle one, the pin drops onto the centre, and a dotted path
 * draws itself in from the corner to the pin. All of it is in globals.css
 * under .lifafa-map, keyed on `data-shown`, and all of it is off under reduced
 * motion, where the map is simply there, open, with the path drawn.
 *
 * Colours come from the card: the paper is the palette's surface, roads and
 * water are it moved towards the text colours, the park and the path towards
 * the accent, and the pin is the accent itself.
 */
export default function FoldedMap({
  theme,
  shown,
}: {
  theme: Theme;
  /** Whether the section has scrolled into view: starts the unfold. */
  shown: boolean;
}): ReactElement {
  const maskId = `lifafa-map-path-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const onAccent = readableOn(theme.accent, [theme.background, theme.textPrimary]);
  const crease = mixHex(theme.surface, theme.textPrimary, 0.14);
  const compass = mixHex(theme.surface, theme.textPrimary, 0.45);

  /* The dotted path, drawn in from the bottom left corner to the pin's foot. */
  const path = `M22 172C48 150 58 124 96 120S138 106 ${PIN_X - 2} ${PIN_Y + 4}`;

  return (
    <div
      data-shown={shown ? "true" : "false"}
      className="lifafa-map relative w-full"
      style={{ aspectRatio: `${SHEET_W} / ${SHEET_H}` }}
    >
      <div
        className="lifafa-map-paper absolute inset-0 flex overflow-visible rounded-[0.6rem]"
        style={{ boxShadow: `inset 0 0 0 1px ${theme.textMuted}38` }}
      >
        {[0, 1, 2].map((panel) => (
          <div
            key={panel}
            className={`lifafa-map-panel lifafa-map-panel-${panel} relative h-full flex-1 overflow-hidden ${
              panel === 0 ? "rounded-l-[0.6rem]" : panel === 2 ? "rounded-r-[0.6rem]" : ""
            }`}
          >
            <svg
              viewBox={`${panel * PANEL_W} 0 ${PANEL_W} ${SHEET_H}`}
              preserveAspectRatio="none"
              className="block h-full w-full"
              aria-hidden="true"
            >
              <Terrain theme={theme} />
            </svg>
            {/* The fold's light: see the classes in globals.css. */}
            <span aria-hidden="true" className="lifafa-map-shade absolute inset-0" />
            {panel > 0 ? (
              <span
                aria-hidden="true"
                className="absolute inset-y-0 left-0 w-px"
                style={{ backgroundColor: crease }}
              />
            ) : null}
          </div>
        ))}
      </div>

      {/* The pin, the ring, the path and the compass, over the paper. */}
      <svg
        viewBox={`0 0 ${SHEET_W} ${SHEET_H}`}
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Draws the dotted path in: the mask's own stroke is what animates. */}
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <path
              className="lifafa-map-path-draw"
              d={path}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={8}
              strokeLinecap="round"
              pathLength={1}
            />
          </mask>
        </defs>

        <path
          d={path}
          fill="none"
          stroke={theme.accent}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeDasharray="0.1 7"
          mask={`url(#${maskId})`}
        />
        <circle cx={22} cy={172} r={3.2} fill={theme.accent} className="lifafa-map-start" />

        {/* The compass rose, top right: four points and a north mark. */}
        <g transform="translate(272 30)" stroke={compass} fill="none" strokeWidth={1}>
          <circle r={12} strokeOpacity={0.5} />
          <path d="M0 -10L2.4 0 0 10-2.4 0Z" fill={compass} fillOpacity={0.35} />
          <path d="M-10 0L0 -2.2 10 0 0 2.2Z" fill={compass} fillOpacity={0.2} />
          <path d="M0 -10L2.4 0H-2.4Z" fill={theme.accent} stroke="none" />
          <text
            y={-15}
            textAnchor="middle"
            fontSize={8}
            fontWeight={600}
            fill={compass}
            stroke="none"
            style={{ fontFamily: "system-ui, sans-serif" }}
          >
            N
          </text>
        </g>

        {/* The ring under the pin, pulsing softly once the pin has landed. */}
        <ellipse
          className="lifafa-map-ring"
          cx={PIN_X}
          cy={PIN_Y + 1}
          rx={13}
          ry={4.5}
          fill="none"
          stroke={theme.accent}
          strokeWidth={1.6}
        />
        <ellipse cx={PIN_X} cy={PIN_Y + 1} rx={5} ry={1.8} fill="#000000" fillOpacity={0.18} />

        <g className="lifafa-map-pin">
          <path
            d={`M${PIN_X} ${PIN_Y}c0 0-13-15.5-13-25a13 13 0 0 1 26 0c0 9.5-13 25-13 25Z`}
            fill={theme.accent}
            stroke={mixHex(theme.accent, "#000000", 0.25)}
            strokeWidth={0.8}
          />
          <circle cx={PIN_X} cy={PIN_Y - 25} r={4.8} fill={onAccent} />
        </g>
      </svg>
    </div>
  );
}
