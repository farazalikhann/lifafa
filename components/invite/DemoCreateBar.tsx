"use client";

import Link from "next/link";
import LinkPending from "@/components/landing/LinkPending";
import { useLayoutEffect, useRef, type ReactElement } from "react";
import { useAdParamsHref } from "@/hooks/useAdParamsHref";
import { formatPrice } from "@/lib/pricing";
import Rupees from "@/components/type/Rupees";
import type { StripTone } from "@/lib/stripTone";

/** For the scroll cue to stand clear of (InvitedCue's `clearOf`). */
export const DEMO_CREATE_BAR_SELECTOR = "[data-demo-create-bar]";

/** The bar's height on <html>: what the cards that fill the screen leave for it. */
const FOOT_HEIGHT_VARIABLE = "--lifafa-foot-h";

/** Runs where it stands, right after the bar: measures it and sets FOOT_HEIGHT_VARIABLE. */
const PUBLISH_FOOT_HEIGHT = `(function(){var s=document.currentScript,b=s&&s.previousElementSibling;if(b&&b.getBoundingClientRect)document.documentElement.style.setProperty(${JSON.stringify(FOOT_HEIGHT_VARIABLE)},Math.ceil(b.getBoundingClientRect().height)+"px")})();`;

/**
 * The bar pinned to the foot of a phone's screen on a template's live demo:
 * what this card costs and "Create this card", where a thumb is.
 *
 * Where it leads is the strip's (SampleBanner): the wizard's details step
 * with this design chosen, or the gallery for a template not offered yet,
 * with the ad's tags on it (hooks/useAdParamsHref.ts) so fbclid and the utm
 * ones go on to /create.
 *
 * A PHONE'S ALONE, under 640px. Wider, the strip at the top is in easy reach
 * and there is no thumb to serve.
 *
 * IT COVERS NONE OF THE CARD'S OWN CONTROLS. It publishes its height as
 * --lifafa-foot-h on <html> (0 where it is not drawn), as the strip publishes
 * its own, and the card keeps out of it: the scroll cue stands above it
 * (InvitedCue's `clearOf`), a card that fills the screen takes it off the
 * screen's height (Sheesh Mahal, Gulab Mahal, Emerald Shahi, Dak Ghar), and
 * the page ends that much lower (app/demo/[templateId]/page.tsx), so the
 * reply form can be scrolled clear of it. Under the cover (z-50), which
 * covers it until the card is opened, and the language switch (z-60).
 */
export default function DemoCreateBar({
  href,
  label,
  name,
  pricePaise,
  tone,
}: {
  /** The card's own colours, as the strip at the top takes them; null keeps ink and marigold. */
  tone?: StripTone | null;
  /** Where the button leads, before the ad's tags. */
  href: string;
  /** "Create this card", or "Create yours" where it opens the gallery. */
  label: string;
  /** The template's name. */
  name: string;
  /** What an invitation on it costs. A label: the charge is the server's to work out. */
  pricePaise: number;
}): ReactElement {
  const adHref = useAdParamsHref();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const bar = ref.current;
    const root = document.documentElement;

    if (bar === null) {
      return;
    }

    const publish = (): void => {
      root.style.setProperty(FOOT_HEIGHT_VARIABLE, `${Math.ceil(bar.getBoundingClientRect().height)}px`);
    };

    publish();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(publish) : null;
    observer?.observe(bar);
    window.addEventListener("resize", publish);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      root.style.removeProperty(FOOT_HEIGHT_VARIABLE);
    };
  }, []);

  return (
    <>
    <div
      ref={ref}
      data-demo-create-bar=""
      role="region"
      aria-label="Create this card"
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-ink)]/95 backdrop-blur sm:hidden"
      style={
        tone === null || tone === undefined
          ? undefined
          : {
              backgroundColor: tone.bar,
              borderColor: `color-mix(in srgb, ${tone.button} 40%, transparent)`,
            }
      }
    >
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <p
          className="flex min-w-0 flex-1 flex-col leading-tight text-[var(--lifafa-cream)]"
          style={tone === null || tone === undefined ? undefined : { color: tone.text }}
        >
          <span className="truncate text-xs">{name}</span>
          <span className="text-lg font-semibold">
            <Rupees text={formatPrice(pricePaise)} />
          </span>
        </p>
        <Link
          href={adHref(href)}
          className="inline-flex min-h-12 shrink-0 items-center rounded-full bg-[var(--lifafa-marigold)] px-5 text-[0.9375rem] font-semibold whitespace-nowrap text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
          style={
            tone === null || tone === undefined
              ? undefined
              : { backgroundColor: tone.button, color: tone.buttonText }
          }
        >
          <LinkPending>{label}</LinkPending>
        </Link>
      </div>
    </div>
    {/*
      The bar's height, published while the page is still being read. The
      cards that fill the screen take it off their height; told only when the
      page's script ran, seconds later on a slow phone, they shrank in front
      of the visitor (a layout shift). The effect above takes over from here.
    */}
    <script dangerouslySetInnerHTML={{ __html: PUBLISH_FOOT_HEIGHT }} />
    </>
  );
}
