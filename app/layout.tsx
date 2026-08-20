import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const body = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

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
    <html lang="en-IN" className={`${display.variable} ${body.variable}`}>
      <body className="bg-[var(--lifafa-ink)] font-[family-name:var(--font-sans)] text-[var(--lifafa-cream)] antialiased">
        {children}
      </body>
    </html>
  );
}
