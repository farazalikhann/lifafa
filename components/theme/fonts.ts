import "@/app/fonts/paper.css";

/**
 * The light theme's own faces, for the host pages (through PaperTheme and the
 * landing page): Manrope at the four weights DESIGN.md names, and the home
 * page's headings in a static Fraunces 600, half the size of the site's
 * variable Fraunces. Declared in app/fonts/paper.css, from the font files in
 * app/fonts/files/, and only on the pages that import this module.
 *
 * Each is a class that sets its variable, put on the element the light theme
 * starts at: --font-paper-sans (read through --paper-sans in globals.css,
 * which ends in Noto Sans Devanagari) and --font-paper-display (preferred by
 * --paper-display where it is set, on the home page alone).
 */
export const paperSans = { variable: "lifafa-font-paper-sans" } as const;
export const paperDisplay = { variable: "lifafa-font-paper-display" } as const;
