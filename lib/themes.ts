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
  /**
   * The heading face for the reply form, confirmation and pass beside a card.
   * Set only by effectiveTheme, from the card's font pair; absent, they use
   * DISPLAY_FACE.
   */
  displayFontFamily?: string;
  /** The pair's heading weight, to go with displayFontFamily. */
  displayFontWeight?: number;
  /**
   * Which ink each kind of line is set in. Set only by effectiveTheme, and
   * read only through `textRoles`.
   */
  roles?: TextRoles;
}

/**
 * The inks of the lines that are not simply `textPrimary` or `textMuted`.
 *
 * A card has a Primary and a Secondary text colour, and which a line takes is
 * a matter of what the line is. Most were already in the right one: the names
 * in `textPrimary`, a caption in `textMuted`. These five are the kinds of line
 * that were not, and on a card saved before the two inks existed each keeps
 * the colour it always had — named beside it — so such a card does not change.
 */
export interface TextRoles {
  /** Section headings, the date's numeral, countdown digits, a mantra's script line. Was the accent. Primary. */
  heading: string;
  /** The event's title under the names. Was the muted colour. Primary. */
  title: string;
  /** Parents, a venue's name, a weekday, a year and a time. Was the primary colour. Secondary. */
  detail: string;
  /** Small text that was set in the accent: the joining word, a ceremony's time. Secondary. */
  mark: string;
  /** Long passages: a message, a host's own paragraph. Was the muted colour. Secondary, a little quieter where it can be. */
  body: string;
}

/**
 * The roles of a theme: its own, when effectiveTheme composed it, and the
 * colours each kind of line has always had when it did not.
 */
export function textRoles(theme: Theme): TextRoles {
  return (
    theme.roles ?? {
      heading: theme.accent,
      title: theme.textMuted,
      detail: theme.textPrimary,
      mark: theme.accent,
      body: theme.textMuted,
    }
  );
}

const DISPLAY_SERIF = "var(--font-display), Georgia, serif";
const DISPLAY_SANS = "var(--font-sans), system-ui, sans-serif";

const THEMES: readonly Theme[] = [
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

/** Always resolves — an unknown id falls back to the first theme. */
export function getTheme(id: ThemeId): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
