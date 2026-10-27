import type { ReactElement } from "react";

/**
 * The gold hairline between two sections: a thin rule the width of the
 * content column, with a small lozenge at its centre. Decorative.
 */
export default function SectionRule(): ReactElement {
  return (
    <div aria-hidden="true" className="relative mx-auto flex max-w-[70rem] items-center px-5 sm:px-14 lg:px-24">
      <span className="h-px flex-1 bg-[var(--paper-gold)]/45" />
      <span className="mx-3 h-2 w-2 rotate-45 border border-[var(--paper-gold)]" />
      <span className="h-px flex-1 bg-[var(--paper-gold)]/45" />
    </div>
  );
}
