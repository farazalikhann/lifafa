"use client";

import { useEffect, useRef, useState, type ReactElement } from "react";
import { useRevealGate } from "@/hooks/useRevealGate";
import { FIRST_SCREEN_ATTRIBUTE } from "@/components/invite/InvitedCue";
import RoyalTextureFill from "@/components/card/decor/RoyalTextureFill";
import type { RoyalTextureLayer } from "@/lib/royalTexture";

/**
 * How much of the top of the screen the band takes, in CSS pixels, safe area
 * aside. Slim: it is a running head, not a title.
 */
const BAND_HEIGHT = 46;

/**
 * The couple's names, pinned to the top of the screen once the guest has
 * scrolled past the card's opening screen, and gone again when they come back
 * to it.
 *
 * A guest half way down a long invitation is looking at a venue or a list of
 * functions with nobody's name on it. This is the running head of a book: who
 * the card is from, kept in sight.
 *
 * A ZERO HEIGHT STICKY ROW, as MusicToggle is and for its reason: `fixed`
 * would pin it to the viewport, which is right on a guest's screen and wrong
 * in the editor, where the card lives in a phone frame. Sticky keeps it at
 * the top of whatever is doing the scrolling and costs the layout nothing, so
 * the card does not move when it appears.
 *
 * WHEN IT SHOWS is asked of the card's own first screen, the element the
 * card marks for the cover and the cue (FIRST_SCREEN_ATTRIBUTE): the band is
 * out while that screen is gone off the top, and never while a cover is still
 * over the card.
 *
 * IT KEEPS CLEAR OF WHAT IS ALREADY UP THERE, and whoever owns a control at
 * the top of the screen says how. The guest page's language switch sits in
 * the top right corner while it is showing: it publishes the width it takes
 * as --lifafa-header-clear, and the names are centred in what is left. The
 * editor's full screen preview has controls in both corners, so it asks for
 * the names a row lower instead, with --lifafa-header-lift, and the band
 * runs behind its controls. The card's own music button is in the top right
 * too. With none of them the variables are absent and the names are centred
 * on the card. The band itself takes no pointer events, so nothing under it
 * is harder to tap. It starts below the host's preview banner
 * (--lifafa-preview-h).
 *
 * Only transform and opacity move. The blur is light, and under a browser
 * with none the band is simply the card's ground at nine tenths.
 */
export default function NamesHeader({
  names,
  background,
  texture,
  accent,
  rule,
  clearMusic,
}: {
  /** The couple, or whoever the card names, as one line. */
  names: string;
  /** The card's ground, which the band is a translucent strip of. */
  background: string;
  /** The royal texture's layer on a card that has it, or null; the band is then a strip of the textured ground. */
  texture: RoyalTextureLayer | null;
  accent: string;
  /** The hairline under the band: the accent, faint. */
  rule: string;
  /** The card has a music button in its top right corner, which the names keep off. */
  clearMusic: boolean;
}): ReactElement {
  const rowRef = useRef<HTMLDivElement>(null);
  const [past, setPast] = useState<boolean>(false);
  const gateOpen = useRevealGate();

  useEffect(() => {
    const row = rowRef.current;
    /* This card's own first screen: a page can hold more than one card. */
    const first = row?.parentElement?.querySelector(`[${FIRST_SCREEN_ATTRIBUTE}]`) ?? null;

    if (first === null || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        /*
          Gone, and gone off the top: a first screen that is merely not yet
          scrolled to — a card further down a page — is not "past".
        */
        const top = entry.rootBounds?.top ?? 0;
        setPast(!entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1);
      }
    });

    observer.observe(first);
    return () => observer.disconnect();
  }, []);

  const shown = past && gateOpen;

  return (
    <div
      ref={rowRef}
      aria-hidden={!shown}
      className="pointer-events-none sticky z-[19] h-0"
      style={{ top: "var(--lifafa-preview-h, 0px)" }}
    >
      <div
        className="flex items-end justify-center border-b backdrop-blur-[6px] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none"
        style={{
          height: `calc(${BAND_HEIGHT}px + env(safe-area-inset-top) + var(--lifafa-header-lift, 0px))`,
          paddingBottom: 9,
          paddingLeft: 16,
          /* The music button is beside the names unless they have been set a row lower, which says so with --lifafa-header-music: 0. */
          paddingRight: `calc(16px + max(var(--lifafa-header-clear, 0px), ${clearMusic ? 52 : 0}px * var(--lifafa-header-music, 1)))`,
          /* The card's ground at nine tenths: #rrggbb with an alpha appended. */
          ...(texture === null
            ? { backgroundColor: /^#[0-9a-f]{6}$/i.test(background) ? `${background}E6` : background }
            : null),
          borderColor: rule,
          transform: shown ? "translate3d(0, 0, 0)" : "translate3d(0, -100%, 0)",
          opacity: shown ? 1 : 0,
        }}
      >
        {/*
          The same nine tenths, of the ground with its damask: the colour and
          the tile soft-lit onto it as one group, behind the names. Measured
          from the row rather than from itself, because the band slides in
          under a transform and the row is where it comes to rest.
        */}
        {texture !== null ? (
          <div className="absolute inset-0 -z-10" style={{ opacity: 0.9 }}>
            <div className="absolute inset-0" style={{ backgroundColor: background }} />
            <RoyalTextureFill texture={texture} anchorRef={rowRef} />
          </div>
        ) : null}
        <p
          className="max-w-full truncate text-center text-[calc(1.0625*var(--card-rem,1rem))] leading-tight"
          style={{
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as never,
            color: accent,
          }}
        >
          {names}
        </p>
      </div>
    </div>
  );
}
