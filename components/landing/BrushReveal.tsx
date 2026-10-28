"use client";

import { useEffect } from "react";

/**
 * Shows the landing page's brush washes and underline (components/landing/
 * Brush.tsx), each once, starting after the page has loaded and painted its
 * heading in its web font. A wash's file is fetched when it is within a
 * screen of view (data-near) and it fades in when it is on screen (data-on).
 * The underline's file is fetched at that same point and it wipes on once
 * loaded. With reduced motion every wash is simply set to its final state;
 * the CSS drops the transitions.
 *
 * Also loads the page's deferred pictures (`img[data-defer]`, the step
 * illustrations) when they come within half a screen: a lazy image that far
 * down is otherwise fetched at once on a phone, ahead of the hero's paint.
 *
 * Renders nothing. Mounted once by the page.
 */
export default function BrushReveal(): null {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const washes = Array.from(document.querySelectorAll<HTMLElement>("[data-brush]"));
    const observers: IntersectionObserver[] = [];
    const cleanups: Array<() => void> = [];

    /*
      Runs `fn` once the page has loaded, its web fonts are in and a frame has
      been painted with them: the hero heading is the page's largest paint, and
      it waits on Fraunces, so nothing here may be fetched ahead of it.
    */
    let live = true;
    const afterLoad = (fn: () => void): void => {
      const go = (): void => {
        void document.fonts.ready.then(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (live) fn();
            }),
          ),
        );
      };
      if (document.readyState === "complete") {
        go();
      } else {
        window.addEventListener("load", go, { once: true });
        cleanups.push(() => window.removeEventListener("load", go));
      }
    };

    const startWashes = (): void => {
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
    };
    afterLoad(startWashes);

    /* Moves a deferred image's data-src to src, once. */
    const load = (img: HTMLImageElement): void => {
      const src = img.dataset.src;
      if (src !== undefined && img.getAttribute("src") === null) img.src = src;
    };

    const deferred = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-defer]"));
    if (!("IntersectionObserver" in window)) {
      deferred.forEach(load);
    } else {
      const soon = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            load(entry.target as HTMLImageElement);
            soon.unobserve(entry.target);
          }
        },
        { rootMargin: "50% 0px" },
      );
      observers.push(soon);
      for (const img of deferred) soon.observe(img);
    }

    const wipes = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-brush-wipe]"));
    for (const img of wipes) {
      const show = (): void => {
        /* Two frames, so the hidden state is painted before the wipe starts. */
        requestAnimationFrame(() =>
          requestAnimationFrame(() => img.setAttribute("data-on", "")),
        );
      };
      img.addEventListener("load", show, { once: true });
      cleanups.push(() => img.removeEventListener("load", show));
    }
    afterLoad(() => wipes.forEach(load));

    return () => {
      live = false;
      for (const o of observers) o.disconnect();
      for (const c of cleanups) c();
    };
  }, []);

  return null;
}
