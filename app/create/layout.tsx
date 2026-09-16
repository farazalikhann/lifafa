import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Metadata only, because app/create/page.tsx cannot carry any: it is a Client
 * Component, and a `"use client"` module may not export `metadata`. This
 * renders its children untouched and adds nothing to the DOM.
 *
 * It exists for the canonical URL. /create is the second of the two pages in
 * app/sitemap.ts, and the site answers on two hosts — www.getlifafa.co.in
 * redirects to the bare getlifafa.co.in — so the page names which of them it
 * should be indexed under rather than leaving a crawler to guess. Relative, so
 * the metadataBase in app/layout.tsx resolves it against the one origin
 * lib/siteUrl.ts hands out.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/create" },
};

export default function CreateLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return children;
}
