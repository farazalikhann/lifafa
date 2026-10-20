"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { musicMutedByGuest } from "@/lib/cardMusic";
import {
  playCoverSound,
  preloadCoverSound,
  primeCoverSound,
  warmCoverSound,
} from "@/lib/coverSound";
import Farmaan from "@/templates/sheesh-mahal/Farmaan";
import Foil from "@/templates/sheesh-mahal/Foil";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import { useRoomArt } from "@/templates/sheesh-mahal/picture";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import { sheeshCopy, whenIdle } from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const SOUND = "sheesh-mahal-rsvp";
/* The send, to the sound's own timeline (NOTES.md): rolled by 0.6s, a kandeel by 1s, gone by 3.2s. */
const SEND_MS = 3200;
const ROLLED_MS = 600;
const LIT_FROM_MS = 500;
const LIT_MS = 1000;
/* The rolled farmaan, if it would be off the screen, is brought to here (a share of the screen's height). */
const BRING_TO = 0.3;

/* What the frame is doing: the form, the reply being sent, or the confirmation. */
type Phase = "form" | "sending" | "done";

/**
 * Page 8: the reply, on a farmaan on the night.
 *
 * THE PAPER ONLY, and its page. What is on it is the card's own reply form,
 * or its confirmation and the guest's pass, handed in as they are, in the
 * farmaan's theme (`farmaanTheme` in shared.ts); the stylesheet sets them on
 * the paper as page 7's words are: the heading in gold script, the fields
 * as fine gold lines, the three replies as ivory satin with a thin gold edge
 * (the chosen one soft gold), and Send a larger ivory satin pill. Nothing
 * about what a reply does is here.
 *
 * A page in the flow, not a fixed room: the form can be longer than a
 * screen (its errors, the pass), so it scrolls like any page.
 *
 * SENT, THE FARMAAN GOES UP AS A KANDEEL, once, when the page tells it the
 * form has become the confirmation (`stage`), which only a reply that landed
 * does; 3.2s, to sheesh-mahal-rsvp.mp3:
 *
 *   0 to 0.6s    the paper rolls up into the top rod: the bottom rod
 *                rises and covers the words (Farmaan.tsx's two transforms).
 *                Rolled up where the guest cannot see it, above the screen
 *                after a long form, it is brought down into view as it
 *                rolls.
 *   0.5 to 1s    the rolled farmaan fades into a kandeel in the same place,
 *                a warm glow lit behind it.
 *   1 to 3.2s    the kandeel rises off the top of the screen, swaying
 *                gently and a little smaller as it goes, its glow with it.
 *
 * Then "Your reply is on its way" in gold foil on the night, and the
 * confirmation and the pass come up on the farmaan under it, at the top of
 * the page. Every part a transform or an opacity, each placed once as the
 * send starts.
 *
 * A reply that fails never becomes the confirmation, so none of it plays:
 * the error is on the paper as it always was. Under reduced motion the
 * confirmation simply fades in, in silence.
 *
 * THE SOUND is the cover's handling (lib/coverSound.ts): fetched and decoded
 * as the page arrives, with the kandeel's picture, so the send never waits on
 * either; its audio started inside the guest's tap on Send, as a phone wants;
 * played only once the reply has landed, at the usual volume, through Web
 * Audio, which a phone on silent keeps silent; not at all for a guest who
 * has paused the card's music (lib/cardMusic.ts). Never waited for.
 */
export default function SheeshRsvpFrame({
  children,
  stage = "form",
  language = "en",
}: {
  children: ReactNode;
  stage?: "form" | "confirmed";
  language?: CardLanguage;
}): ReactElement {
  const art = useRoomArt();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [seen, setSeen] = useState(stage);
  const [phase, setPhase] = useState<Phase>(stage === "confirmed" ? "done" : "form");
  /* The form as last shown: kept on the paper while it rolls up. */
  const lastForm = useRef<ReactNode>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);
  const lanternRef = useRef<HTMLDivElement>(null);
  const onItsWayRef = useRef<HTMLParagraphElement>(null);
  const own = sheeshCopy(language);

  if (stage === "form") {
    lastForm.current = children;
  }

  /* The form became the confirmation: the reply is sent off (or, with less motion, simply replaced). */
  if (stage !== seen) {
    setSeen(stage);
    setPhase(stage === "confirmed" ? (reducedMotion || lastForm.current === null ? "done" : "sending") : "form");
  }

  /* The kandeel and the sound, ready before anything is sent. */
  const kandeel = art?.kandeel ?? null;

  useEffect(() => {
    if (kandeel === null) {
      return;
    }

    const image = new Image();
    image.src = kandeel;
    void image.decode().catch(() => undefined);
  }, [kandeel]);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    preloadCoverSound(SOUND);
    return whenIdle(() => warmCoverSound(SOUND));
  }, [reducedMotion]);

  /* Send, tapped: the audio is started here, inside the tap, for the sound that follows a reply that lands. */
  const onTap = (event: MouseEvent<HTMLDivElement>): void => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;

    if (
      stage === "form" &&
      !reducedMotion &&
      !musicMutedByGuest() &&
      button !== null &&
      !button.disabled &&
      button.parentElement?.tagName === "SECTION" &&
      !button.hasAttribute("aria-pressed")
    ) {
      primeCoverSound(SOUND);
    }
  };

  useEffect(() => {
    if (phase !== "sending") {
      return;
    }

    const mover = moverRef.current;
    const body = bodyRef.current;
    const words = wordsRef.current;
    const lantern = lanternRef.current;
    const holder = lantern?.offsetParent;

    if (mover === null || body === null || words === null || lantern === null || !(holder instanceof HTMLElement)) {
      setPhase("done");
      return;
    }

    /* Not for a guest who has silenced the card's music. */
    if (!musicMutedByGuest()) {
      playCoverSound(SOUND);
    }

    /*
      Read once, as the send starts: where the farmaan is on the screen and
      in its page, its paper's height and its foot's. Nothing is read again.
    */
    const box = mover.getBoundingClientRect();
    const page = holder.getBoundingClientRect();
    const paper = body.offsetHeight;
    const foot = mover.offsetWidth * 0.264;
    const rod = mover.offsetWidth * 0.2787;
    const rolled = rod + foot;
    const screen = window.innerHeight;
    const safe = Math.min(screen * 0.12, 96);
    const bring = box.top < safe || box.top + rolled > screen * 0.8 ? screen * BRING_TO - box.top : 0;
    /* The kandeel, centred where the rolled farmaan ends up. */
    const centre = box.top + bring + rolled / 2;
    lantern.style.top = `${Math.round(centre - page.top)}px`;
    const rise = centre + lantern.offsetHeight * 0.6 + 24;
    const at = (ms: number): number => ms / SEND_MS;
    const timing: KeyframeAnimationOptions = { duration: SEND_MS, fill: "forwards" };
    const roll = "cubic-bezier(0.55, 0, 0.35, 1)";

    const animations = [
      /* The paper up into the rod, and the words held where they are, so it covers them. */
      body.animate(
        [
          { offset: 0, transform: "translate3d(0, 0, 0)", easing: roll },
          { offset: at(ROLLED_MS), transform: `translate3d(0, ${(foot - paper).toFixed(1)}px, 0)` },
          { offset: 1, transform: `translate3d(0, ${(foot - paper).toFixed(1)}px, 0)` },
        ],
        timing,
      ),
      words.animate(
        [
          { offset: 0, transform: "translate3d(0, 0, 0)", easing: roll },
          { offset: at(ROLLED_MS), transform: `translate3d(0, ${(paper - foot).toFixed(1)}px, 0)` },
          { offset: 1, transform: `translate3d(0, ${(paper - foot).toFixed(1)}px, 0)` },
        ],
        timing,
      ),
      /* The whole farmaan brought into view as it rolls, where it must be; then gone into the kandeel. */
      mover.animate(
        [
          { offset: 0, transform: "translate3d(0, 0, 0)", opacity: 1, easing: roll },
          { offset: at(ROLLED_MS), transform: `translate3d(0, ${bring.toFixed(1)}px, 0)`, opacity: 1, easing: "ease-in" },
          { offset: at(LIT_MS), transform: `translate3d(0, ${bring.toFixed(1)}px, 0)`, opacity: 0 },
          { offset: 1, transform: `translate3d(0, ${bring.toFixed(1)}px, 0)`, opacity: 0 },
        ],
        timing,
      ),
      /* The kandeel, lit where the farmaan was, then up and away, a little smaller as it goes. */
      lantern.animate(
        [
          { offset: 0, transform: "translate3d(-50%, -50%, 0) scale(0.9)", opacity: 0 },
          { offset: at(LIT_FROM_MS), transform: "translate3d(-50%, -50%, 0) scale(0.9)", opacity: 0, easing: "ease-out" },
          { offset: at(LIT_MS), transform: "translate3d(-50%, -50%, 0) scale(1)", opacity: 1, easing: "cubic-bezier(0.45, 0, 0.7, 1)" },
          { offset: 1, transform: `translate3d(-50%, calc(-50% - ${rise.toFixed(0)}px), 0) scale(0.78)`, opacity: 1 },
        ],
        timing,
      ),
    ];

    const done = animations[3];
    done.addEventListener("finish", () => {
      /* At the top of the page again, for what follows: the screen is only the night now, the kandeel gone first. */
      lantern.style.visibility = "hidden";
      holder.closest("[data-sm-page]")?.scrollIntoView({ block: "start" });
      setPhase("done");
    });

    return () => {
      for (const animation of animations) {
        animation.cancel();
      }
    };
  }, [phase]);

  const sending = phase === "sending";
  const confirmed = phase === "done" && stage === "confirmed";

  /* "On its way" in the card's own script: the one the confirmation's heading is set in, read once. */
  useLayoutEffect(() => {
    const line = onItsWayRef.current;
    const heading = wordsRef.current?.querySelector("h2");

    if (confirmed && line !== null && heading !== null && heading !== undefined) {
      line.style.fontFamily = getComputedStyle(heading).fontFamily;
    }
  }, [confirmed]);

  return (
    <SheeshPage
      label={own.pages.rsvp}
      images={art === null ? [] : [art.farmaan, art.kandeel]}
      flow
      className={`${styles.palette} ${styles.replyPage}`}
    >
      {confirmed ? (
        <p ref={onItsWayRef} className={styles.onItsWay}>
          <Foil text={own.onItsWay} />
        </p>
      ) : null}

      <div
        ref={moverRef}
        data-stage={sending ? "form" : stage}
        className={`${styles.replyMover} ${confirmed ? styles.replyArrive : ""}`}
        onClickCapture={onTap}
      >
        <Farmaan open bodyRef={bodyRef} wordsRef={wordsRef}>
          {sending ? lastForm.current : children}
        </Farmaan>
      </div>

      {/* The kandeel it becomes, placed only when the reply is sent. */}
      {sending ? (
        <div ref={lanternRef} aria-hidden="true" className={styles.sendLantern}>
          <span className={styles.sendSway}>
            <span className={styles.sendGlow} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art?.kandeel} alt="" draggable={false} className={styles.sendArt} />
          </span>
        </div>
      ) : null}
    </SheeshPage>
  );
}
