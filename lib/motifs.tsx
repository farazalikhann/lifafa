import type { ReactElement, ReactNode } from "react";
import type { OccasionId, TraditionId } from "@/types/occasion";

/**
 * Hand drawn decorative motifs for the card decor layer.
 *
 * HARD RULE, enforced by hand across every motif below: these are symbols and
 * ornament only. No deity, prophet, guru, saint, or any human or divine figure
 * or face is drawn for any tradition — not even a stylised one. Where a
 * tradition's conventional emblem is itself an object or glyph (a lamp, a
 * wheel, a script character), that emblem is drawn; where it would require a
 * figure, it is simply omitted.
 *
 * Every motif is stroke based line art using currentColor, so the decor layer
 * colours them by setting `color` on the wrapper.
 *
 * Each motif carries a second layer of drawing — an inner contour, a vein, a
 * band, a rim — beyond the silhouette that identifies it. That detail is
 * invisible at 18px and is the whole difference at 64px: without it a large
 * motif reads as one blown-up icon rather than as ornament.
 */

export interface MotifProps {
  size: number;
}

export type Motif = (props: MotifProps) => ReactElement;

/** The viewBox every motif is drawn in. */
const VIEWBOX = 24;

/** Stroke weight at 1:1, i.e. when a motif renders at exactly VIEWBOX px. */
const BASE_STROKE = 1.8;

/**
 * How hard stroke weight resists the viewBox scale, from 0 (a constant
 * rendered width, so large motifs look spindly) to 1 (pure proportional
 * scaling). 0.55 keeps the rendered line between roughly 1.6px and 2.8px right
 * across the 18px to 64px range the decor layer uses.
 */
const STROKE_RESISTANCE = 0.55;

/**
 * Stroke width in viewBox units for a given rendered size.
 *
 * Scaling an SVG scales its strokes with it, so a fixed `strokeWidth` that
 * looks right at 24px renders as a 4.8px slab at 64px — the motif stops being
 * line art and turns into a solid glyph fighting the text behind it. Pulling
 * the authored width down as the motif grows keeps every size looking like the
 * same pen drew it.
 */
function strokeFor(size: number): number {
  return BASE_STROKE * Math.pow(VIEWBOX / size, STROKE_RESISTANCE);
}

function Svg({
  size,
  children,
  strokeWidth,
}: {
  size: number;
  children: ReactNode;
  strokeWidth?: number;
}): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? strokeFor(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------------------
   Neutral ornament
   --------------------------------------------------------------------------- */

const Petal: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 3 Q19 11 12 21 Q5 11 12 3 Z" />
    <path d="M12 6 Q16.5 11.5 12 18 Q7.5 11.5 12 6 Z" />
    <path d="M12 8.5 V16" />
  </Svg>
);

const Star: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 3 L14 10 L21 12 L14 14 L12 21 L10 14 L3 12 L10 10 Z" />
    <circle cx={12} cy={12} r={3.2} />
    <path d="M6.7 6.7 L8.9 8.9 M17.3 6.7 L15.1 8.9 M6.7 17.3 L8.9 15.1 M17.3 17.3 L15.1 15.1" />
  </Svg>
);

const Dot: Motif = ({ size }) => (
  <Svg size={size}>
    <circle cx={12} cy={12} r={4} fill="currentColor" stroke="none" />
    <circle cx={12} cy={12} r={7.2} />
    <circle cx={12} cy={12} r={10.2} />
  </Svg>
);

const Floral: Motif = ({ size }) => (
  <Svg size={size}>
    <circle cx={12} cy={7} r={3} />
    <circle cx={17} cy={12} r={3} />
    <circle cx={12} cy={17} r={3} />
    <circle cx={7} cy={12} r={3} />
    <circle cx={12} cy={12} r={1.2} fill="currentColor" stroke="none" />
    <circle cx={12} cy={12} r={10.4} />
    <path d="M6.6 6.6 L8.6 8.6 M17.4 6.6 L15.4 8.6 M6.6 17.4 L8.6 15.4 M17.4 17.4 L15.4 15.4" />
  </Svg>
);

const ThinLine: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M4 12 H20" />
    <path d="M12 9.6 L14.4 12 L12 14.4 L9.6 12 Z" />
    <path d="M4 9.8 V14.2 M20 9.8 V14.2" />
  </Svg>
);

const GeoShape: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 4 L20 18 H4 Z" />
    <path d="M12 8.4 L16.6 16 H7.4 Z" />
    <path d="M7.4 12.6 H16.6" />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Occasion motifs
   --------------------------------------------------------------------------- */

const Ring: Motif = ({ size }) => (
  <Svg size={size}>
    <circle cx={12} cy={14} r={6.5} />
    <circle cx={12} cy={14} r={4.6} />
    <path d="M12 3.5 L14.5 6.5 L12 9 L9.5 6.5 Z" />
    <path d="M15.8 4.6 L17.2 3.2 M8.2 4.6 L6.8 3.2" />
  </Svg>
);

const FloralSprig: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 21 V6" />
    <path d="M12 16 Q8 15 8 11" />
    <path d="M12 16 Q16 15 16 11" />
    <path d="M12 11 Q9 10 9 7" />
    <path d="M12 11 Q15 10 15 7" />
    <circle cx={12} cy={4.5} r={1.6} />
    <path d="M12 20 Q9.2 19.2 9.2 16.4" />
    <path d="M12 20 Q14.8 19.2 14.8 16.4" />
  </Svg>
);

const Heart: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 20 Q3 13 3 8.5 Q3 4 7.5 4 Q10.5 4 12 7 Q13.5 4 16.5 4 Q21 4 21 8.5 Q21 13 12 20 Z" />
    <path d="M12 17.2 Q5.6 12.2 5.6 8.9 Q5.6 6 8.2 6 Q10.5 6 12 8.6 Q13.5 6 15.8 6 Q18.4 6 18.4 8.9 Q18.4 12.2 12 17.2 Z" />
    <path d="M12 8.6 V13.4" />
  </Svg>
);

const Balloon: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 3 Q18 3 18 9 Q18 14 12 16 Q6 14 6 9 Q6 3 12 3 Z" />
    <path d="M12 16 Q13.5 18.5 11 21" />
    <path d="M9.2 6 Q8 8.6 9 11.4" />
    <path d="M10.9 15.4 L12 16.8 L13.1 15.4" />
  </Svg>
);

const Confetti: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M8 4 Q12 8 8 12 Q4 16 8 20" />
    <path d="M16 4 Q20 8 16 12 Q12 16 16 20" />
    <path d="M12 3.2 V5 M12 19 V20.8" />
  </Svg>
);

const Cloud: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M7 17 Q4 17 4 14 Q4 11 7 11 Q8 7 12 7 Q16 7 17 11 Q20 11 20 14 Q20 17 17 17 Z" />
    <path d="M7.4 15.4 Q6 14 7.2 12.6" />
    <path d="M12.6 9.2 Q15 9 15.8 11.4" />
  </Svg>
);

/** An impression in the ground, not a person. */
const Footprint: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 21 Q8 21 8 16.5 Q8 12 12 12 Q16 12 16 16.5 Q16 21 12 21 Z" />
    <circle cx={9} cy={8.5} r={1.2} />
    <circle cx={12} cy={7} r={1.2} />
    <circle cx={15} cy={8.5} r={1.2} />
    {/*
      Two more toes and an off-centre instep line. Three evenly spaced dots
      above a pair of horizontal arcs is a face, which this file does not draw
      under any circumstances; five toes and one asymmetric curve are a foot.
    */}
    <circle cx={6.9} cy={10.4} r={0.9} />
    <circle cx={17.1} cy={10.4} r={0.9} />
    <path d="M9.4 18.8 Q8.9 15.2 11.3 13.4" />
  </Svg>
);

const Moon: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M15.5 3.5 A9 9 0 1 0 15.5 20.5 A7 7 0 1 1 15.5 3.5 Z" />
    {/* Craters, placed in the thick of the crescent rather than along its edge. */}
    <circle cx={9.2} cy={9.6} r={1.2} />
    <circle cx={8.4} cy={14.6} r={0.9} />
    <circle cx={12} cy={17.8} r={0.7} />
  </Svg>
);

const House: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M4 12 L12 5 L20 12 V20 H4 Z" />
    <path d="M10 20 V15 H14 V20" />
    <path d="M5.6 12.6 L12 7 L18.4 12.6" />
    <path d="M6 13.6 H8.6 V16.2 H6 Z" />
  </Svg>
);

const Leaf: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M5 19 Q5 8 19 5 Q19 16 5 19 Z" />
    <path d="M5 19 Q11 13 16 9" />
    <path d="M8.8 15.2 Q10.8 13.6 11.4 10.6" />
    <path d="M12.4 11.6 Q14.4 10.4 15 7.8" />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Hindu — objects, ornament and script glyphs only
   --------------------------------------------------------------------------- */

/** Oil lamp. */
const Diya: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M4 14 Q12 21 20 14 Q12 15.5 4 14 Z" />
    <path d="M12 12.5 Q9.5 9 12 4 Q14.5 9 12 12.5 Z" />
    <path d="M5.6 15.6 Q12 20 18.4 15.6" />
    <path d="M12 11.6 Q10.8 9.2 12 6.6 Q13.2 9.2 12 11.6 Z" />
  </Svg>
);

/** Ceremonial pot with coconut and mango leaves. */
const Kalash: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M7 21 Q5 15 12 15 Q19 15 17 21 Z" />
    <path d="M6.5 13.5 H17.5" />
    <circle cx={12} cy={8} r={2.4} />
    <path d="M9.5 13 Q9.5 10 12 10.5" />
    <path d="M14.5 13 Q14.5 10 12 10.5" />
    <path d="M6.9 18.2 Q12 19.6 17.1 18.2" />
    <path d="M8 13 Q6.8 10.6 8.8 9.6" />
    <path d="M16 13 Q17.2 10.6 15.2 9.6" />
  </Svg>
);

/** Stylised om glyph. */
const Om: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M4.5 11 Q7.5 7 10.5 10.5 Q12 12.5 9.5 13.5 Q6.5 15 7.5 17 Q9 19.5 12.5 18.5 Q16 17.5 16.5 13.5" />
    <path d="M13.5 6.5 Q15.5 4.5 17.5 6.5" />
    <circle cx={19.5} cy={4} r={1.1} />
    <path d="M6.4 10.8 Q8.4 8.6 10 11" />
    <circle cx={19.5} cy={4} r={2.6} />
  </Svg>
);

/**
 * Swastika in its traditional Indian form: axis aligned, arms turning
 * clockwise, with a dot in each quadrant. This is the auspicious symbol used in
 * Hindu and Jain practice, deliberately drawn upright rather than rotated.
 */
const Swastika: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 3 V21 M3 12 H21" />
    <path d="M12 3 H18 M21 12 V18 M12 21 H6 M3 12 V6" />
    <circle cx={7} cy={7} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={17} cy={7} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={7} cy={17} r={0.9} fill="currentColor" stroke="none" />
    <circle cx={17} cy={17} r={0.9} fill="currentColor" stroke="none" />
    {/*
      Rings around the quadrant dots, not an outer frame: a frame lands on the
      arm tips and the whole thing reads as a window instead of the symbol.
      Each ring clears the arms by more than two units.
    */}
    <circle cx={7} cy={7} r={2.4} />
    <circle cx={17} cy={7} r={2.4} />
    <circle cx={7} cy={17} r={2.4} />
    <circle cx={17} cy={17} r={2.4} />
  </Svg>
);

const Mandala: Motif = ({ size }) => (
  <Svg size={size}>
    <circle cx={12} cy={12} r={3} />
    <circle cx={12} cy={12} r={7} />
    <path d="M12 2 V4.5 M12 19.5 V22 M2 12 H4.5 M19.5 12 H22" />
    <path d="M5 5 L6.7 6.7 M19 5 L17.3 6.7 M5 19 L6.7 17.3 M19 19 L17.3 17.3" />
    <circle cx={12} cy={12} r={9.8} />
    <circle cx={12} cy={12} r={1.3} />
  </Svg>
);

const Lotus: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 19 Q9 13 12 6 Q15 13 12 19 Z" />
    <path d="M12 19 Q6 15.5 5 9 Q10 11 12 19" />
    <path d="M12 19 Q18 15.5 19 9 Q14 11 12 19" />
    <path d="M12 19 Q5.2 18.4 2.6 14 Q7.6 14.2 12 19" />
    <path d="M12 19 Q18.8 18.4 21.4 14 Q16.4 14.2 12 19" />
  </Svg>
);

/** Mango leaf garland strung across a doorway. */
const MangoToran: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M3 7 Q12 13 21 7" />
    <path d="M7 10 Q5.5 13.5 7 16 Q8.5 13.5 7 10 Z" />
    <path d="M12 12 Q10.5 15.5 12 18 Q13.5 15.5 12 12 Z" />
    <path d="M17 10 Q15.5 13.5 17 16 Q18.5 13.5 17 10 Z" />
    <path d="M3 8.8 Q12 14.6 21 8.8" />
    <circle cx={3} cy={7} r={1} />
    <circle cx={21} cy={7} r={1} />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Muslim — geometry, ornament and architecture only
   --------------------------------------------------------------------------- */

const EightPointStar: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 2 L22 12 L12 22 L2 12 Z" />
    <path d="M5 5 H19 V19 H5 Z" />
    <circle cx={12} cy={12} r={5} />
    <circle cx={12} cy={12} r={2} />
  </Svg>
);

const Arabesque: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M4 19 Q4 10 10.5 10 Q16 10 14.5 15.5 Q13.5 18.5 10.5 17 Q8.5 16 9.5 13" />
    <path d="M20 19 Q20 11.4 14.6 10.6" />
    <path d="M10.6 9.8 Q11.6 6.8 14.4 7.4" />
  </Svg>
);

const Crescent: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M16 3.5 A9 9 0 1 0 16 20.5 A7 7 0 1 1 16 3.5 Z" />
    <path d="M12.6 6.6 Q9.8 12 12.6 17.4" />
    <path d="M16 3.5 L17.6 2.2 M16 20.5 L17.6 21.8" />
  </Svg>
);

const Lantern: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M8 7.5 H16 L17 16 Q12 19 7 16 Z" />
    <path d="M10 4.5 H14" />
    <path d="M12 4.5 V7.5" />
    <path d="M12 18 V21" />
    <path d="M10.2 7.8 L9.6 16.4 M13.8 7.8 L14.4 16.4" />
    <path d="M8.6 17.4 H15.4" />
  </Svg>
);

const PointedArch: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M6 21 V12 Q6 6 12 3 Q18 6 18 12 V21" />
    <path d="M8.2 21 V12.4 Q8.2 7.6 12 5.4 Q15.8 7.6 15.8 12.4 V21" />
    <path d="M12 3 V1.4" />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Sikh — emblem, script glyph and architecture only
   --------------------------------------------------------------------------- */

const Khanda: Motif = ({ size }) => (
  <Svg size={size}>
    <circle cx={12} cy={12} r={6} />
    <circle cx={12} cy={12} r={4.4} />
    <path d="M12 3 Q13.2 5 12 7 Q10.8 5 12 3 Z" />
    <path d="M12 7 V21" />
    <path d="M6.5 6 Q3 12 6.5 18" />
    <path d="M17.5 6 Q21 12 17.5 18" />
    <path d="M10.2 9.4 H13.8" />
  </Svg>
);

/** Stylised ik onkar glyph. */
const IkOnkar: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M7 5 Q9.5 3.5 9.5 7 V16" />
    <path d="M9.5 16 Q12.5 18.5 15 15.5 Q17.5 12 14 11" />
    <path d="M9.5 8 Q13.5 5.5 17 8" />
    <path d="M11.4 14.6 Q13.4 16 14.8 14.2" />
    <path d="M7 5 Q5.8 6.4 6.4 8" />
  </Svg>
);

const GurudwaraArch: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M6 13 Q12 4 18 13" />
    <path d="M5 13 H19 V21 H5 Z" />
    <path d="M12 4 V1.8" />
    <path d="M7.8 13 Q12 6.6 16.2 13" />
    <path d="M6.4 16.6 H17.6" />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Christian — symbol, ornament and one animal outline, no figures
   --------------------------------------------------------------------------- */

const Cross: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 3 V21 M6 9 H18" />
    <path d="M12 7.2 L13.8 9 L12 10.8 L10.2 9 Z" />
    <path d="M10.6 3 H13.4 M10.6 21 H13.4 M6 7.6 V10.4 M18 7.6 V10.4" />
  </Svg>
);

/** Bird outline, drawn without an eye so it carries no face. */
const Dove: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M4 14.5 Q10 10.5 18 8.5 Q20.5 12 16 15 Q10.5 18 4 14.5 Z" />
    <path d="M10.5 12.5 Q13 8.5 16.5 10.5" />
    <path d="M18 8.5 L20.5 7.5" />
    <path d="M12.4 11.8 Q14.2 10 16 11" />
    <path d="M7.4 13.8 Q9.4 14.9 11.4 14.4" />
    {/* Forked tail — the one stroke that stops the silhouette reading as a leaf. */}
    <path d="M4 14.5 L1.6 12.4 M4 14.5 L2.2 16.9" />
  </Svg>
);

const Bell: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M7 17 Q7 8 12 6 Q17 8 17 17 Z" />
    <path d="M5 17 H19" />
    <circle cx={12} cy={19.5} r={1.3} />
    <path d="M9.2 16.4 Q9.2 9.6 12 8" />
    <circle cx={12} cy={4.4} r={1.2} />
  </Svg>
);

const OliveBranch: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M4 20 Q12 14 20 5" />
    <path d="M9 15 Q8 11.5 11.5 11" />
    <path d="M13 11 Q12 7.5 15.5 7" />
    <path d="M7 18 Q9.5 17.5 10 14.5" />
    <circle cx={10.6} cy={13.4} r={1.1} />
    <circle cx={14.8} cy={9.2} r={1.1} />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Jain — emblem and ornament only
   --------------------------------------------------------------------------- */

/**
 * The ahimsa emblem: the conventional stylised open palm bearing a wheel. It is
 * a symbol, not a depiction of a person — no figure and no face.
 */
const AhimsaHand: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M8 21 V11 Q8 9 10 9 H14 Q16 9 16 11 V21 Z" />
    <path d="M9.7 9 V5 M12 9 V3.6 M14.3 9 V5" />
    <path d="M8 13 Q6 12 5.7 14.5" />
    <circle cx={12} cy={16} r={2.6} />
    <path d="M12 13.4 V18.6 M9.4 16 H14.6" />
    <path d="M8.6 19.6 H15.4" />
  </Svg>
);

/** Stepped emblem with the crescent and dot above it. */
const StepEmblem: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M3 21 H21" />
    <path d="M5.5 21 V17.5 H18.5 V21" />
    <path d="M8 17.5 V14 H16 V17.5" />
    <path d="M10 14 V11 H14 V14" />
    <path d="M9 9 Q12 6 15 9" />
    <circle cx={12} cy={5} r={1.1} fill="currentColor" stroke="none" />
    <path d="M4.2 19.4 H19.8" />
    <path d="M10 10.4 Q12 8.6 14 10.4" />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Buddhist — symbol and ornament only
   --------------------------------------------------------------------------- */

const DharmaWheel: Motif = ({ size }) => (
  <Svg size={size}>
    <circle cx={12} cy={12} r={8} />
    <circle cx={12} cy={12} r={2.2} />
    <path d="M12 4 V9.8 M12 14.2 V20 M4 12 H9.8 M14.2 12 H20" />
    <path d="M6.3 6.3 L10.4 10.4 M13.6 13.6 L17.7 17.7 M17.7 6.3 L13.6 10.4 M10.4 13.6 L6.3 17.7" />
    <circle cx={12} cy={12} r={9.6} />
    <circle cx={12} cy={12} r={3.8} />
  </Svg>
);

const BodhiLeaf: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M12 4 Q19 7 19 13 Q19 17.5 12 21 Q5 17.5 5 13 Q5 7 12 4 Z" />
    <path d="M12 5.5 V21" />
    {/*
      Three mirrored pairs, herringbone fashion. Anything sparser than this —
      one vein each way, or two pairs far enough apart to read separately —
      turns the midrib and its diagonals into a peace sign inside a circle,
      which is not what a bodhi leaf is. Repetition is what makes it venation.
    */}
    <path d="M12 9 L16.2 11.6" />
    <path d="M12 9 L7.8 11.6" />
    <path d="M12 12.8 L15.4 15.2" />
    <path d="M12 12.8 L8.6 15.2" />
    <path d="M12 16.4 L14.4 18.4" />
    <path d="M12 16.4 L9.6 18.4" />
  </Svg>
);

const EndlessKnot: Motif = ({ size }) => (
  <Svg size={size}>
    <path d="M9 5 Q5 5 5 9" />
    <path d="M15 5 Q19 5 19 9" />
    <path d="M9 19 Q5 19 5 15" />
    <path d="M15 19 Q19 19 19 15" />
    <path d="M9 5 V19 M15 5 V19 M5 9 H19 M5 15 H19" />
    <path d="M8 2.4 Q2.4 2.4 2.4 8 V16 Q2.4 21.6 8 21.6 H16 Q21.6 21.6 21.6 16 V8 Q21.6 2.4 16 2.4 Z" />
    <path d="M12 10.4 L13.6 12 L12 13.6 L10.4 12 Z" />
  </Svg>
);

/* ---------------------------------------------------------------------------
   Registries
   --------------------------------------------------------------------------- */

const OCCASION_MOTIFS: Record<OccasionId, readonly Motif[]> = {
  wedding: [Petal, Ring, FloralSprig],
  engagement: [Ring, Heart, Petal],
  birthday: [Balloon, Confetti, Star],
  babyShower: [Star, Cloud, Footprint, Moon],
  housewarming: [Diya, House, Leaf],
  anniversary: [Petal, Ring, Star],
  corporate: [Dot, ThinLine, GeoShape],
  other: [Petal, Star, Dot],
};

const TRADITION_MOTIFS: Record<TraditionId, readonly Motif[]> = {
  none: [],
  hindu: [Diya, Kalash, Om, Swastika, Mandala, Lotus, MangoToran],
  muslim: [EightPointStar, Arabesque, Crescent, Lantern, PointedArch],
  sikh: [Khanda, IkOnkar, GurudwaraArch, Lotus],
  christian: [Cross, Dove, Bell, OliveBranch],
  jain: [AhimsaHand, Swastika, Lotus, StepEmblem],
  buddhist: [DharmaWheel, Lotus, BodhiLeaf, EndlessKnot],
};

/** Neutral ornament, used as the fallback so a scatter is never empty. */
const NEUTRAL_MOTIFS: readonly Motif[] = [Petal, Star, Dot, Floral];

/**
 * Resolves the motif set for a card: occasion motifs alone when no tradition is
 * chosen, otherwise a blend of both. Returns 3 to 5 distinct shapes so the
 * scatter reads as varied rather than repetitive.
 */
export function getMotifs(
  occasionId: OccasionId,
  traditionId: TraditionId,
): readonly Motif[] {
  const occasion = OCCASION_MOTIFS[occasionId] ?? NEUTRAL_MOTIFS;

  if (traditionId === "none") {
    return occasion.length > 0 ? occasion : NEUTRAL_MOTIFS;
  }

  const tradition = TRADITION_MOTIFS[traditionId] ?? [];

  /*
    Deduplicate: a motif can legitimately belong to both lists — a housewarming
    and a Hindu card both want a diya — and a repeat in a five-shape scatter is
    very visible. Skipping duplicates and topping up from the rest of the
    tradition set keeps the count without the repetition.
  */
  const blended: Motif[] = [];

  for (const motif of [...occasion.slice(0, 2), ...tradition]) {
    if (!blended.includes(motif)) {
      blended.push(motif);
    }
    if (blended.length === 5) {
      break;
    }
  }

  return blended.length > 0 ? blended : NEUTRAL_MOTIFS;
}

