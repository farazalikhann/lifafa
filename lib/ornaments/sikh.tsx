import { calligraphyOrnament, imageOrnament } from "@/lib/ornaments/frame";
import type { Ornament } from "@/lib/ornaments/frame";
import { calligraphyAspect } from "@/lib/calligraphy";
import type { SikhOrnamentId } from "@/types/sikhOrnament";

/**
 * The Sikh ornament pack: five photographs of gold work, and one character.
 *
 * The khanda, the Nishan Sahib, the lotus, the phulkari band and the
 * gurudwara arch were line drawings in the card's accent. They are pictures
 * now, cut out of the supplied artwork by scripts/cut-flowers.mjs and
 * published to public/decor/sikh/, under the ids the drawings had: a card
 * saved with any of them loads as it always did and shows the picture.
 *
 * EACH HAS A PLACE, and is drawn there and nowhere else — see `slots` on the
 * Sikh pack in lib/traditionPacks.tsx. The khanda, Ik Onkar and the Nishan
 * Sahib are emblems of the faith, not decoration to be sprinkled: none of
 * them is ever scattered behind the writing or stood at the foot of the card,
 * and the khanda and Ik Onkar are never mirrored or turned (`uprightOnly`).
 *
 * NO FIGURE IS DRAWN. No Guru, no human, no face. Emblems, architecture and
 * plants.
 */

/* ---------------------------------------------------------------------------
   Ik Onkar
   --------------------------------------------------------------------------- */

/**
 * Ik Onkar, as the character it is: ੴ, U+0A74, set in Noto Sans Gurmukhi —
 * the face app/layout.tsx already loads for every Gurmukhi line on the card —
 * and filled with gold, over a shade of itself for depth.
 *
 * THE SUPPLIED ARTWORK IS NOT USED, AND THIS IS WHY. A gold Ik Onkar was
 * supplied with the other five pictures. Set beside the character from the
 * font, its arc is different: in the character the stroke that rises from the
 * head of the letter is one open sweep over it, ending in a hook at the far
 * right. In the artwork that stroke comes back down onto the right end of the
 * top bar, closing the space above the bar, and a second arc rises from
 * there. The numeral, the bar, the middle stroke and the bowl agree; the arc
 * does not. This is the opening of the Mool Mantar, and a letterform that is
 * nearly right is wrong. A font's glyph is the character by construction, so
 * the font is what is drawn. If corrected artwork arrives, it goes in PICTURES
 * below under this id and nothing else changes.
 *
 * An svg rather than a span of text, so it is sized by `size` like every
 * other ornament. The viewBox is the glyph's own inked box at a 100 unit em,
 * measured: 4 to 162 across, 89 above the baseline and 1 below.
 */
const IK_ONKAR_BOX = { width: 166, height: 98 } as const;

const IkOnkar: Ornament = ({ size = 64, className, style, instanceId = "ik-onkar" }) => {
  const gradient = `${instanceId}-gold`;
  const glyph = {
    x: 0,
    y: 93,
    fontSize: 100,
    fontWeight: 700,
    style: { fontFamily: "var(--font-gurmukhi), 'Noto Sans Gurmukhi', sans-serif" },
  };

  return (
    <svg
      viewBox={`0 0 ${IK_ONKAR_BOX.width} ${IK_ONKAR_BOX.height}`}
      width={className === undefined ? Math.round(size) : undefined}
      height={
        className === undefined
          ? Math.round((size * IK_ONKAR_BOX.height) / IK_ONKAR_BOX.width)
          : undefined
      }
      className={className ?? "block max-w-none select-none"}
      style={style}
      lang="pa"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F8E3A1" />
          <stop offset="0.45" stopColor="#E0B65A" />
          <stop offset="1" stopColor="#A9782A" />
        </linearGradient>
      </defs>
      {/* Its own shade, a hair down and to the right: the look of a thing raised off the page. */}
      <text {...glyph} x={1.6} y={95} fill="#5E3D0C" opacity={0.55}>
        ੴ
      </text>
      <text {...glyph} fill={`url(#${gradient})`}>
        ੴ
      </text>
    </svg>
  );
};

/* ---------------------------------------------------------------------------
   The pictures
   --------------------------------------------------------------------------- */

/** The published files, and each one's width over its height. */
const PICTURES = {
  khanda: { src: "/decor/sikh/khanda.webp", aspect: 240 / 260 },
  lotus: { src: "/decor/sikh/lotus-sikh.webp", aspect: 260 / 220 },
  nishanSahibPennant: { src: "/decor/sikh/nishan-sahib.webp", aspect: 171 / 360 },
  gurudwaraArch: { src: "/decor/sikh/gurudwara-arch.webp", aspect: 601 / 900 },
  kandaFloralBorder: { src: "/decor/sikh/phulkari-border.webp", aspect: 1200 / 190 },
} as const;

const Khanda = imageOrnament(PICTURES.khanda.src, PICTURES.khanda.aspect);
const Lotus = imageOrnament(PICTURES.lotus.src, PICTURES.lotus.aspect);
const NishanSahibPennant = imageOrnament(
  PICTURES.nishanSahibPennant.src,
  PICTURES.nishanSahibPennant.aspect,
);
const GurudwaraArch = imageOrnament(PICTURES.gurudwaraArch.src, PICTURES.gurudwaraArch.aspect);
const KandaFloralBorder = imageOrnament(
  PICTURES.kandaFloralBorder.src,
  PICTURES.kandaFloralBorder.aspect,
);

/**
 * Where the gurudwara arch's doorway is, as shares of its picture: the box
 * the names are set in, clear of the pillars either side and of the cusped
 * arch above. Measured on the published file, whose doorway runs from 15.5%
 * to 84.5% across between the pillars, under an arch whose crown is at 25%
 * and whose springing is at about 40%.
 */
export const GURUDWARA_ARCH_DOORWAY = { x: 0.215, y: 0.385, width: 0.57, height: 0.555 } as const;

/* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- *//* ---------------------------------------------------------------------------
   Registry
   --------------------------------------------------------------------------- */

/** Each drawing's width over its height, from its own viewBox. */
export const SIKH_ORNAMENT_ASPECT: Record<SikhOrnamentId, number> = {
  khanda: PICTURES.khanda.aspect,
  gurudwaraArch: PICTURES.gurudwaraArch.aspect,
  lotus: PICTURES.lotus.aspect,
  nishanSahibPennant: PICTURES.nishanSahibPennant.aspect,
  kandaFloralBorder: PICTURES.kandaFloralBorder.aspect,
  ikOnkar: IK_ONKAR_BOX.width / IK_ONKAR_BOX.height,
  /* Not viewBoxes: the published crops each calligraphy's pair of files shares. */
  ikOnkarCalligraphy: calligraphyAspect("ikOnkarCalligraphy"),
  satnamWaheguru: calligraphyAspect("satnamWaheguru"),
  anandKaraj: calligraphyAspect("anandKaraj"),
  shubhVivaah: calligraphyAspect("shubhVivaah"),
  guruKirpa: calligraphyAspect("guruKirpa"),
  ikDoojeDeSang: calligraphyAspect("ikDoojeDeSang"),
  doRoohanIkRaah: calligraphyAspect("doRoohanIkRaah"),
  waheguru: calligraphyAspect("waheguru"),
  sarbatDaBhala: calligraphyAspect("sarbatDaBhala"),
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
  /** The published file, for the card to preload. Absent for Ik Onkar, which is type. */
  src?: string;
  /** Never mirrored and never turned: an emblem, not a pattern. */
  uprightOnly?: boolean;
}

/* ---------------------------------------------------------------------------
   Calligraphy
   --------------------------------------------------------------------------- */

/**
 * The nine Gurmukhi word-marks, from the shared factory in
 * lib/ornaments/frame.tsx. lib/calligraphy.ts holds their files, what each is
 * meant to say, and how the dark version was made.
 */
const IkOnkarCalligraphy = calligraphyOrnament("ikOnkarCalligraphy");
const SatnamWaheguru = calligraphyOrnament("satnamWaheguru");
const AnandKaraj = calligraphyOrnament("anandKaraj");
const ShubhVivaah = calligraphyOrnament("shubhVivaah");
const GuruKirpa = calligraphyOrnament("guruKirpa");
const IkDoojeDeSang = calligraphyOrnament("ikDoojeDeSang");
const DoRoohanIkRaah = calligraphyOrnament("doRoohanIkRaah");
const Waheguru = calligraphyOrnament("waheguru");
const SarbatDaBhala = calligraphyOrnament("sarbatDaBhala");

/**
 * The pack. The first six have places on the card (see `slots` on the Sikh
 * pack) and the editor groups them by place; the rest are calligraphy.
 *
 * Two Ik Onkars, and they are different things. `ikOnkar` is the character,
 * in gold, for the place above the names. `ikOnkarCalligraphy` is one of the
 * nine word-marks that head the card: supplied artwork, published as it was
 * given, which still wants a Punjabi reader to check it against the files, as
 * every Gurmukhi piece beside it does.
 */
export const SIKH_ORNAMENTS: readonly SikhOrnamentEntry[] = [
  {
    id: "kandaFloralBorder",
    label: "Phulkari border",
    Component: KandaFloralBorder,
    chipSize: 84,
    topRegionOnly: true,
    src: PICTURES.kandaFloralBorder.src,
  },
  {
    id: "ikOnkar",
    label: "Ik Onkar",
    Component: IkOnkar,
    chipSize: 62,
    topRegionOnly: true,
    uprightOnly: true,
  },
  {
    id: "khanda",
    label: "Khanda",
    Component: Khanda,
    chipSize: 40,
    topRegionOnly: true,
    src: PICTURES.khanda.src,
    uprightOnly: true,
  },
  {
    id: "gurudwaraArch",
    label: "Gurudwara arch",
    Component: GurudwaraArch,
    chipSize: 40,
    topRegionOnly: false,
    src: PICTURES.gurudwaraArch.src,
  },
  {
    id: "nishanSahibPennant",
    label: "Nishan Sahib",
    Component: NishanSahibPennant,
    chipSize: 40,
    topRegionOnly: true,
    src: PICTURES.nishanSahibPennant.src,
  },
  {
    id: "lotus",
    label: "Lotus",
    Component: Lotus,
    chipSize: 44,
    topRegionOnly: false,
    src: PICTURES.lotus.src,
  },
  {
    id: "ikOnkarCalligraphy",
    label: "Ik Onkar",
    Component: IkOnkarCalligraphy,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "satnamWaheguru",
    label: "Satnam Waheguru",
    Component: SatnamWaheguru,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "anandKaraj",
    label: "Anand Karaj",
    Component: AnandKaraj,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "shubhVivaah",
    label: "Shubh Vivaah",
    Component: ShubhVivaah,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "guruKirpa",
    label: "Guru Kirpa",
    Component: GuruKirpa,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "ikDoojeDeSang",
    label: "Ik Dooje De Sang",
    Component: IkDoojeDeSang,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "doRoohanIkRaah",
    label: "Do Roohan Ik Raah",
    Component: DoRoohanIkRaah,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "waheguru",
    label: "Waheguru",
    Component: Waheguru,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
  {
    id: "sarbatDaBhala",
    label: "Sarbat Da Bhala",
    Component: SarbatDaBhala,
    /* Unused: the panel gives calligraphy its own grid and sizes it with CSS. */
    chipSize: 84,
    topRegionOnly: false,
  },
];

/** Sits under the ornament grid in the editor. */
export const SIKH_ORNAMENTS_NOTE =
  "Each has its own place on your card. Tap one again to take it off.";
