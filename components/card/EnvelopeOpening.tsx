"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { RevealGateContext } from "@/hooks/useRevealGate";

/**
 * The envelope a guest opens to reach the card.
 *
 * Lifafa means envelope, and this is the one moment the name is literal. It is
 * also the first thing a guest sees, which is why almost every decision here is
 * about getting out of their way: it waits for a tap rather than starting on
 * its own, it can be skipped from the first frame, and it removes itself from
 * the DOM the moment it is done.
 *
 * It waits for a tap for a specific reason. An opening animation that starts on
 * arrival is one a guest can walk into halfway through — the link opens in a
 * background tab, or the page loads while the phone is in a pocket — and a
 * half-finished animation with no beginning does not read as a flourish. It
 * reads as something broken. A tap means the guest is present for all of it.
 */

/** Flap swinging up on the seam. */
const FLAP_MS = 700;

/** Envelope growing and dissolving as the card comes up beneath it. */
const DISSOLVE_MS = 600;

/** How wide the envelope is drawn, as a share of the viewport. */
const ENVELOPE_WIDTH = "70vw";

/** The drawing's own box. The flap hinges along y = 34, which is the seam. */
const VIEWBOX_W = 200;
const VIEWBOX_H = 132;
const SEAM_Y = 34;

type Phase = "closed" | "opening" | "dissolving";

export default function EnvelopeOpening({
  accent,
  background,
  children,
}: {
  accent: string;
  background: string;
  children: ReactNode;
}): ReactElement {
  /*
    In React state and nowhere else, on purpose.

    There is no localStorage flag saying "this guest has seen it", so a reload
    shows the envelope again. That is a real cost and it is accepted: artifacts
    cannot use browser storage, and a seen-flag would also be a per-device
    guess that gets it wrong for the guest who opens the link on a phone and
    again on a laptop. The Skip button is what makes a repeat viewing cheap.
  */
  const [phase, setPhase] = useState<Phase>("closed");
  const [isDone, setIsDone] = useState(false);

  const timerRef = useRef<number | null>(null);

  /*
    Read through the shared hook, which answers false on the server and during
    hydration and only then swaps in the real match, so nothing here can put a
    different tree in the markup than the one the browser hydrates.
  */
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** A timer outliving the component would set state on a dead tree. */
  useEffect(() => clearTimer, [clearTimer]);

  /*
    The page behind must not scroll while the envelope is up. On a phone a
    stray drag scrolls a card the guest cannot see yet, and they arrive at the
    reception details having missed the names.
  */
  useEffect(() => {
    if (isDone) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isDone]);

  const finish = useCallback((): void => {
    clearTimer();
    setIsDone(true);
  }, [clearTimer]);

  const handleOpen = useCallback((): void => {
    /*
      The phase is the whole double tap guard. A second tap during the sequence
      would queue a second pair of timers, and an impatient guest could stack
      several; there is no separate flag to keep in step with this one.
    */
    if (phase !== "closed") {
      return;
    }

    setPhase("opening");

    timerRef.current = window.setTimeout(() => {
      setPhase("dissolving");

      timerRef.current = window.setTimeout(finish, DISSOLVE_MS);
    }, FLAP_MS);
  }, [finish, phase]);

  /*
    Nothing at all under reduced motion.

    Not a shorter animation and not a still envelope with a tap on it: a guest
    who has asked their device for less movement has asked to be taken to the
    content, and an envelope they still have to tap through is a stile, not a
    flourish. The gate below opens with it, so the card's own scroll reveals
    behave exactly as they do on any other page.
  */
  if (prefersReducedMotion || isDone) {
    return <>{children}</>;
  }

  const isOpening = phase !== "closed";
  const isDissolving = phase === "dissolving";

  /* Hinged on the seam, so the flap swings from where it is drawn to fold. */
  const flapStyle: CSSProperties = {
    transformBox: "fill-box",
    transformOrigin: "50% 0%",
    transition: `transform ${FLAP_MS}ms cubic-bezier(0.32, 0, 0.24, 1)`,
    transform: isOpening
      ? "perspective(900px) rotateX(-172deg)"
      : "perspective(900px) rotateX(0deg)",
  };

  /* Then the whole envelope leans towards the guest and goes. */
  const envelopeStyle: CSSProperties = {
    transition: `transform ${DISSOLVE_MS}ms ease-in, opacity ${DISSOLVE_MS}ms ease-in`,
    transform: isDissolving ? "scale(1.14)" : "scale(1)",
    opacity: isDissolving ? 0 : 1,
  };

  return (
    <>
      {/*
        The card is mounted underneath the whole time and fades up through the
        dissolve, so the envelope opens onto something rather than onto a blank
        page that fills in afterwards.

        `inert` keeps that safe: while the envelope is up the card takes no
        focus, no clicks and no screen reader cursor, so the only thing a guest
        can reach is the way in. The reveal gate beside it stops the card's
        scroll animations arming down here out of sight, where they would run
        to completion before anyone saw them.
      */}
      <RevealGateContext value={isDissolving}>
        <div
          inert={!isDissolving}
          style={{
            transition: `opacity ${DISSOLVE_MS}ms ease-out`,
            opacity: isDissolving ? 1 : 0,
          }}
        >
          {children}
        </div>
      </RevealGateContext>

      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
        style={{ backgroundColor: background, ...envelopeStyle }}
      >
        {/*
          The whole face is the target, not a button under the drawing. A guest
          told to tap an envelope taps the envelope.
        */}
        <button
          type="button"
          onClick={handleOpen}
          disabled={isOpening}
          aria-label="Tap to open the invitation"
          className="flex flex-col items-center gap-5 rounded-2xl p-2 focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-default"
          style={{ outlineColor: accent, width: ENVELOPE_WIDTH }}
        >
          <svg
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            className="h-auto w-full"
            fill="none"
            stroke={accent}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="presentation"
            focusable="false"
            aria-hidden
          >
            {/* Body. */}
            <rect x="6" y="6" width="188" height="120" rx="6" />

            {/* The pocket, and the two side folds behind it. */}
            <path d="M6 126 L100 62 L194 126" opacity="0.5" />
            <path d="M6 6 L100 62 L194 6" opacity="0.35" />

            {/*
              The flap, hinged on the seam it is drawn from. Filled with the
              card's own ground rather than left transparent, so the folds
              underneath do not show through the paper while it swings.
            */}
            <g style={flapStyle}>
              <path
                d={`M6 ${SEAM_Y} L100 96 L194 ${SEAM_Y} L194 6 L6 6 Z`}
                fill={background}
              />
              <path d={`M6 ${SEAM_Y} L100 96 L194 ${SEAM_Y}`} />
              {/* The seam itself: a hairline where the fold is scored. */}
              <path
                d={`M6 ${SEAM_Y} L194 ${SEAM_Y}`}
                opacity="0.32"
                strokeDasharray="3 5"
              />
            </g>

            {/* The wax seal, sitting on the point where the flap closes. */}
            <circle cx="100" cy="96" r="13" fill={background} />
            <circle cx="100" cy="96" r="13" />
            <circle cx="100" cy="96" r="8" opacity="0.45" />
            <path d="M100 90 L104 96 L100 102 L96 96 Z" opacity="0.7" />
          </svg>

          <span
            className="text-[0.8125rem] tracking-[0.22em] uppercase"
            style={{ color: accent, opacity: isOpening ? 0 : 0.65 }}
          >
            Tap to open
          </span>
        </button>

        {/*
          Present from the first frame, not revealed once the sequence starts.

          A guest who has opened this card before, or who simply does not want
          the flourish, must never have to sit through it to find the way past.
          That is the whole reason it is here, so appearing late would defeat it.
        */}
        <button
          type="button"
          onClick={finish}
          className="absolute right-4 bottom-4 flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-[0.8125rem] focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: accent, outlineColor: accent, opacity: 0.6 }}
        >
          Skip
        </button>
      </div>
    </>
  );
}
