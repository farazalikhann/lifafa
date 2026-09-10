"use client";

import { type CSSProperties, type ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import { stage } from "@/components/invite/covers/timing";
import { mixHex } from "@/lib/contrast";

/**
 * How the open splits across the shell's timer, as fractions of --cover-ms.
 *
 * These add up to exactly 1, and each stage starts where the last one ends, so
 * the envelope finishes fading on the same frame the shell unmounts it. Change
 * one and the others have to move with it.
 */
const SEAL_SHARE = 0.25;
const FLAP_SHARE = 0.45;
const FADE_SHARE = 0.3;

const SEAL_START = 0;
const FLAP_START = SEAL_SHARE;
const FADE_START = SEAL_SHARE + FLAP_SHARE;

/** Words that join two names rather than being one, skipped when taking initials. */
const JOINERS = new Set(["and", "weds", "with", "the", "of", "to", "&", "+", "x"]);

/**
 * Up to two initials for the seal, or an empty string when there is nothing
 * usable. "Aarav weds Meera" gives AM, not AWM.
 */
function initialsOf(title: string | undefined): string {
  if (title === undefined) {
    return "";
  }

  const letters: string[] = [];

  for (const word of title.split(/\s+/)) {
    const cleaned = word.replace(/[^\p{L}\p{N}]/gu, "");

    if (cleaned.length === 0 || JOINERS.has(cleaned.toLowerCase())) {
      continue;
    }

    letters.push(cleaned.charAt(0).toUpperCase());

    if (letters.length === 2) {
      break;
    }
  }

  return letters.join("");
}

/**
 * The envelope a guest tears open.
 *
 * Drawn rather than animated by a library: one inline SVG, three moving parts,
 * and CSS transitions that fire when the shell flips the phase. It never takes
 * a pointer event — the shell's button is the whole click surface — so this is
 * only ever a picture of what tapping does.
 *
 * Every colour comes from `colors`, which is the card's own palette worked into
 * paper tones. The envelope used to be cream and gold whatever was inside it,
 * on the argument that a wrapper is not the card; the argument was wrong the
 * moment a host picked Ink, because a white envelope in front of a black card
 * is not a wrapper, it is a different object. See lib/coverPalette.ts.
 */
export default function EnvelopeSealCover({
  phase,
  option,
  reducedMotion,
  colors,
  title,
}: CoverVisualState): ReactElement {
  const opening = phase === "opening";
  const initials = initialsOf(title);

  /*
    Every transition below is a fraction of this, so the visual cannot drift out
    of step with the setTimeout that unmounts it: change the option's duration
    and both move together.
  */
  const rootStyle = {
    "--cover-ms": `${option.durationMs}ms`,
  } as CSSProperties;

  /* The seal lifts off first and takes the flap's hold with it. */
  const sealStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "50% 50%",
    transition: reducedMotion
      ? undefined
      : [
          stage("opacity", SEAL_SHARE, SEAL_START, "ease-out"),
          stage("transform", SEAL_SHARE, SEAL_START, "ease-out"),
        ].join(", "),
    transform: opening ? "translateY(-14px) scale(0.86)" : "none",
    opacity: opening ? 0 : 1,
  };

  /*
    The hinge is the top edge of the flap's own box, which is why this needs
    `transform-box: fill-box` — an SVG element's transform origin is otherwise
    measured from the viewBox corner, and the flap would swing around a point
    somewhere off the drawing. The perspective is written into the transform
    rather than set on a parent, so the 3D depends on nothing above it.
  */
  const flapStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "50% 0%",
    transition: reducedMotion
      ? undefined
      : stage("transform", FLAP_SHARE, FLAP_START, "cubic-bezier(0.32,0,0.24,1)"),
    transform: opening
      ? "perspective(900px) rotateX(-168deg)"
      : "perspective(900px) rotateX(0deg)",
  };

  /* Then the whole thing leans towards the guest and goes. */
  const envelopeStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "50% 50%",
    transition: reducedMotion
      ? undefined
      : [
          stage("opacity", FADE_SHARE, FADE_START, "ease-in"),
          stage("transform", FADE_SHARE, FADE_START, "ease-in"),
        ].join(", "),
    transform: opening ? "scale(1.08)" : "scale(1)",
    opacity: opening ? 0 : 1,
  };

  return (
    <div
      aria-hidden
      style={rootStyle}
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
    >
      <svg
        viewBox="0 0 400 300"
        className="h-auto w-full max-w-[420px]"
        role="presentation"
        focusable="false"
      >
        <g style={envelopeStyle}>
          {/* Body. Everything else is drawn onto this. */}
          <rect
            x="40"
            y="70"
            width="320"
            height="180"
            rx="10"
            fill={colors.paper}
            stroke={colors.edge}
            strokeWidth="1.5"
          />

          {/* The two side panels, folded in behind the pocket. */}
          <path d="M40 70 L200 178 L40 250 Z" fill={colors.paperLift} opacity="0.75" />
          <path d="M360 70 L200 178 L360 250 Z" fill={colors.paperLift} opacity="0.75" />

          {/* Front pocket, the piece the card sits in. */}
          <path
            d="M40 250 L200 142 L360 250 Z"
            fill={colors.paperLift}
            stroke={colors.edge}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Back flap, hinged along y=70 and shut over the pocket. */}
          <path
            d="M40 70 L360 70 L200 178 Z"
            fill={colors.paperDeep}
            stroke={colors.edge}
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={flapStyle}
          />

          {/* Wax seal, sitting on the flap's point where the fold closes. */}
          <g style={sealStyle}>
            <g
              className={
                reducedMotion
                  ? undefined
                  : "origin-center animate-[lifafa-seal-pulse_2.6s_ease-in-out_infinite] motion-reduce:animate-none"
              }
            >
              {/*
                The rim is the accent's own shadow rather than a fixed brown:
                mixed towards whatever the seal is written in, so a green wax
                gets a green rim and a pale gold one does not get a dark ring
                drawn round it.
              */}
              <circle
                cx="200"
                cy="178"
                r="27"
                fill={colors.accent}
                stroke={mixHex(colors.accent, colors.onAccent, 0.28)}
                strokeWidth="2"
              />
              <circle
                cx="200"
                cy="178"
                r="21"
                fill="none"
                stroke={colors.onAccent}
                strokeWidth="1"
                opacity="0.55"
              />
              {initials.length > 0 ? (
                <text
                  x="200"
                  y="178"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="font-[family-name:var(--font-display)]"
                  fontSize="18"
                  letterSpacing="1"
                  fill={colors.onAccent}
                  opacity="0.75"
                >
                  {initials}
                </text>
              ) : (
                /* No usable name: a plain diamond, the product's own mark. */
                <path
                  d="M200 166 L209 178 L200 190 L191 178 Z"
                  fill={colors.onAccent}
                  opacity="0.55"
                />
              )}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
