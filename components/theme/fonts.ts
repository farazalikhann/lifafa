import { Fraunces, Manrope } from "next/font/google";

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

/**
 * The home page's headings: Fraunces at 600 alone, a static cut.
 *
 * The site's own Fraunces (app/layout.tsx) is the variable font, every
 * weight from 100 to 900 in one file, because the editor and the cards set
 * it at several. Every heading on the home page is 600, and the static 600
 * is half the size (17 KB to the variable's 36 KB, and the same again for
 * the rupee sign's subset). The page that is measured on a first visit gets
 * the small one; it is exposed as --font-paper-display, which --paper-display
 * in globals.css prefers where it is set, on the home page alone.
 */
export const paperDisplay = Fraunces({
  subsets: ["latin"],
  weight: "600",
  display: "swap",
  variable: "--font-paper-display",
});
