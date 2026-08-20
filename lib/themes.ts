import type { ThemeId } from "@/types/event";

/**
 * Card themes. Colours are raw hex rather than Tailwind classes so CardPreview
 * can drop them straight into inline styles and switch with no reflow of
 * class names. Font families point at the next/font variables already loaded
 * in app/layout.tsx.
 */
export interface Theme {
  id: ThemeId;
  label: string;
  background: string;
  surface: string;
  accent: string;
  textPrimary: string;
  textMuted: string;
  fontFamily: string;
}

const DISPLAY_SERIF = "var(--font-display), Georgia, serif";
const DISPLAY_SANS = "var(--font-sans), system-ui, sans-serif";

export const THEMES: readonly Theme[] = [
  {
    id: "marigold",
    label: "Marigold",
    background: "#12100E",
    surface: "#1A1714",
    accent: "#E8A33D",
    textPrimary: "#F7F1E8",
    textMuted: "#A1968A",
    fontFamily: DISPLAY_SERIF,
  },
  {
    id: "rose",
    label: "Rose",
    background: "#F7F1E8",
    surface: "#FFFCF6",
    accent: "#B23E56",
    textPrimary: "#2B1D1F",
    textMuted: "#8B7A72",
    fontFamily: DISPLAY_SERIF,
  },
  {
    id: "emerald",
    label: "Emerald",
    background: "#0B0E0C",
    surface: "#141A16",
    accent: "#5E9C7C",
    textPrimary: "#EAF1EC",
    textMuted: "#8FA398",
    fontFamily: DISPLAY_SANS,
  },
] as const;

export const DEFAULT_THEME_ID: ThemeId = "marigold";

/** Always resolves — an unknown id falls back to the first theme. */
export function getTheme(id: ThemeId): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
