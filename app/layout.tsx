import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Inter,
  Lora,
  Noto_Naskh_Arabic,
  Noto_Sans_Devanagari,
  Noto_Sans_Gurmukhi,
} from "next/font/google";
import "./globals.css";

/*
  Every face the card can use is loaded here, once, and exposed as a CSS
  variable on <html>. Components never load fonts: next/font hashes and
  self-hosts each face at build time, and loading one from a component would
  lose the preload and risk a flash of fallback text.
*/

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

/* Not a variable font, so the two weights actually used are named. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-cormorant",
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lora",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

/*
  The only face here that is not a Latin one, and the only one loaded for a
  script rather than for a look.

  Arabic set in a Latin display face falls back to whatever the device happens
  to have, which across phones means anything from a proper naskh to a UI
  sans — and a sans strips the joins and the stacked diacritics that the words
  are actually made of. Naskh is the standard book face for this text.

  The "arabic" subset only: pulling "latin" too would ship a second Latin face
  the card never sets. It is wired to the Arabic elements alone, through
  --lifafa-arabic in globals.css, so no Latin text can inherit it.
*/
const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-arabic",
});

/*
  The second face loaded for a script rather than for a look, on the same terms
  as the Arabic above.

  Not a cut of the Naskh family — Noto Naskh Arabic ships arabic, latin, math
  and symbols and has no Devanagari, so there is no way to set both scripts in
  one family and the two are matched by weight and colour instead.

  Devanagari left to a device default lands on whatever is installed: Nirmala UI
  on Windows, Kohinoor on iOS, something arbitrary elsewhere, each with its own
  metrics — which is why the line-height in globals.css is set for the worst of
  them and not just for this face.

  The "devanagari" subset only. Worth being exact about what that does, because
  the build output does not look like it at a glance: `subsets` chooses what is
  PRELOADED, not what is emitted. next/font writes an @font-face for every
  subset the family publishes — checked against a real build, this one emits
  three, devanagari plus latin and latin-ext — and only the listed one gets the
  preload and is fetched eagerly. The Latin cuts are dead weight in the CSS and
  nothing more: they are downloaded only if some Latin glyph is rendered in this
  family, and the family reaches the Devanagari elements alone through
  --lifafa-devanagari. Adding "latin" here would preload one of those for real,
  which is the thing to avoid.
*/
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  variable: "--font-devanagari",
});

/*
  The third face loaded for a script rather than for a look, on the same terms
  as the Arabic and the Devanagari above.

  Gurmukhi left to a device default lands on whatever is installed, and on a
  great many phones that is nothing at all — the text comes out as boxes rather
  than as a wrong-looking face, which is the failure mode that makes this one
  worth loading rather than optional.

  The "gurmukhi" subset only. As with the other two, `subsets` chooses what is
  PRELOADED rather than what is emitted: next/font writes an @font-face for
  every subset the family publishes and preloads just this one. It reaches the
  Gurmukhi elements alone through --lifafa-gurmukhi, so no Latin text can
  inherit it.

  The Jain pack needs NO face of its own — it sets Devanagari, which is already
  loaded above. Christian and Buddhist need none either: both are Latin. Six
  packs, three script faces.
*/
const notoSansGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ["gurmukhi"],
  display: "swap",
  variable: "--font-gurmukhi",
});

const FONT_VARIABLES = [
  fraunces.variable,
  inter.variable,
  cormorant.variable,
  lora.variable,
  dmSans.variable,
  notoNaskhArabic.variable,
  notoSansDevanagari.variable,
  notoSansGurmukhi.variable,
].join(" ");

export const metadata: Metadata = {
  metadataBase: new URL("https://getlifafa.co.in"),
  title: "Lifafa | Digital invitations with a live guest count",
  description:
    "Create a digital invitation for your celebration, share one link, and know exactly how many guests are coming before the day arrives.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-IN" className={FONT_VARIABLES}>
      <body className="bg-[var(--lifafa-ink)] font-[family-name:var(--font-sans)] text-[var(--lifafa-cream)] antialiased">
        {children}
      </body>
    </html>
  );
}
