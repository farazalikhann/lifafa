import type { ReactElement } from "react";

/**
 * One placeholder block with light passing over it (.lifafa-shimmer in
 * app/globals.css). The shape is the caller's: a bar, a chip, a card's
 * preview. Hidden from screen readers; the page around it says what is
 * loading.
 */
export default function Shimmer({
  className,
}: {
  className: string;
}): ReactElement {
  return <span aria-hidden="true" className={`lifafa-shimmer block ${className}`} />;
}
