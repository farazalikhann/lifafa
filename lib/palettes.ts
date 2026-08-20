import type { PaletteId } from "@/types/style";

/**
 * Card colour palettes.
 *
 * Hex only, so CardCanvas can drop them straight into inline styles and switch
 * with no reflow. These sit on top of lib/themes.ts rather than replacing it —
 * the three original themes still exist and still resolve.
 *
 * Every palette below was measured, not eyeballed: textPrimary clears 4.5:1 and
 * textMuted clears 3:1 against BOTH background and surface. The tightest pair is
 * cream's textMuted at 3.65:1.
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
    accent: "#B23E56",
    textPrimary: "#2B1D1F",
    textMuted: "#8B7A72",
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
    accent: "#B85C38",
    textPrimary: "#3A2420",
    textMuted: "#8A6A60",
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
    textMuted: "#7A6A55",
  },
];

export const DEFAULT_PALETTE_ID: PaletteId = "ink";

/** Always resolves — an unknown id falls back to the first palette. */
export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0];
}
