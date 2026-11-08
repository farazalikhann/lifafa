"use client";

import type { ReactNode } from "react";

/**
 * Renders its children as they are: the page, inside PaperTheme's <div>.
 *
 * WHY IT EXISTS. A page segment can reach the browser still waiting on a
 * script: /create's carries its error boundary (app/create/error.tsx) as a
 * reference to code that may not have arrived when React hydrates. Straight
 * inside the <div>, React paused on the <div> itself, and when the script came
 * it hydrated the <div> again from the wrong place in the server's HTML:
 * React error #418, and the whole page drawn again in the browser, on about
 * one load in ten of /create. Inside this component the pause is this
 * component's, which holds no HTML of its own, and it carries on cleanly.
 *
 * Unlike a Suspense boundary it changes nothing on the server: no fallback,
 * the page's HTML streamed exactly as before.
 */
export default function PageSlot({ children }: { children: ReactNode }): ReactNode {
  return children;
}
