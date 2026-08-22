import { Frame, flowerPath, leafPath, r2 } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import type { SikhOrnamentId } from "@/types/sikhOrnament";

/**
 * Hand drawn Sikh ornament pack.
 *
 * Same rules as every other pack: stroke based line art in `currentColor`, each
 * shape carrying a second layer of drawing — a vein, a rib, an inner tracery —
 * beyond the silhouette, because at 64px a bare outline reads as one blown-up
 * icon rather than as ornament. Nothing here is filled.
 *
 * NO FIGURE IS DRAWN. No Guru, no human, no face, not even a stylised one.
 * These are emblems, architecture and plants. That rule is not inherited from
 * the Muslim pack's reasoning — it is this tradition's own, and it is not up
 * for reopening per ornament.
 *
 * THE IK ONKAR GLYPH IS DELIBERATELY ABSENT. It was asked for and is not here;
 * see the note above SIKH_ORNAMENTS at the bottom of this file for why, and for
 * what to do instead.
 *
 * No Gurmukhi is drawn either. Script belongs in lib/gurmukhiContent.ts, where
 * it is reviewed and can be corrected; a letterform baked into a path cannot.
 */

/* ---------------------------------------------------------------------------
   Khanda
   --------------------------------------------------------------------------- */

/**
 * The emblem: the straight double-edged khanda up the middle, the chakkar ring
 * around it, and the two kirpans crossing behind.
 *
 * Objects and geometry only, which is what this emblem is made of.
 */
export const Khanda: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={SIKH_ORNAMENT_ASPECT.khanda}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/*
      Chakkar — the ring, held well inside the blades. It was drawn at nearly
      the kirpans' own radius before, and the three merged into one bracket
      shape at chip size; pulling it in is what lets each read separately.
    */}
    <circle cx={32} cy={36} r={12.4} />
    <circle cx={32} cy={36} r={9.6} />

    {/*
      Kirpans: one sweeping stroke each, curving out and back in to the tip,
      with a cross guard and pommel at the foot. Single stroke rather than two
      edges, so a blade stays a blade rather than closing into a lozenge.
    */}
    <path d="M 22 58 C 11 49 7.4 35 12 23.4 C 13.6 19.4 16.6 16.6 20 15.6" />
    <path d="M 19 55.6 L 25.4 61" />
    <circle cx={26.8} cy={62.4} r={1.8} />

    <path d="M 42 58 C 53 49 56.6 35 52 23.4 C 50.4 19.4 47.4 16.6 44 15.6" />
    <path d="M 45 55.6 L 38.6 61" />
    <circle cx={37.2} cy={62.4} r={1.8} />

    {/* Khanda — narrow, double edged, tapering to a point, with a central rib. */}
    <path d="M 32 6 C 29.6 12 28.6 18 28.6 25 C 28.6 32 30 38 32 43 C 34 38 35.4 32 35.4 25 C 35.4 18 34.4 12 32 6 Z" />
    <path d="M 32 11 V 39" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Gurudwara arch
   --------------------------------------------------------------------------- */

/**
 * A doorway under a fluted onion dome, open at the foot so content can sit
 * inside it. Architecture only.
 */
export const GurudwaraArch: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 100 140"
    aspect={SIKH_ORNAMENT_ASPECT.gurudwaraArch}
    size={size}
    strokeWidth={strokeWidth ?? 2}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Finial above the dome. */}
    <path d="M 50 4 V 12" />
    <circle cx={50} cy={2.6} r={1.6} />

    {/* Onion dome: shoulders wider than its base, drawn as one closed sweep. */}
    <path d="M 50 12 C 40 22 30 32 30 44 C 30 55 39 62 50 62 C 61 62 70 55 70 44 C 70 32 60 22 50 12 Z" />
    {/* Two flutes, the dome's second layer. */}
    <path d="M 42 18.6 C 36.6 28 34.4 36 35.4 46.6" />
    <path d="M 58 18.6 C 63.4 28 65.6 36 64.6 46.6" />

    {/* Plinth the dome stands on. */}
    <path d="M 26 62 H 74" />
    <path d="M 29 68 H 71" />

    {/* Jambs, and the cusped arch between them. Open at the bottom. */}
    <path d="M 24 138 V 92 C 24 78 36 68 50 68 C 64 68 76 78 76 92 V 138" />
    <path d="M 32 138 V 94 C 32 84 40 76.6 50 76.6 C 60 76.6 68 84 68 94 V 138" />

    {/* Springline imposts. */}
    <path d="M 24 94 H 32 M 68 94 H 76" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Lotus
   --------------------------------------------------------------------------- */

/** Eight open petals with an inner rosette. */
export const Lotus: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 64 64"
    aspect={SIKH_ORNAMENT_ASPECT.lotus}
    size={size}
    strokeWidth={strokeWidth ?? 1.4}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Outer petals, splayed from a common base at the flower's foot. */}
    {[
      [6.5, 34],
      [14, 20],
      [26, 13],
      [38, 13],
      [50, 20],
      [57.5, 34],
    ].map(([tipX, tipY]) => (
      <path key={`${tipX}-${tipY}`} d={leafPath(32, 47, tipX, tipY, 11)} />
    ))}

    {/* Cup the petals rise out of, and its rib — the second layer. */}
    <path d="M 15 41 C 20 51.6 44 51.6 49 41" />
    <path d="M 21 45.6 C 25 49.6 39 49.6 43 45.6" />

    {/* Heart of the flower. */}
    <path d={flowerPath(32, 34, 7.4, 6, 0.56)} />
    <circle cx={32} cy={34} r={2.6} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Nishan Sahib pennant
   --------------------------------------------------------------------------- */

/**
 * The triangular pennant on its staff.
 *
 * The flag carries a small ring-and-blade mark rather than a full khanda: at
 * the size this hangs, a complete emblem inside a 30px triangle is a blot, and
 * an emblem rendered as a blot is worse than one suggested.
 */
export const NishanSahibPennant: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 56 88"
    aspect={SIKH_ORNAMENT_ASPECT.nishanSahibPennant}
    size={size}
    strokeWidth={strokeWidth ?? 1.6}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {/* Staff, with a finial at the head and a collar below the flag. */}
    <circle cx={12} cy={5.6} r={2.2} />
    <path d="M 12 7.8 V 82" />
    <path d="M 8.6 46 H 15.4" />

    {/* Pennant: a long triangle with a swallow tail cut into its fly. */}
    <path d="M 12 12 L 50 24.6 L 38 30 L 50 35.4 L 12 44 Z" />

    {/* Mark on the field — ring and upright blade, not a full khanda. */}
    <circle cx={24.6} cy={27.6} r={4.4} />
    <path d="M 24.6 21 C 23 23.6 23 31.6 24.6 34.2 C 26.2 31.6 26.2 23.6 24.6 21 Z" />

    {/* Tassel at the staff's foot. */}
    <path d="M 12 82 L 8.4 87 M 12 82 L 12 87.4 M 12 82 L 15.6 87" />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Kanda floral border
   --------------------------------------------------------------------------- */

/** One repeat of the vine, in viewBox units. Four repeats fill the 160 box. */
const BORDER_UNIT = 40;
const BORDER_REPEATS = 4;

/**
 * A running floral band: a stem swinging above and below the centre line, a
 * five petal bloom on each crest and a paired leaf in each trough.
 */
export const KandaFloralBorder: Ornament = ({
  size,
  className,
  preserveAspectRatio,
  style,
  strokeWidth,
}) => (
  <Frame
    viewBox="0 0 160 28"
    aspect={SIKH_ORNAMENT_ASPECT.kandaFloralBorder}
    size={size}
    strokeWidth={strokeWidth ?? 1.3}
    className={className}
    preserveAspectRatio={preserveAspectRatio}
    style={style}
  >
    {Array.from({ length: BORDER_REPEATS }, (_unused, index) => {
      const x = index * BORDER_UNIT;

      return (
        <g key={x}>
          {/* Stem: one crest, one trough, so repeats join without a kink. */}
          <path
            d={`M ${x} 14 C ${r2(x + 6)} 5 ${r2(x + 14)} 5 ${r2(x + 20)} 14 C ${r2(x + 26)} 23 ${r2(x + 34)} 23 ${r2(x + 40)} 14`}
          />
          {/* Bloom on the crest. */}
          <path d={flowerPath(x + 10, 7.4, 4.2, 5, 0.58)} />
          <circle cx={x + 10} cy={7.4} r={1.3} />
          {/* Paired leaves in the trough. */}
          <path d={leafPath(x + 30, 20.6, x + 24.6, 25.4, 3.4)} />
          <path d={leafPath(x + 30, 20.6, x + 35.4, 25.4, 3.4)} />
        </g>
      );
    })}

    {/* End caps, so the run reads as a finished band and not a cropped one. */}
    <circle cx={2.2} cy={14} r={1.6} />
    <circle cx={157.8} cy={14} r={1.6} />
  </Frame>
);

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/** Each drawing's width over its height, from its own viewBox. */
export const SIKH_ORNAMENT_ASPECT: Record<SikhOrnamentId, number> = {
  khanda: 1,
  gurudwaraArch: 100 / 140,
  lotus: 1,
  nishanSahibPennant: 56 / 88,
  kandaFloralBorder: 160 / 28,
};

/** One ornament offered in the editor. The same shape as HinduOrnamentEntry. */
export interface SikhOrnamentEntry {
  id: SikhOrnamentId;
  /** Shown under the chip in the editor. Latin script only. */
  label: string;
  Component: Ornament;
  /** What `size` the editor's chip preview renders this at. */
  chipSize: number;
  /** Whether this ornament may only be placed in the card's top region. */
  topRegionOnly: boolean;
}

/**
 * The pack, in the order the editor lays out its chips.
 *
 * IK ONKAR IS NOT IN THIS LIST, AND ITS ABSENCE IS THE DECISION, not an
 * oversight. It was asked for with the option to omit it and say so, and this
 * is me saying so.
 *
 * The Ik Onkar glyph is not a decorative mark; it is the opening of the Mool Mantar, and it is a
 * script character. Drawing it means reconstructing a specific letterform from
 * memory and freezing it in a path — which is the one thing the content rule
 * for this whole feature forbids, and which nobody could later correct in
 * lib/gurmukhiContent.ts the way a string can be corrected. A khanda drawn
 * slightly wrong is a slightly wrong ornament. A sacred glyph drawn slightly
 * wrong is a different character, shipped at the head of somebody's wedding
 * invitation.
 *
 * If it should appear on a card, the right route is already built: add it as
 * the `ikOnkar` GREETING in lib/gurmukhiContent.ts, where it is real text in a
 * real Gurmukhi face, correctable under review, selectable, and read out rather
 * than hidden behind aria-hidden as every ornament here is. That entry exists
 * and is waiting for its string.
 */
export const SIKH_ORNAMENTS: readonly SikhOrnamentEntry[] = [
  {
    id: "nishanSahibPennant",
    label: "Nishan Sahib",
    Component: NishanSahibPennant,
    chipSize: 40,
    topRegionOnly: false,
  },
  { id: "khanda", label: "Khanda", Component: Khanda, chipSize: 36, topRegionOnly: false },
  { id: "lotus", label: "Lotus", Component: Lotus, chipSize: 36, topRegionOnly: false },
  {
    id: "kandaFloralBorder",
    label: "Floral border",
    Component: KandaFloralBorder,
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "gurudwaraArch",
    label: "Gurudwara arch",
    Component: GurudwaraArch,
    chipSize: 40,
    topRegionOnly: false,
  },
];

/** Sits under the ornament grid in the editor. */
export const SIKH_ORNAMENTS_NOTE =
  "The Nishan Sahib hangs from the top of your card.";

const BY_ID: Record<SikhOrnamentId, Ornament> = {
  khanda: Khanda,
  gurudwaraArch: GurudwaraArch,
  lotus: Lotus,
  nishanSahibPennant: NishanSahibPennant,
  kandaFloralBorder: KandaFloralBorder,
};

export function getSikhOrnament(id: SikhOrnamentId): Ornament {
  return BY_ID[id];
}
