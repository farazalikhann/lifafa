"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { ART, SEAL_ASPECT } from "@/templates/gulab-mahal/art";
import { Corners } from "@/templates/gulab-mahal/Decor";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import GulabPage from "@/templates/gulab-mahal/Page";
import { gulabCopy } from "@/templates/gulab-mahal/shared";
import type { CardLanguage } from "@/types/card";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";
const SEND_MS = 2000;

/* What the frame is doing: the form, the letter being sent, or the confirmation. */
type Phase = "form" | "sending" | "done";

/**
 * Page 8: the reply, on a letter.
 *
 * THE PAPER ONLY, and its page. What is on it is the card's own reply form,
 * or its confirmation and the guest's pass, handed in as they are, in the
 * letter theme (`letterTheme` in shared.ts); the stylesheet sets it on the
 * letter: its heading in the script, its fields as fine rose-gold lines on
 * the paper, its Send in ivory satin. Nothing about what a reply does is
 * here.
 *
 * SENT, THE LETTER GOES IN THE POST, once, when the page tells it the form
 * has become the confirmation (`stage`), which only a reply that was
 * written does: the letter folds in half, the envelope rises from below, the
 * letter slides down into it, a rose-gold seal presses on, and the envelope
 * flies up and away, turning. Two seconds, every part a transform or an
 * opacity. Then "Your reply is on its way" on the velvet, and the
 * confirmation and the pass come up under it. A reply that fails never
 * becomes the confirmation, so it never plays: the error is on the paper as
 * it always was. Under reduced motion the confirmation simply fades in.
 *
 * The envelope and the seal are fetched and decoded as the page arrives, so
 * the send never waits on them.
 */
export default function GulabRsvpFrame({
  children,
  stage = "form",
  language = "en",
}: {
  children: ReactNode;
  stage?: "form" | "confirmed";
  language?: CardLanguage;
}): ReactElement {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [seen, setSeen] = useState(stage);
  const [phase, setPhase] = useState<Phase>(stage === "confirmed" ? "done" : "form");
  /* The form as last shown: kept on the letter while it is sent. */
  const lastForm = useRef<ReactNode>(null);
  const letterRef = useRef<HTMLDivElement>(null);
  const postRef = useRef<HTMLDivElement>(null);
  const envelopeRef = useRef<HTMLImageElement>(null);
  const sealRef = useRef<HTMLImageElement>(null);
  const own = gulabCopy(language);

  if (stage === "form") {
    lastForm.current = children;
  }

  /* The form became the confirmation: the letter is sent (or, with less motion, simply replaced). */
  if (stage !== seen) {
    setSeen(stage);
    setPhase(stage === "confirmed" ? (reducedMotion || lastForm.current === null ? "done" : "sending") : "form");
  }

  /* The envelope and the seal, ready before anything is sent. */
  useEffect(() => {
    for (const src of [ART.envelope, ART.seal]) {
      const image = new Image();
      image.src = src;
      void image.decode().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (phase !== "sending") {
      return;
    }

    const letter = letterRef.current;
    const post = postRef.current;
    const envelope = envelopeRef.current;
    const seal = sealRef.current;

    if (letter === null || post === null || envelope === null || seal === null) {
      setPhase("done");
      return;
    }

    /*
      The envelope comes up in the lower part of the screen the guest is
      looking at, wherever on this (possibly long) page that is: placed once,
      as the send starts, and then read once, against the letter.
    */
    const holder = post.offsetParent instanceof HTMLElement ? post.offsetParent.getBoundingClientRect().top : 0;
    post.style.top = `${Math.round(window.innerHeight * 0.52 - holder)}px`;
    post.style.bottom = "auto";
    const sheet = letter.getBoundingClientRect();
    const box = envelope.getBoundingClientRect();
    const into = box.top + box.height * 0.32 - (sheet.top + sheet.height * 0.25);
    const at = (ms: number): number => ms / SEND_MS;
    const timing: KeyframeAnimationOptions = { duration: SEND_MS, fill: "forwards" };

    const animations = [
      /* Folded in half, then down into the envelope, and gone behind its front. */
      letter.animate(
        [
          { offset: 0, transform: "translate3d(0, 0, 0) scale(1, 1)", opacity: 1, easing: "ease-in-out" },
          { offset: at(380), transform: "translate3d(0, 0, 0) scale(0.92, 0.5)", opacity: 1 },
          { offset: at(600), transform: "translate3d(0, 0, 0) scale(0.92, 0.5)", opacity: 1, easing: "cubic-bezier(0.5, 0, 0.75, 0.4)" },
          { offset: at(1080), transform: `translate3d(0, ${into.toFixed(0)}px, 0) scale(0.62, 0.3)`, opacity: 1 },
          { offset: at(1120), transform: `translate3d(0, ${into.toFixed(0)}px, 0) scale(0.62, 0.3)`, opacity: 0 },
          { offset: 1, transform: `translate3d(0, ${into.toFixed(0)}px, 0) scale(0.62, 0.3)`, opacity: 0 },
        ],
        timing,
      ),
      /* The envelope up from below; then, sealed, up and away with a turn. */
      post.animate(
        [
          { offset: 0, transform: "translate3d(0, 120vh, 0) rotate(0deg)", opacity: 1 },
          { offset: at(300), transform: "translate3d(0, 120vh, 0) rotate(0deg)", opacity: 1, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
          { offset: at(850), transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1 },
          { offset: at(1420), transform: "translate3d(0, 0, 0) rotate(0deg)", opacity: 1, easing: "cubic-bezier(0.55, 0, 0.85, 0.35)" },
          { offset: 1, transform: "translate3d(4vw, -120vh, 0) rotate(-12deg)", opacity: 0.2 },
        ],
        timing,
      ),
      /* The seal pressed on. */
      seal.animate(
        [
          { offset: 0, transform: "translate(-50%, -50%) scale(1.8)", opacity: 0 },
          { offset: at(1120), transform: "translate(-50%, -50%) scale(1.8)", opacity: 0, easing: SPRING },
          { offset: at(1380), transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
          { offset: 1, transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        ],
        timing,
      ),
    ];

    animations[0].addEventListener("finish", () => setPhase("done"));

    return () => {
      for (const animation of animations) {
        animation.cancel();
      }
    };
  }, [phase]);

  const sending = phase === "sending";

  return (
    <GulabPage label="RSVP" images={[ART.letterPaper, ART.shadow.letter, ART.envelope]} variant={6} className={`${styles.palette} ${styles.replyPage}`}>
      {phase === "done" && stage === "confirmed" ? (
        <p className={`${styles.onVelvet} ${styles.onItsWay}`}>{own.onItsWay}</p>
      ) : null}

      <div
        ref={letterRef}
        className={`${styles.replyLetter} ${styles.rise} ${phase === "done" && stage === "confirmed" ? styles.replyArrive : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ART.shadow.letter} alt="" aria-hidden="true" loading="lazy" decoding="async" draggable={false} className={styles.paperShadow2} />
        <div className={`${styles.paperSheet} ${styles.replySheet}`}>
          <Corners size={0.26} which="top" />
          <div className={styles.replyForm}>{sending ? lastForm.current : children}</div>
        </div>
      </div>

      {/* The envelope, below the screen until the letter is sent. */}
      {sending ? (
        <div ref={postRef} aria-hidden="true" className={styles.post}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img ref={envelopeRef} src={ART.envelope} alt="" draggable={false} className={styles.postEnvelope} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={sealRef}
            src={ART.seal}
            alt=""
            draggable={false}
            className={styles.postSeal}
            style={{ aspectRatio: String(SEAL_ASPECT) }}
          />
        </div>
      ) : null}
    </GulabPage>
  );
}
