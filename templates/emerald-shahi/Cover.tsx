"use client";

import type { CSSProperties, ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import {
  ART,
  BODY_ASPECT,
  CLOSED_PLACEMENT,
  FLAP_POINT,
  LETTER,
  OPEN_PLACEMENT,
} from "@/templates/emerald-shahi/art";
import styles from "@/templates/emerald-shahi/emerald.module.css";

/**
 * Emerald Shahi's opening: a velvet envelope under a gold seal, which a tap
 * opens.
 *
 * WHAT IS HERE IS ONLY THE DRAWING. The tap, the tick, the guard against a
 * second tap, the wait for the pictures, the loader, the sound and what a
 * guest who asked for no motion gets are all CoverShell's, as for every other
 * cover: this is handed a phase and draws it.
 *
 * THE 2.4 SECONDS, each part a transition of opacity or transform and nothing
 * else, timed from the moment the phase leaves "closed":
 *
 *   0 to 300       the seal lifts off the flap and fades
 *   250 to 900     the closed envelope becomes the open one. The open picture
 *                  fades in over the closed one before the closed one goes,
 *                  so the envelope is never thin enough to see through
 *   700 to 1700    the ivory card rises out from behind the pocket, the
 *                  couple's names on it
 *   1700 to 2400   the envelope, the card and the cover's ground fade away
 *                  together. The card page was let go under them at 1700
 *                  (`revealAt` in config.ts), so it is what they fade to
 *
 * THE TWO ENVELOPE PICTURES ARE LAID ON ONE BOX, the envelope's body, each
 * scaled and shifted so its own body is that box; see art.ts for the
 * measurements. That is why nothing jumps in the crossfade.
 *
 * Under reduced motion the shell never hands over "opening": the closed
 * envelope stays as it is while the shell fades the whole cover in 300ms.
 */

const EASE_OUT = "cubic-bezier(0.2, 0.7, 0.2, 1)";
const GLIDE = "cubic-bezier(0.45, 0.05, 0.2, 1)";

/* The box the rising card is cut to: the card's own width, from well above the envelope down to the pocket's point. */
const CLIP_ROOM_ABOVE = 1.6;
const CLIP_HEIGHT = CLIP_ROOM_ABOVE + LETTER.point.y;
const LETTER_WIDTH = LETTER.right - LETTER.left;
/* A little past the pocket's point, so the card's foot is never seen leaving the V. */
const LETTER_HEIGHT = LETTER.point.y + 0.04 - LETTER.top;
const inClip = (y: number): number => (CLIP_ROOM_ABOVE + y) / CLIP_HEIGHT;
const percent = (value: number): string => `${(value * 100).toFixed(3)}%`;

const POCKET_CLIP = `polygon(0 0, 100% 0, 100% ${percent(inClip(LETTER.shoulder))}, ${percent(
  (LETTER.point.x - LETTER.left) / LETTER_WIDTH,
)} 100%, 0 ${percent(inClip(LETTER.shoulder))})`;

export default function EmeraldShahiCover({
  phase,
  pair,
  title,
  prompt,
  namesFont,
  headingFont,
}: CoverVisualState): ReactElement {
  const opening = phase !== "closed";

  /* Two letters for two names, or the first two of whatever the card is titled. */
  const initials =
    pair !== undefined
      ? `${initialOf(pair[0])}${initialOf(pair[1])}`
      : initialsOf(title);

  const picture: CSSProperties = {
    position: "absolute",
    maxWidth: "none",
    userSelect: "none",
  };

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div
        className={styles.coverGround}
        style={{
          opacity: opening ? 0 : 1,
          transition: opening ? `opacity 650ms ease-in-out 1750ms` : undefined,
        }}
      />

      {/*
        The envelope's body. Everything is sized from its width, `--box`, so
        the seal, the letters on it and the card keep their proportions on a
        360px phone and on a laptop alike. Narrow enough to leave the shell's
        words above it and the hint under it on a short screen.
      */}
      <div
        className="absolute top-[54%] left-1/2"
        style={
          {
            "--box": "min(80vw, 23rem, 46vh)",
            width: "var(--box)",
            aspectRatio: String(BODY_ASPECT),
            opacity: opening ? 0 : 1,
            transform: opening
              ? "translate3d(-50%, -50%, 0) scale(1.05)"
              : "translate3d(-50%, -50%, 0)",
            transition: opening
              ? `opacity 600ms ease-in-out 1750ms, transform 650ms ${GLIDE} 1750ms`
              : undefined,
          } as CSSProperties
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.envelopeOpen}
          alt=""
          draggable={false}
          style={{
            ...picture,
            ...OPEN_PLACEMENT,
            opacity: opening ? 1 : 0,
            transition: opening ? `opacity 450ms ease-in-out 250ms` : undefined,
          }}
        />

        {/*
          The card that comes out. It starts exactly on the card drawn inside
          the open envelope, in that card's own ivory, and is cut along the
          pocket's V by a clip that never moves, so it rises from behind the
          pocket. Hidden until the open envelope is there to rise out of.
        */}
        <div
          className="absolute"
          style={{
            left: percent(LETTER.left),
            width: percent(LETTER_WIDTH),
            top: percent(-CLIP_ROOM_ABOVE),
            height: percent(CLIP_HEIGHT),
            clipPath: POCKET_CLIP,
          }}
        >
          <div
            className="absolute inset-x-0 flex flex-col items-center rounded-[0.2rem] text-center"
            style={{
              top: percent(inClip(LETTER.top)),
              height: percent(LETTER_HEIGHT / CLIP_HEIGHT),
              backgroundImage: "linear-gradient(#f6ebde, #efe4d5)",
              boxShadow: "inset 0 0 0 1px rgb(184 146 74 / 0.35)",
              paddingTop: "calc(var(--box) * 0.07)",
              paddingInline: "calc(var(--box) * 0.05)",
              opacity: opening ? 1 : 0,
              transform: opening
                ? "translate3d(0, -64%, 0)"
                : "translate3d(0, 0, 0)",
              transition: opening
                ? `opacity 120ms linear 700ms, transform 1000ms ${GLIDE} 700ms`
                : undefined,
              willChange: opening ? "transform" : undefined,
            }}
          >
            {/*
              One name to a line, with the "&" between: a line of its own each
              way is what keeps two full names from breaking mid-name on a
              card this narrow.
            */}
            <span
              className="flex max-w-full flex-col items-center wrap-anywhere text-balance"
              style={{
                ...namesFont,
                color: "#7a5714",
                fontSize: "calc(var(--box) * 0.088)",
                lineHeight: 1.2,
              }}
            >
              {pair !== undefined ? (
                <>
                  <span>{pair[0]}</span>
                  <span style={{ ...headingFont, fontSize: "0.5em" }}>&amp;</span>
                  <span>{pair[1]}</span>
                </>
              ) : (
                title
              )}
            </span>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ART.envelopeClosed}
          alt=""
          draggable={false}
          style={{
            ...picture,
            ...CLOSED_PLACEMENT,
            opacity: opening ? 0 : 1,
            transition: opening ? `opacity 350ms ease-in 550ms` : undefined,
          }}
        />

        {/* The seal, on the point of the flap, with the couple's letters pressed into it. */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: percent(FLAP_POINT.x),
            top: percent(FLAP_POINT.y),
            width: "calc(var(--box) * 0.3)",
            aspectRatio: "1",
            opacity: opening ? 0 : 1,
            transform: opening
              ? "translate3d(-50%, -66%, 0) scale(1.16)"
              : "translate3d(-50%, -50%, 0)",
            transition: opening
              ? `opacity 300ms ease-out, transform 300ms ${EASE_OUT}`
              : undefined,
          }}
        >
          {/* The seal's shadow on the velvet: a soft dark disc under it, which costs nothing to move. */}
          <span
            className="absolute inset-[4%] translate-y-[7%] rounded-full"
            style={{
              backgroundImage:
                "radial-gradient(closest-side, rgb(0 0 0 / 0.55) 55%, transparent 100%)",
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ART.seal}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full select-none"
          />
          {initials.length > 0 ? (
            <span
              className={`relative ${styles.engraved}`}
              style={{
                ...headingFont,
                fontSize: "calc(var(--box) * 0.092)",
                letterSpacing: initials.length > 1 ? "0.06em" : undefined,
                lineHeight: 1.2,
              }}
            >
              {initials}
            </span>
          ) : (
            /* Nobody named yet: a small flower, never a symbol of anybody's faith. */
            <GoldFlower
              hi="#a57a1e"
              body="#7a5714"
              lo="#5c400c"
              className="relative w-[34%]"
            />
          )}
        </div>

        {/* Under the envelope, where a thumb already is. */}
        <p
          className={`absolute inset-x-[-20%] text-center ${opening ? "" : styles.hint}`}
          style={{
            ...headingFont,
            top: "calc(100% + var(--box) * 0.14)",
            color: "#ecd08f",
            fontSize: "0.8125rem",
            /* Devanagari is never spaced out: its letters join along the line above them. */
            letterSpacing: /[ऀ-ॿ]/.test(prompt) ? undefined : "0.14em",
            opacity: opening ? 0 : undefined,
            transition: opening ? "opacity 200ms ease-out" : undefined,
          }}
        >
          {prompt}
        </p>
      </div>
    </div>
  );
}
