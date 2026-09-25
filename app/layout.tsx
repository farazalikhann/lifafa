import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import {
  Amiri,
  Amita,
  Bodoni_Moda,
  Cinzel,
  Cormorant_Garamond,
  DM_Sans,
  Eczar,
  Fraunces,
  Great_Vibes,
  Hind,
  Inter,
  Josefin_Sans,
  Kurale,
  Lato,
  Manrope,
  Montserrat,
  Nunito,
  Raleway,
  Laila,
  Lora,
  Marcellus,
  Martel,
  Noto_Sans_Devanagari,
  Noto_Sans_Gurmukhi,
  Noto_Serif_Devanagari,
  Parisienne,
  Pinyon_Script,
  Playfair_Display,
  Poppins,
  Rozha_One,
  Tillana,
  Tiro_Devanagari_Hindi,
} from "next/font/google";
import { PAIR_FONT_STACKS } from "@/lib/fontPairs";
import { canonicalSiteOrigin } from "@/lib/siteUrl";
import "./globals.css";

/*
  Every face the card can use is declared here, once, and exposed as a CSS
  variable on <html>. Components never load fonts: next/font hashes and
  self-hosts each face at build time.

  Declaring a face costs a guest nothing. It adds an @font-face rule to the
  stylesheet, and a browser fetches the file behind that rule only when some
  text on the page is actually set in it — so a card in the Royal pair pulls
  Great Vibes and Cormorant and never touches Cinzel or Bodoni, even though
  all of them are declared on every page.

  What would undo that is a preload, which fetches the file whether anything
  uses it or not. So only the two faces the site itself is set in, Fraunces
  and Inter, keep next/font's default preload. Every face that is there for a
  card pair or for a script is `preload: false`: the invite that uses it
  starts the download as soon as its text is laid out, and `display: "swap"`
  shows that text in the fallback until the file arrives.
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

/*
  Headings at 600 in Elegant, Royal and Regal, and the body text of Regal at
  400, 500 and 600. Weights are named so only those cuts exist.
*/
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-cormorant",
});

const lora = Lora({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-lora",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-dm-sans",
});

/*
  The wedding pairs. The three scripts — Great Vibes, Parisienne, Pinyon
  Script — set the couple's names on the cover and nothing else; see `names`
  in lib/fontPairs.ts. Each comes in one weight, and every other face names
  only the weights its pair asks for.
*/
const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-great-vibes",
});

const parisienne = Parisienne({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-parisienne",
});

const pinyonScript = Pinyon_Script({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-pinyon",
});

/* Regal's names and headings. */
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  preload: false,
  variable: "--font-cinzel",
});

/* Romantic's headings; its body is Lora, above. */
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  display: "swap",
  preload: false,
  variable: "--font-playfair",
});

/* Graceful's headings and body. Marcellus has a single weight. */
const marcellus = Marcellus({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-marcellus",
});

/* Luxe's names and headings. */
const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  preload: false,
  variable: "--font-bodoni",
});

/* Luxe's body text, at the three weights the card and reply form use. */
const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-josefin",
});

/*
  Body faces of their own for five pairs that used to share one: Modern,
  Elegant and Warm set their text in Inter, the same as Classic, and Royal and
  Graceful set it in their heading face. Switching between those changed the
  headings and nothing else. Each is named at the weights the card and the
  reply form set text in (400, 500, 600), and none is preloaded: a face is
  fetched only by a card whose pair uses it.
*/
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-manrope",
});

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-raleway",
});

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-nunito",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--font-montserrat",
});

/* Lato is cut at 400 and 700 only; a 600 asked of it is drawn from the 700. */
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-lato",
});

/*
  The only face here that is not a Latin one, and the only one loaded for a
  script rather than for a look.

  Arabic set in a Latin display face falls back to whatever the device happens
  to have, which across phones means anything from a proper naskh to a UI
  sans — and a sans strips the joins and the stacked diacritics that the words
  are actually made of. Amiri is a classical naskh, cut after the Bulaq Press
  type, and sits with the wedding pairs' serifs far better than a UI naskh.

  The "arabic" subset and the regular weight only: pulling "latin" too would
  ship a second Latin face the card never sets, and no Arabic line is set bold.
  It is wired to the Arabic elements alone, through --lifafa-arabic in
  globals.css, so no Latin text can inherit it — and it serves every pair.
*/
const amiri = Amiri({
  subsets: ["arabic"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-arabic",
});

/*
  The second face loaded for a script rather than for a look, on the same terms
  as the Arabic above.

  Not a cut of the Arabic's family — Amiri has no Devanagari, so there is no
  way to set both scripts in one family and the two are matched by weight and
  colour instead. Each pair now has Devanagari faces of its own (below), and
  this is the last Devanagari fallback behind them: fontFamilyOf in
  lib/fontPairs.ts puts it after the pair's stack, so a glyph the pair's face
  lacks still lands here rather than on a device default. It is also the
  Devanagari face of the product's own text and of the shloks.

  Devanagari left to a device default lands on whatever is installed: Nirmala UI
  on Windows, Kohinoor on iOS, something arbitrary elsewhere, each with its own
  metrics — which is why the line-height in globals.css is set for the worst of
  them and not just for this face.

  The "devanagari" subset only. Worth being exact about what that does, because
  the build output does not look like it at a glance: `subsets` chooses what
  would be PRELOADED, not what is emitted. next/font writes an @font-face for
  every subset the family publishes — checked against a real build, this one
  emits three, devanagari plus latin and latin-ext. The Latin cuts are dead
  weight in the CSS and nothing more: they are downloaded only if some Latin
  glyph is rendered in this family, and the family reaches the Devanagari
  elements alone through --lifafa-devanagari. With `preload: false`, as for
  every card face, the Devanagari cut itself is fetched only by a page that
  sets Devanagari.
*/
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  preload: false,
  variable: "--font-devanagari",
});

/*
  The third face loaded for a script rather than for a look, on the same terms
  as the Arabic and the Devanagari above.

  Gurmukhi left to a device default lands on whatever is installed, and on a
  great many phones that is nothing at all — the text comes out as boxes rather
  than as a wrong-looking face, which is the failure mode that makes this one
  worth loading rather than optional.

  The "gurmukhi" subset only. As with the other two, `subsets` chooses what
  would be PRELOADED rather than what is emitted, and with `preload: false` the
  file is fetched only by a page that sets Gurmukhi. It reaches the
  Gurmukhi elements alone through --lifafa-gurmukhi, so no Latin text can
  inherit it.

  The Jain pack needs NO face of its own — it sets Devanagari, which is already
  loaded above. Christian and Buddhist need none either: both are Latin. Six
  packs, three script faces.
*/
const notoSansGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ["gurmukhi"],
  display: "swap",
  preload: false,
  variable: "--font-gurmukhi",
});

/*
  Each pair's own Devanagari faces, so a Hindi card is set as carefully as an
  English one instead of every pair falling through to Noto Sans. The mapping
  is `namesHi`, `headingHi` and `bodyHi` in lib/fontPairs.ts; a face is wired to
  the card only through the pair stacks on <html> below.

  On the same terms as Noto Sans Devanagari above: the "devanagari" subset
  (the pair's Latin face already draws the Latin letters), `preload: false`,
  and only the weights a role asks for. Nothing is fetched until a Devanagari
  character is drawn in the face, so an English card fetches none of these and
  a Hindi card only its own pair's.

  Weights: names and headings at the pair's own weight, body text at 400 and
  600 only. The card and the reply form also ask body text for 500; with no 500
  cut, a browser's own font matching gives it 400, which is where Hindi text
  lands, while every Latin face keeps its 500. Measured, a 500 is almost
  exactly halfway between the other two in Hind and Noto Serif, so dropping it
  costs a step of emphasis and saves a file a card. Tiro, Rozha One and Kurale
  come in 400 only; the card asks them for more and is stopped from faking a
  bold by the rules in globals.css.
*/

/* Classic's names and headings (600). */
const martel = Martel({
  subsets: ["devanagari"],
  weight: ["600"],
  display: "swap",
  preload: false,
  variable: "--font-hi-martel",
});

/* Modern's names and headings (800). */
const poppins = Poppins({
  subsets: ["devanagari"],
  weight: ["800"],
  display: "swap",
  preload: false,
  variable: "--font-hi-poppins",
});

/*
  Clean throughout (700 for its names and headings), and the body text of
  Classic, Modern, Warm, Romantic and Luxe at 400 and 600.
*/
const hind = Hind({
  subsets: ["devanagari"],
  weight: ["400", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-hi-hind",
});

/* Elegant's names and headings, and Royal's headings. One weight. */
const tiroDevanagariHindi = Tiro_Devanagari_Hindi({
  subsets: ["devanagari"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-hi-tiro",
});

/* Warm's names and headings (600). */
const laila = Laila({
  subsets: ["devanagari"],
  weight: ["600"],
  display: "swap",
  preload: false,
  variable: "--font-hi-laila",
});

/* A script: Royal's and Graceful's names, and nothing else. */
const amita = Amita({
  subsets: ["devanagari"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-hi-amita",
});

/* Body text of Royal and Regal. */
const notoSerifDevanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  variable: "--font-hi-noto-serif",
});

/* Regal's names and headings, Luxe's names. One weight. */
const rozhaOne = Rozha_One({
  subsets: ["devanagari"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-hi-rozha",
});

/* A script: Romantic's names, and nothing else. */
const tillana = Tillana({
  subsets: ["devanagari"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-hi-tillana",
});

/* Romantic's headings; Graceful's headings and body. One weight. */
const kurale = Kurale({
  subsets: ["devanagari"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-hi-kurale",
});

/* Luxe's headings (500). */
const eczar = Eczar({
  subsets: ["devanagari"],
  weight: ["500"],
  display: "swap",
  preload: false,
  variable: "--font-hi-eczar",
});

const FONT_VARIABLES = [
  fraunces.variable,
  inter.variable,
  cormorant.variable,
  lora.variable,
  dmSans.variable,
  greatVibes.variable,
  parisienne.variable,
  pinyonScript.variable,
  cinzel.variable,
  playfair.variable,
  marcellus.variable,
  bodoniModa.variable,
  josefinSans.variable,
  manrope.variable,
  raleway.variable,
  nunito.variable,
  montserrat.variable,
  lato.variable,
  amiri.variable,
  notoSansDevanagari.variable,
  notoSansGurmukhi.variable,
  martel.variable,
  poppins.variable,
  hind.variable,
  tiroDevanagariHindi.variable,
  laila.variable,
  amita.variable,
  notoSerifDevanagari.variable,
  rozhaOne.variable,
  tillana.variable,
  kurale.variable,
  eczar.variable,
].join(" ");

/*
  The site's address, fixed at build time and so safe in static metadata.

  metadataBase is what turns a relative image path in any page's metadata into
  the absolute URL that Open Graph and Twitter both require — a scraper has no
  page to resolve a relative path against. It is never left undefined now: an
  unset metadataBase makes Next fall back to localhost and emit a warning, and
  an og:image on localhost is a preview that never loads.

  The invite route still sets its own from the request, so the image a chat
  unfurls sits on the same origin as the link it came from even where nothing
  is configured; see app/i/[inviteCode]/layout.tsx.
*/
const siteOrigin = canonicalSiteOrigin();

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "Lifafa | Digital invitations with an up-to-date guest count",
  description:
    "Create a digital invitation for your celebration, share one link, and know exactly how many guests are coming before the day arrives.",
  /*
    NO `alternates.canonical` HERE, deliberately. Metadata is inherited: a
    canonical set on the root layout becomes every page's canonical, so /create
    would announce the landing page as its real address and ask to be dropped
    from the index. Each indexable page names its own — see app/page.tsx and
    app/create/layout.tsx — and they all resolve against the metadataBase above,
    so there is still only one host in play.
  */
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    /*
      The pair stacks sit on the same element as the font variables they
      name, so each var() resolves here and is inherited already resolved.
    */
    <html
      lang="en-IN"
      className={FONT_VARIABLES}
      style={PAIR_FONT_STACKS as CSSProperties}
    >
      <body className="bg-[var(--lifafa-ink)] font-[family-name:var(--font-sans)] text-[var(--lifafa-cream)] antialiased">
        {children}
      </body>
    </html>
  );
}
