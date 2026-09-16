import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * The shell every /admin page sits in.
 *
 * DELIBERATELY NOT LIFAFA. The host-facing app is dark, warm and set in
 * Fraunces; this is white, grey and set in whatever `--font-sans` resolves to.
 * That is not indifference to the design — it is the design. An internal tool
 * that looks like the product is a tool somebody screenshots into a deck by
 * mistake, and more usefully, the moment this page stops looking like Lifafa
 * is the moment it stops being confused with a host's dashboard at a glance.
 *
 * The root layout paints the body dark, so this repaints it. `min-h-screen`
 * with its own background is what keeps the dark from showing through beneath
 * short pages.
 */

export const metadata: Metadata = {
  title: "Admin — Lifafa",
  /*
    The third of the three fences described in app/robots.ts. Next turns this
    into <meta name="robots" content="noindex, nofollow"> — which is what a
    tool reading the HTML finds, where robots.txt and the X-Robots-Tag header
    are what a crawler and a proxy respectively find.
  */
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-50 font-[family-name:var(--font-sans)] text-zinc-900">
      {children}
    </div>
  );
}
