"use client";

import Link from "next/link";
import LinkPending from "@/components/landing/LinkPending";
import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from "react";
import { clarityEvent } from "@/lib/clarity";
import { withAdParamsPath } from "@/lib/inAppBrowser";
import { formatPrice } from "@/lib/pricing";
import Rupees from "@/components/type/Rupees";
import type { StripTone } from "@/lib/stripTone";

/** For the scroll cue to stand clear of (InvitedCue's `clearOf`). */
export const DEMO_CREATE_BAR_SELECTOR = "[data-demo-create-bar]";

/** The bar's height on <html>: what the cards that fill the screen leave for it. */
const FOOT_HEIGHT_VARIABLE = "--lifafa-foot-h";

/** Runs where it stands, right after the bar: measures it and sets FOOT_HEIGHT_VARIABLE. */
const PUBLISH_FOOT_HEIGHT = `(function(){var s=document.currentScript,b=s&&s.previousElementSibling;if(b&&b.getBoundingClientRect)document.documentElement.style.setProperty(${JSON.stringify(FOOT_HEIGHT_VARIABLE)},Math.ceil(b.getBoundingClientRect().height)+"px")})();`;

/** The card's cover while it is closed or opening (CoverShell): unmounted once the card is open. */
const COVER_SELECTOR = "[data-phase][data-animation]";

/** A card with no cover: the bar comes up this long after the page does. */
const NO_COVER_DELAY_MS = 3000;

/**
 * The path with the tags the visitor arrived with: fbclid and the utm ones
 * the site keeps for the session (lib/inAppBrowser.ts), and any other utm_*
 * on this address, so the ad's tracking goes on to /create whatever the ad
 * named its tags.
 */
function withArrivalTags(path: string): string {
  const url = new URL(withAdParamsPath(path), window.location.origin);

  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (key.startsWith("utm_") && value !== "" && !url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Whether the guest has got past the cover: true once the cover is gone, or
 * NO_COVER_DELAY_MS after the page is up for a card that has none. Stays true
 * after a Replay, whose cover stands over the bar (z-50) while it plays.
 */
function usePastCover(): boolean {
  const [past, setPast] = useState(false);

  useEffect(() => {
    let cover: Element | null = null;
    let observer: MutationObserver | null = null;
    let timer = 0;

    const done = (): void => {
      observer?.disconnect();
      window.clearTimeout(timer);
      setPast(true);
    };

    /* The cover leaves the tree when the card is open; one put back in its place (a re-render) is still closed. */
    const watch = (): void => {
      observer = new MutationObserver(() => {
        if (cover !== null && !cover.isConnected) {
          cover = document.querySelector(COVER_SELECTOR);

          if (cover === null) {
            done();
          }
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    cover = document.querySelector(COVER_SELECTOR);

    if (cover !== null) {
      watch();
    } else {
      /* A cover that turns up late is waited for all the same. */
      timer = window.setTimeout(() => {
        cover = document.querySelector(COVER_SELECTOR);

        if (cover === null) {
          done();
        } else {
          watch();
        }
      }, NO_COVER_DELAY_MS);
    }

    return () => {
      observer?.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  return past;
}

/**
 * The bar pinned to the foot of a phone's screen on a template's live demo,
 * once the guest has opened the card: "Make this card", the page's main
 * button, and "Explore more designs" beside it, under the template's name and
 * what it costs.
 *
 * "Make this card" opens the wizard's details step with this design chosen
 * (templateStartHref: the wizard moves the new card onto it with
 * switchTemplate, as Select in the gallery does). "Explore more designs"
 * opens the gallery. Both carry the ad's tags (withArrivalTags), and each
 * tap is a Clarity event (demo_make_click, demo_explore_click).
 *
 * A PHONE'S ALONE, under 640px. Wider, the strip at the top is in easy reach
 * and there is no thumb to serve.
 *
 * HIDDEN UNTIL THE CARD IS OPEN, but in its place from the first paint:
 * invisible (and out of the tab order) rather than moved, so its height is
 * published before the card is drawn and the WhatsApp button measures it
 * where it will be (components/help/WhatsAppFloat.tsx). Nothing moves when
 * it appears; only its row rises a few pixels into place as it fades in.
 *
 * IT COVERS NONE OF THE CARD'S OWN CONTROLS. It publishes its height as
 * --lifafa-foot-h on <html> (0 where it is not drawn), as the strip publishes
 * its own, and the card keeps out of it: the scroll cue stands above it
 * (InvitedCue's `clearOf`), a card that fills the screen takes it off the
 * screen's height (Sheesh Mahal, Gulab Mahal, Emerald Shahi, Dak Ghar,
 * Shahi Darwaza), and the page ends that much lower
 * (app/demo/[templateId]/page.tsx), so the reply form can be scrolled clear
 * of it. Its foot leaves the iPhone's home indicator its safe-area inset.
 * Under the cover (z-50) and the language switch (z-60).
 */
export default function DemoCreateBar({
  makeHref,
  exploreHref,
  name,
  pricePaise,
  tone,
}: {
  /** The card's own colours, as the strip at the top takes them; null keeps ink and marigold. */
  tone?: StripTone | null;
  /** "Make this card", before the ad's tags; null for a template the gallery does not offer yet. */
  makeHref: string | null;
  /** "Explore more designs": the gallery, before the ad's tags. */
  exploreHref: string;
  /** The template's name. */
  name: string;
  /** What an invitation on it costs. A label: the charge is the server's to work out. */
  pricePaise: number;
}): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const shown = usePastCover();
  /* The tags from the page's own address: after hydration, so the server's HTML and the first render agree. */
  const [tagged, setTagged] = useState(false);
  const href = (path: string): string => (tagged ? withArrivalTags(path) : path);

  useEffect(() => {
    setTagged(true);
  }, []);

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

  const toned = tone !== null && tone !== undefined;
  const button =
    "inline-flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-full px-3 text-[0.9375rem] font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";

  return (
    <>
    <div
      ref={ref}
      data-demo-create-bar=""
      data-shown={shown ? "" : undefined}
      role="region"
      aria-label="Make this card"
      className={`fixed inset-x-0 bottom-0 z-[45] border-t border-[var(--lifafa-marigold)]/40 bg-[var(--lifafa-ink)]/95 backdrop-blur transition-[opacity,visibility] duration-300 ease-out motion-reduce:transition-none sm:hidden ${
        shown ? "visible opacity-100" : "invisible opacity-0"
      }`}
      style={
        toned
          ? {
              backgroundColor: tone.bar,
              borderColor: `color-mix(in srgb, ${tone.button} 40%, transparent)`,
            }
          : undefined
      }
    >
      <div
        className={`mx-auto flex max-w-md flex-col gap-1.5 px-4 pt-2 pb-[calc(0.625rem+env(safe-area-inset-bottom))] transition-transform duration-300 ease-out motion-reduce:transition-none ${
          shown ? "translate-y-0" : "translate-y-2"
        }`}
      >
        <p
          className="flex min-w-0 items-baseline justify-center gap-1.5 text-xs leading-tight text-[var(--lifafa-cream)]"
          style={toned ? { color: tone.text } : undefined}
        >
          <span className="truncate">{name}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 font-semibold">
            <Rupees text={formatPrice(pricePaise)} />
          </span>
        </p>
        {/* The main button on the right, under the thumb; the gallery beside it, quieter. */}
        <div className="flex gap-2">
          <Link
            href={href(exploreHref)}
            data-demo-explore=""
            onClick={() => clarityEvent("demo_explore_click")}
            className={`${button} border border-[var(--lifafa-marigold)] text-[var(--lifafa-cream)]`}
            style={toned ? { borderColor: tone.button, color: tone.text } : undefined}
          >
            <LinkPending>Explore more designs</LinkPending>
          </Link>
          {makeHref === null ? null : (
            <Link
              href={href(makeHref)}
              data-demo-create=""
              onClick={() => clarityEvent("demo_make_click")}
              className={`${button} bg-[var(--lifafa-marigold)] text-[var(--lifafa-ink)] shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)]`}
              style={toned ? { backgroundColor: tone.button, color: tone.buttonText } : undefined}
            >
              <LinkPending>Make this card</LinkPending>
            </Link>
          )}
        </div>
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
