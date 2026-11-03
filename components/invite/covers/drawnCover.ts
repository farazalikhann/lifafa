import type { ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";

/**
 * The cover as it was drawn in code before there was a film of it: what
 * stands in when the film cannot play. It runs to the option's own length and
 * shares, which are its timings and always were.
 */
export interface DrawnCover {
  Component: (state: CoverVisualState) => ReactElement | null;
  /** The pictures it is drawn from, to have in hand before it is shown. */
  images: (isLight: boolean) => readonly string[];
}
