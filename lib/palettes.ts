import type { PaletteId } from "@/types/style";

/**
 * Card colour palettes.
 *
 * Hex only, so CardCanvas can drop them straight into inline styles and switch
 * with no reflow. These sit on top of lib/themes.ts rather than replacing it —
 * the three original themes still exist and still resolve.
 *
 * Every palette below was measured, not eyeballed. Both text colours and the
 * accent clear 4.5:1 against BOTH background and surface, and they still clear
 * 4.5:1 against the worst case the decor layer can produce — a solid wash of the
 * accent at DECOR_MAX_ALPHA (see components/card/decor/DecorLayer.tsx) lying
 * between the text and the background. The tightest pair is cream's textMuted at
 * 4.52:1 over decor, 5.66:1 flat.
 *
 * textMuted is held to 4.5:1 rather than 3:1 because every place that uses it
 * renders small text — 0.6875rem uppercase and text-xs — which is not "large
 * text" under WCAG and so gets no relaxed threshold.
 */
export interface Palette {
  id: PaletteId;
  label: string;
  background: string;
  surface: string;
  accent: string;
  textPrimary: string;
  textMuted: string;
}

export const PALETTES: readonly Palette[] = [
  {
    id: "ink",
    label: "Ink",
    background: "#12100E",
    surface: "#1A1714",
    accent: "#E8A33D",
    textPrimary: "#F7F1E8",
    textMuted: "#A1968A",
  },
  {
    id: "cream",
    label: "Cream",
    background: "#F7F1E8",
    surface: "#FFFCF6",
    accent: "#A4394F",
    textPrimary: "#2B1D1F",
    textMuted: "#6C5C57",
  },
  {
    id: "forest",
    label: "Forest",
    background: "#0B0E0C",
    surface: "#141A16",
    accent: "#5E9C7C",
    textPrimary: "#EAF1EC",
    textMuted: "#8FA398",
  },
  {
    id: "blush",
    label: "Blush",
    background: "#FBEEEA",
    surface: "#FFF7F4",
    accent: "#974B2E",
    textPrimary: "#3A2420",
    textMuted: "#785A51",
  },
  {
    id: "midnight",
    label: "Midnight",
    background: "#0E1424",
    surface: "#161E33",
    accent: "#D8B26A",
    textPrimary: "#ECF0F8",
    textMuted: "#9AA6C0",
  },
  {
    id: "sand",
    label: "Sand",
    background: "#EFE6D9",
    surface: "#F8F2E9",
    accent: "#6B4A2F",
    textPrimary: "#2E2418",
    textMuted: "#655644",
  },
];

export const DEFAULT_PALETTE_ID: PaletteId = "ink";

/** Always resolves — an unknown id falls back to the first palette. */
export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0];
}
