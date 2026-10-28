"use client";

import { useEffect } from "react";

/**
 * Shows the landing page's brush washes and underline (components/landing/
 * Brush.tsx), each once. A wash's file is fetched when it is within a screen
 * of view (data-near) and it fades in when it is on screen (data-on). The
 * underline wipes on once its image has loaded. With reduced motion every
 * wash is simply set to its final state; the CSS drops the transitions.
 *
 * Renders nothing. Mounted once by the page.
 */
export default function BrushReveal(): null {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const washes = Array.from(document.querySelectorAll<HTMLElement>("[data-brush]"));
    const observers: IntersectionObserver[] = [];

    if (!("IntersectionObserver" in window)) {
      for (const el of washes) {
        el.setAttribute("data-near", "");
        el.setAttribute("data-on", "");
      }
    } else {
      const near = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.setAttribute("data-near", "");
            if (reduced) entry.target.setAttribute("data-on", "");
            near.unobserve(entry.target);
          }
        },
        { rootMargin: "100% 0px" },
      );
      observers.push(near);

      if (!reduced) {
        const seen = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              entry.target.setAttribute("data-on", "");
              seen.unobserve(entry.target);
            }
          },
          { threshold: 0.15 },
        );
        observers.push(seen);
        for (const el of washes) seen.observe(el);
      }
      for (const el of washes) near.observe(el);
    }

    const wipes = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-brush-wipe]"));
    const cleanups: Array<() => void> = [];
    for (const img of wipes) {
      const show = (): void => {
        /* Two frames, so the hidden state is painted before the wipe starts. */
        requestAnimationFrame(() =>
          requestAnimationFrame(() => img.setAttribute("data-on", "")),
        );
      };
      if (img.complete && img.naturalWidth > 0) {
        show();
      } else {
        img.addEventListener("load", show, { once: true });
        cleanups.push(() => img.removeEventListener("load", show));
      }
    }

    return () => {
      for (const o of observers) o.disconnect();
      for (const c of cleanups) c();
    };
  }, []);

  return null;
}
