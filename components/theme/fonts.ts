import { Manrope } from "next/font/google";

/**
 * The light theme's body face, Manrope, at the four weights DESIGN.md names.
 *
 * Its own instance, not the card pair's in app/layout.tsx: that one is not
 * preloaded (a card fetches it only if its pair uses it) and stops at 600.
 * Declared in a module only the host pages import (through PaperTheme and the
 * landing page), so the preload is on those pages alone and never on a guest's
 * invitation. Exposed as --font-paper-sans and read through --paper-sans in
 * globals.css, which ends in Noto Sans Devanagari.
 */
export const paperSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-paper-sans",
});
