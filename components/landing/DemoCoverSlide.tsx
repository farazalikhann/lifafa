import type { CSSProperties, ReactElement } from "react";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { getCoverAnimation } from "@/lib/coverAnimations";
import { curtainArt } from "@/lib/curtainArt";
import { CURTAIN_LIGHT_FILM } from "@/lib/curtainLightFilm";
import { DEMO_NIKAH } from "@/lib/demoCards";
import { fontFamilyOf, getFontPair, namesFaceOf, pairRoleVar } from "@/lib/fontPairs";

/**
 * The sample card's closed cover: the curtains, with "You are invited" and
 * the names over them and the prompt on its plaque.
 *
 * THE ONE FRAME THE CARD DOES NOT DRAW ITSELF. The real cover (CoverShell) is
 * a layer over the whole screen that locks the page behind it, waits on the
 * card and listens for a tap; none of that can stand in a frame on the home
 * page. So this is the same cover set down by hand: the film's own first
 * frame, the cover's own words from the card's copy, in the card's own names
 * face and the cloth's own inks, at the sizes and places CoverShell gives
 * them on a phone 390px wide. A change to how the closed cover is laid out
 * has to be made here too.
 *
 * No state and no effects, so it is in the server's HTML: the carousel's
 * first frame is painted before any of the card's code has arrived.
 */
export default function DemoCoverSlide(): ReactElement {
  const { draft, config, coverAnimation } = DEMO_NIKAH;
  const copy = cardCopy(config.language);
  const option = getCoverAnimation(coverAnimation);
  const art = curtainArt();
  const fontPair = getFontPair(config.style.fontPairId);
  const namesFace = namesFaceOf(fontPair);
  const names = coverNameLine(
    resolveCoverNames(draft, config.occasionId, config.language),
  );

  const namesFont: CSSProperties = {
    fontFamily: fontFamilyOf(namesFace.variable, namesFace.fallback),
    fontWeight: namesFace.weight,
    letterSpacing: namesFace.tracking,
    color: art.ink,
  };
  const shadow = "0 1px 2px rgba(0, 0, 0, 0.6), 0 0 14px rgba(0, 0, 0, 0.55)";

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#420D11" }}>
      {/* The film's first frame, filling the frame as the film fills a phone. */}
      <img
        src={CURTAIN_LIGHT_FILM.poster}
        alt=""
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover select-none"
      />

      <div
        className="absolute inset-x-0 flex flex-col items-center gap-2 px-7 text-center"
        style={{ top: 46, textShadow: shadow }}
      >
        <p
          style={{
            ...namesFont,
            fontSize: `${1.75 * namesFace.scale}rem`,
            lineHeight: Math.max(namesFace.leading, 1.25),
          }}
        >
          {copy.coverInvite.heading}
        </p>
        <p
          className="max-w-full"
          style={{
            ...namesFont,
            fontSize: `${1.5 * namesFace.scale}rem`,
            lineHeight: Math.max(namesFace.leading, 1.3),
          }}
        >
          {names}
        </p>
        <p
          className="max-w-[19rem] text-[0.875rem] leading-[1.55]"
          style={{
            color: art.inkMuted,
            fontFamily: fontFamilyOf(pairRoleVar(fontPair, "body"), fontPair.bodyFallback),
          }}
        >
          {copy.coverInvite.line}
        </p>
      </div>

      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: 127 }}>
        <span
          className="rounded-full border px-5 py-2 text-[0.8125rem] tracking-[0.16em] uppercase shadow-[0_6px_18px_rgba(0,0,0,0.28)]"
          style={{
            backgroundColor: art.plaque,
            borderColor: art.plaqueEdge,
            color: art.plaqueInk,
            fontFamily: fontFamilyOf(
              pairRoleVar(fontPair, "heading"),
              fontPair.headingFallback,
            ),
            fontWeight: fontPair.headingWeight,
          }}
        >
          {option.openPromptText[config.language]}
        </span>
      </div>
    </div>
  );
}
