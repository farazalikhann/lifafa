import type { ReactElement, ReactNode } from "react";
import { paperSans } from "@/components/theme/fonts";
import PageSlot from "@/components/theme/PageSlot";

/**
 * The light theme for a host page: washi ivory, emerald and gold, Manrope for
 * text (DESIGN.md). Every component inside that reads the product's tokens
 * turns light with it; see `.lifafa-paper` in globals.css.
 *
 * Never around a guest's invitation (/i), a sample (/demo) or /admin. A card
 * drawn inside a host page sits in `.lifafa-card-scope`, which puts back what
 * the card would otherwise inherit from here.
 *
 * `patterned` adds the faint seigaiha strips down the page's edges (from
 * 640px), absolute so they scroll with the page. The wrapper is its own
 * stacking context and the strips sit at z-index -1 in it, so they are drawn
 * over the page's ivory and under everything else, panels and bars included.
 *
 * That z-index is in globals.css (.lifafa-paper > .lifafa-strip), not an
 * inline style. One style object shared by both strips is sent from the
 * server as a reference back into its own row, which left the second strip
 * waiting on that row while the page hydrated: a pause on this <div>, and
 * React error #418 on /create (see PageSlot).
 */
export default function PaperTheme({
  children,
  patterned = false,
  className = "",
}: {
  children: ReactNode;
  patterned?: boolean;
  className?: string;
}): ReactElement {
  return (
    <div
      className={`lifafa-paper ${paperSans.variable} relative isolate min-h-screen ${
        patterned ? "overflow-x-clip" : ""
      } ${className}`}
    >
      {patterned ? (
        <>
          <span aria-hidden="true" className="lifafa-strip" data-side="left" data-pattern="seigaiha" />
          <span aria-hidden="true" className="lifafa-strip" data-side="right" data-pattern="seigaiha" />
        </>
      ) : null}
      {/* Not straight inside the <div>: see PageSlot. */}
      <PageSlot>{children}</PageSlot>
    </div>
  );
}
