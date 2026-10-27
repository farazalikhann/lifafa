import { Manrope } from "next/font/google";

/**
 * The landing page's body face, Manrope, at the four weights DESIGN.md names.
 *
 * Its own instance, not the card pair's in app/layout.tsx: that one is not
 * preloaded (a card fetches it only if its pair uses it) and stops at 600.
 * Declared in a module only the landing page imports, so the preload is on
 * the landing page alone. Exposed as --font-paper-sans and read through
 * --paper-sans in globals.css, which ends in Noto Sans Devanagari.
 */
export const paperSans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-paper-sans",
});
