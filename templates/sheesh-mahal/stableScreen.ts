"use client";

import { useEffect } from "react";

/* Set on <html> while the card is the guest's page, so the cover beside the card reads it too. */
export const SCREEN_VAR = "--sm-screen-px";
/* A change of height smaller than this is a browser's bar coming or going, not a new screen. */
const JUMP = 150;
/* After the screen goes in or out of fullscreen, every change is taken for this long. */
const TRUST_MS = 1000;

/**
 * The height every page is, fixed so that no page ever changes height while
 * the guest scrolls: the screen with the browser's bars away (100lvh),
 * measured once, and again only when the screen itself changes, by going in
 * or out of fullscreen, turning the phone (a new width), or a change of more
 * than 150px. An address bar showing or hiding, or a window 100px shorter,
 * changes nothing.
 *
 * Published as `--sm-screen-px` on <html> (and taken off again on the way
 * out); until it is, the stylesheet's 100lvh is the same value. Measured on a
 * resize, never in a scroll or a frame.
 */
export function useStableScreen(on: boolean): void {
  useEffect(() => {
    if (!on) {
      return;
    }

    const html = document.documentElement;
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);

    let height = 0;
    let width = 0;
    let trustUntil = 0;

    const measure = (force: boolean): void => {
      const next = probe.offsetHeight;
      const across = window.innerWidth;

      if (next <= 0) {
        return;
      }

      const real =
        force ||
        height === 0 ||
        across !== width ||
        Math.abs(next - height) >= JUMP ||
        performance.now() < trustUntil;

      if (!real) {
        return;
      }

      if (next !== height) {
        html.style.setProperty(SCREEN_VAR, `${next}px`);
      }

      height = next;
      width = across;
    };

    const onResize = (): void => measure(false);
    const onFullscreen = (): void => {
      trustUntil = performance.now() + TRUST_MS;
      measure(true);
    };

    measure(true);
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("fullscreenchange", onFullscreen);

    return () => {
      window.removeEventListener("resize", onResize);
      document.removeEventListener("fullscreenchange", onFullscreen);
      probe.remove();
      html.style.removeProperty(SCREEN_VAR);
    };
  }, [on]);
}
