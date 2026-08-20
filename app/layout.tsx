import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Inter,
  Lora,
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

const FONT_VARIABLES = [
  fraunces.variable,
  inter.variable,
  cormorant.variable,
  lora.variable,
  dmSans.variable,
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
