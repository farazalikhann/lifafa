"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactElement,
} from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cardCopy } from "@/lib/cardLanguage";
import { coupleOf, familyBlocks, type FamilyBlock } from "@/lib/cardSections";
import { COUPLE_GLINTS, JHAROKHA, JHAROKHA_ASPECT } from "@/templates/sheesh-mahal/art";
import { useCoupleFit, type CoupleFit } from "@/templates/sheesh-mahal/fit";
import Foil from "@/templates/sheesh-mahal/Foil";
import Glints from "@/templates/sheesh-mahal/Glints";
import SheeshPage from "@/templates/sheesh-mahal/Page";
import { useRoomArt } from "@/templates/sheesh-mahal/picture";
import { usePageRest } from "@/templates/sheesh-mahal/rest";
import styles from "@/templates/sheesh-mahal/sheesh.module.css";
import {
  INDIGO_INK,
  scriptLeading,
  sheeshCopy,
  type SheeshFonts,
} from "@/templates/sheesh-mahal/shared";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/* How far open a shutter swings, about its outer edge, and how. */
const OPEN_DEG = 100;
const OPEN_MS = 900;
const CLOSE_MS = 560;
const SOFT = "cubic-bezier(0.33, 0, 0.2, 1)";
/* After a tap has closed them, before they open again. */
const REOPEN_AFTER = 120;
/* How long the first slide stays once its shutters are open, before the second comes by itself. */
const ADVANCE_AFTER = 3000;
/* One slide out and the next in; a crossfade under reduced motion; a drag let go short, back. */
const SLIDE_MS = 600;
const FADE_MS = 400;
const BACK_MS = 320;
const SLIDE_EASE = "cubic-bezier(0.45, 0, 0.2, 1)";
/* How far a slide travels on its way out or in, as a share of its own width. */
const SLIDE_SHIFT = 0.42;
/* A drag that has gone this far sideways before it has gone as far down is the slides'; past this share of the width, or this fast (px per ms), it switches. */
const SIDEWAYS_PX = 8;
const SWITCH_PAST = 0.22;
const SWITCH_SPEED = 0.5;

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

interface Shutters {
  left: HTMLDivElement | null;
  right: HTMLDivElement | null;
  /** Mid-swing: a tap waits for it. */
  busy: boolean;
  /** Opened on this visit: they open once, the first time their slide is seen at rest. */
  opened: boolean;
}

const angle = (side: 1 | -1, open: boolean): string => `rotateY(${open ? side * OPEN_DEG : 0}deg)`;

/** Both halves from shut to open or back, each about its outer edge; left where it ends, as its own style. */
async function swing(shutters: Shutters, open: boolean, duration: number, easing: string): Promise<void> {
  const halves = [
    [shutters.left, 1],
    [shutters.right, -1],
  ] as const;
  const swings = halves.flatMap(([half, side]) => {
    if (half === null) {
      return [];
    }

    const animation = half.animate([{ transform: angle(side, !open) }, { transform: angle(side, open) }], {
      duration,
      easing,
      fill: "forwards",
    });

    return [{ half, side, animation }];
  });

  try {
    await Promise.all(swings.map(({ animation }) => animation.finished));
  } catch {
    return;
  }

  for (const { half, side, animation } of swings) {
    half.style.transform = angle(side, open);
    animation.cancel();
  }
}

/** A small gold ornament, for a window with nothing else to say. */
function Ornament(): ReactElement {
  return (
    <svg viewBox="0 0 120 40" aria-hidden="true" focusable="false" className={styles.jhOrnament}>
      <path d="M6 20 H40 M80 20 H114" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path
        d="M40 20 C44 13 50 13 52 18 M80 20 C76 13 70 13 68 18 M40 20 C44 27 50 27 52 22 M80 20 C76 27 70 27 68 22"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M60 6 L69 20 L60 34 L51 20 Z" fill="currentColor" />
      <path d="M60 13 L64.5 20 L60 27 L55.5 20 Z" fill="#fbf4e4" />
      <circle cx="4" cy="20" r="1.8" fill="currentColor" />
      <circle cx="116" cy="20" r="1.8" fill="currentColor" />
    </svg>
  );
}

/** The jharokha: the ivory panel with the words, the shutters behind the frame, and the frame in front. */
function Jharokha({
  person,
  language,
  fonts,
  register,
  shutters,
  open,
  onTap,
}: {
  person: FamilyBlock;
  language: CardLanguage;
  fonts: SheeshFonts;
  register: CoupleFit;
  shutters: Shutters;
  /** Open from the start: reduced motion, and the printed copy. */
  open: boolean;
  onTap: () => void;
}): ReactElement {
  const art = useRoomArt();
  const copy = cardCopy(language);
  /* "Son of" for the first named, the groom; "Daughter of" for the second, the bride (the card's own rule). */
  const childOf = person.key === "one" ? copy.family.sonOf : copy.family.daughterOf;
  const { text, panel, shutters: doors } = JHAROKHA;
  const doorHeight = JHAROKHA.shutterHeight / (doors.bottom - doors.top);

  return (
    <div className={styles.jharokha} onClick={onTap}>
      <div
        className={styles.jhPanel}
        style={{ top: pc(panel.top), bottom: pc(1 - panel.bottom), left: pc(panel.left), right: pc(1 - panel.right) }}
      />
      <div
        ref={(element) => {
          register.box = element;
        }}
        className={styles.jhText}
        style={{ top: pc(text.top), bottom: pc(1 - text.bottom), left: pc(text.left), right: pc(1 - text.right) }}
      >
        <div
          ref={(element) => {
            register.words = element;
          }}
          className={`${styles.jhWords} ${styles.lineUp}`}
          style={{ color: INDIGO_INK, "--sm-delay": "250ms" } as CSSProperties}
        >
          {person.parents !== null ? (
            <>
              <p className={`${styles.jhChildOf} ${styles.caps}`} style={fonts.heading}>
                {childOf}
              </p>
              <p className={styles.jhParents} style={fonts.body}>
                {person.parents}
              </p>
            </>
          ) : null}
          {person.city !== null ? (
            <p className={styles.jhCity} style={fonts.body}>
              {person.city}
            </p>
          ) : null}
          {person.parents === null && person.city === null ? <Ornament /> : null}
        </div>
      </div>
      <div
        aria-hidden="true"
        className={styles.jhShutters}
        style={{ top: pc(doors.top), bottom: pc(1 - doors.bottom), left: pc(doors.left), right: pc(1 - doors.right) }}
      >
        {(
          [
            ["left", 1, art?.doorLeft],
            ["right", -1, art?.doorRight],
          ] as const
        ).map(([side, turn, src]) => (
          <div
            key={side}
            ref={(element) => {
              shutters[side] = element;
            }}
            className={`${styles.jhShutter} ${side === "left" ? styles.doorLeft : styles.doorRight}`}
            style={{ height: pc(doorHeight), [side]: 0, transform: open ? angle(turn, true) : undefined }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className={styles.doorArt} />
          </div>
        ))}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={art?.jharokhaFrame} alt="" loading="lazy" decoding="async" draggable={false} className={styles.jhFrame} />
    </div>
  );
}

/**
 * Page 4: the couple, one at a time, in one large jharokha on the night.
 *
 * TWO SLIDES, the groom's and then the bride's, as the form asks for them
 * (`coupleOf`; the card has no setting for the order). Each is a small
 * spaced-caps line, "The Groom" or "The Bride", and the name in gold foil
 * script over a jharokha about 85% of the screen wide, a little below the
 * middle. The name is on one line at the largest size its column takes, and
 * on two only when one would be under 30px (fit.ts). In the window, on the
 * ivory panel, "Son of" or "Daughter of", the parents and the town in deep
 * indigo, fitted to its safe area (JHAROKHA.text); a missing line is left
 * out, and a window with neither parents nor town shows a small gold
 * ornament. A card for one person, or one that is not a couple's with
 * parents or a town written (`familyBlocks`), has the slides without the
 * caps line, and one alone has no dots.
 *
 * THE SHUTTERS are shut when the page comes in. Once the walk into the room
 * has finished (usePageRest) the groom's swing open about their outer edges;
 * three seconds after, once, the slides move on by themselves: the groom's
 * slides out to the left and fades as the bride's comes in from the right,
 * and her shutters open. After that the guest is in control: a sideways
 * swipe on the slides (only a sideways one: vertical pans are the page's, as
 * on Gulab Mahal's stack of functions) or a tap on one of the two gold dots
 * under them. "Swipe" under the dots until the guest first switches. A tap on
 * the jharokha closes its shutters and opens them again, once.
 *
 * Every move is a transform or opacity, by the Web Animations API, and left
 * as plain style when it ends, so no layer is kept between moves; the drag is
 * written once a frame with nothing read from the page. Under reduced motion
 * the shutters are open from the start, the slides crossfade, and nothing
 * moves on by itself.
 *
 * Behind the jharokha, a still warm gold glow, and a few slow glints on the
 * night either side and on its pillars (Glints.tsx): the tilt changes only
 * how bright they are.
 */
export default function SheeshCouplePage({
  draft,
  occasionId,
  language,
  fonts,
}: {
  draft: EventDraft;
  occasionId: OccasionId;
  language: CardLanguage;
  fonts: SheeshFonts;
}): ReactElement | null {
  const art = useRoomArt();
  const own = sheeshCopy(language);
  const still = useCardStill();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const openFromStart = still || reducedMotion;
  const couple = coupleOf(draft, occasionId);
  const people = (couple ?? familyBlocks(draft)).slice(0, 2);
  const count = people.length;
  const roles = [own.couple.groom, own.couple.bride];

  const [active, setActive] = useState(0);
  /* Whether the guest has switched slides themselves, which retires the hint. */
  const [guided, setGuided] = useState(false);
  const activeRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([null, null]);
  const parts = useRef<CoupleFit[]>([
    { name: null, box: null, words: null },
    { name: null, box: null, words: null },
  ]);
  const shutters = useRef<Shutters[]>([
    { left: null, right: null, busy: false, opened: false },
    { left: null, right: null, busy: false, opened: false },
  ]);
  /* A switch on its way: which way it goes, for the layout effect that moves the slides. */
  const going = useRef<{ from: number; direction: 1 | -1 } | null>(null);
  const moving = useRef(false);
  const atRest = useRef(false);
  /* The one move on by itself: done, and its wait. */
  const advanced = useRef(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef({ pointer: -1, startX: 0, startY: 0, lastX: 0, lastT: 0, speed: 0, sideways: false, width: 0, frame: 0, dragged: false });

  useCoupleFit(
    parts,
    `${people.map((person) => `${person.name ?? ""}|${person.parents ?? ""}|${person.city ?? ""}`).join("||")}|${language}`,
  );

  const openFor = async (index: number): Promise<void> => {
    const one = shutters.current[index];

    if (openFromStart || one.opened || one.left === null) {
      return;
    }

    one.opened = true;
    one.busy = true;
    await swing(one, true, OPEN_MS, SOFT);
    one.busy = false;
  };

  const stopAdvance = (): void => {
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  /* A switch to `to`: the slides are moved by the layout effect below, once React has marked the new one. */
  const go = (to: number, direction: 1 | -1, byGuest: boolean): void => {
    const from = activeRef.current;

    if (to === from || to < 0 || to >= count || moving.current) {
      return;
    }

    if (byGuest) {
      advanced.current = true;
      stopAdvance();
      setGuided(true);
    }

    moving.current = true;
    going.current = { from, direction };
    activeRef.current = to;
    setActive(to);
  };

  const armAdvance = (wait: number): void => {
    stopAdvance();

    if (advanced.current || reducedMotion || still || count < 2 || activeRef.current !== 0) {
      return;
    }

    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;

      if (!atRest.current || advanced.current) {
        return;
      }

      /* Not while the tab is hidden, nor under the guest's finger or mid-move: a while later. */
      if (document.visibilityState === "hidden") {
        const back = (): void => {
          if (document.visibilityState === "visible") {
            document.removeEventListener("visibilitychange", back);
            armAdvance(ADVANCE_AFTER);
          }
        };
        document.addEventListener("visibilitychange", back);
        return;
      }

      if (drag.current.pointer !== -1 || moving.current) {
        armAdvance(1500);
        return;
      }

      advanced.current = true;
      go(1, 1, false);
    }, wait);
  };

  usePageRest(stageRef, {
    onRest: () => {
      atRest.current = true;
      const shown = activeRef.current;
      /* Three seconds from when the groom's shutters are open (at once, if they already are). */
      void openFor(shown).then(() => {
        if (atRest.current && activeRef.current === 0) {
          armAdvance(ADVANCE_AFTER);
        }
      });
    },
    onLeave: () => {
      atRest.current = false;
      stopAdvance();
    },
  });

  useEffect(() => stopAdvance, []);

  /* The new slide in and the old one out, before the frame in which React has swapped them is painted. */
  useLayoutEffect(() => {
    const move = going.current;

    if (move === null) {
      return;
    }

    going.current = null;
    const out = slideRefs.current[move.from];
    const into = slideRefs.current[active];

    if (out === null || into === null) {
      moving.current = false;
      return;
    }

    /* Where a drag left the old one, as written: no layout read. */
    const fromTransform = out.style.transform || "translate3d(0, 0, 0)";
    const fromOpacity = out.style.opacity || "1";
    const shift = (sign: number): string => `translate3d(${(sign * SLIDE_SHIFT * 100).toFixed(1)}%, 0, 0)`;
    const plain = reducedMotion;
    const timing: KeyframeAnimationOptions = {
      duration: plain ? FADE_MS : SLIDE_MS,
      easing: plain ? "ease-in-out" : SLIDE_EASE,
      fill: "both",
    };

    out.setAttribute("data-leaving", "");
    const animations = [
      out.animate(
        plain
          ? [{ opacity: fromOpacity }, { opacity: 0 }]
          : [
              { transform: fromTransform, opacity: fromOpacity },
              { transform: shift(-move.direction), opacity: 0 },
            ],
        timing,
      ),
      into.animate(
        plain
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { transform: shift(move.direction), opacity: 0 },
              { transform: "translate3d(0, 0, 0)", opacity: 1 },
            ],
        timing,
      ),
    ];

    const settle = (): void => {
      out.removeAttribute("data-leaving");

      for (const slide of [out, into]) {
        slide.style.transform = "";
        slide.style.opacity = "";
      }

      for (const animation of animations) {
        animation.cancel();
      }

      moving.current = false;
    };

    void Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        settle();

        if (atRest.current) {
          void openFor(activeRef.current);
        }
      },
      () => {
        moving.current = false;
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (count === 0) {
    return null;
  }

  /* A tap on the jharokha: its shutters closed, and open again, once; not before they have first opened, nor mid-swing, nor after a drag. */
  const replay = (index: number): void => {
    const one = shutters.current[index];

    if (drag.current.dragged) {
      drag.current.dragged = false;
      return;
    }

    if (openFromStart || !one.opened || one.busy || one.left === null) {
      return;
    }

    one.busy = true;
    void swing(one, false, CLOSE_MS, "cubic-bezier(0.5, 0, 0.6, 1)")
      .then(() => new Promise((resolve) => setTimeout(resolve, REOPEN_AFTER)))
      .then(() => swing(one, true, OPEN_MS, SOFT))
      .finally(() => {
        one.busy = false;
      });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    const slide = slideRefs.current[activeRef.current];

    if (count < 2 || moving.current || slide === null) {
      return;
    }

    const state = drag.current;
    state.pointer = event.pointerId;
    state.startX = event.clientX;
    state.startY = event.clientY;
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;
    state.speed = 0;
    state.sideways = false;
    state.dragged = false;
    /* Read once, here. */
    state.width = slide.offsetWidth;
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;

    if (event.pointerId !== state.pointer) {
      return;
    }

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.sideways) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > SIDEWAYS_PX) {
        /* Down or up first: the page's, not the slides'. */
        state.pointer = -1;
        return;
      }

      if (Math.abs(dx) < SIDEWAYS_PX) {
        return;
      }

      state.sideways = true;
      state.dragged = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    const elapsed = Math.max(1, event.timeStamp - state.lastT);
    state.speed = (event.clientX - state.lastX) / elapsed;
    state.lastX = event.clientX;
    state.lastT = event.timeStamp;

    if (state.frame === 0) {
      state.frame = window.requestAnimationFrame(() => {
        state.frame = 0;
        const slide = slideRefs.current[activeRef.current];

        if (slide === null) {
          return;
        }

        const moved = state.lastX - state.startX;
        /* Towards a slide there is none past: held back. */
        const towards = activeRef.current - Math.sign(moved);
        const held = towards < 0 || towards >= count ? moved * 0.25 : moved * 0.6;
        const share = Math.min(1, Math.abs(held) / Math.max(1, state.width));
        slide.style.transform = `translate3d(${held.toFixed(1)}px, 0, 0)`;
        slide.style.opacity = (1 - share * 0.6).toFixed(3);
      });
    }
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    const state = drag.current;

    if (event.pointerId !== state.pointer) {
      return;
    }

    state.pointer = -1;
    window.cancelAnimationFrame(state.frame);
    state.frame = 0;

    if (!state.sideways) {
      return;
    }

    const moved = state.lastX - state.startX;
    const direction: 1 | -1 = moved < 0 ? 1 : -1;
    const to = activeRef.current + direction;
    const far = Math.abs(moved) > state.width * SWITCH_PAST || Math.abs(state.speed) > SWITCH_SPEED;

    if (far && to >= 0 && to < count) {
      go(to, direction, true);
      return;
    }

    const slide = slideRefs.current[activeRef.current];

    if (slide === null || slide.style.transform === "") {
      return;
    }

    const back = slide.animate(
      [
        { transform: slide.style.transform, opacity: slide.style.opacity || "1" },
        { transform: "translate3d(0, 0, 0)", opacity: 1 },
      ],
      { duration: BACK_MS, easing: SOFT },
    );
    slide.style.transform = "";
    slide.style.opacity = "";
    void back.finished.catch(() => undefined);
  };

  return (
    <SheeshPage
      label={own.pages.couple}
      images={art === null ? [] : [art.jharokhaFrame, art.doorLeft, art.doorRight]}
      overlay={<Glints glints={COUPLE_GLINTS} listen followPage />}
    >
      <div
        className={`${styles.couple} ${language === "hi" ? styles.coupleHi : ""}`}
        style={{ "--jh-aspect": String(JHAROKHA_ASPECT) } as CSSProperties}
      >
        <div
          ref={stageRef}
          className={styles.coupleStage}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* The glow, laid out as a slide is so it sits behind the jharokha, and still while the slides move. */}
          <div aria-hidden="true" className={styles.coupleSlide}>
            <div className={styles.coupleHead} />
            <div className={styles.jharokha}>
              <span className={styles.coupleGlow} />
            </div>
          </div>

          {people.map((person, index) => {
            const shown = index === active;

            return (
              <div
                key={person.key}
                ref={(element) => {
                  slideRefs.current[index] = element;
                }}
                className={styles.coupleSlide}
                data-slide=""
                data-shown={shown ? "" : undefined}
                aria-hidden={shown ? undefined : true}
                inert={!shown}
              >
                <div className={styles.coupleHead}>
                  {couple !== null ? (
                    <p className={`${styles.coupleRole} ${styles.caps} ${styles.lineUp}`} style={fonts.heading}>
                      {roles[index]}
                    </p>
                  ) : null}
                  {person.name !== null ? (
                    <h3
                      ref={(element) => {
                        parts.current[index].name = element;
                      }}
                      data-name={person.name}
                      className={`${styles.coupleName} ${styles.lineUp}`}
                      style={{ ...fonts.names, lineHeight: scriptLeading(language), "--sm-delay": "120ms" } as CSSProperties}
                    >
                      <Foil text={person.name} />
                    </h3>
                  ) : null}
                </div>
                <Jharokha
                  person={person}
                  language={language}
                  fonts={fonts}
                  register={parts.current[index]}
                  shutters={shutters.current[index]}
                  open={openFromStart}
                  onTap={() => replay(index)}
                />
              </div>
            );
          })}
        </div>

        {count > 1 ? (
          <div className={`${styles.coupleNav} ${styles.lineUp}`} style={{ "--sm-delay": "400ms" } as CSSProperties}>
            <div className={styles.coupleDots}>
              {people.map((person, index) => (
                <button
                  key={person.key}
                  type="button"
                  className={styles.coupleDot}
                  aria-label={couple !== null ? roles[index] : (person.name ?? String(index + 1))}
                  aria-current={index === active ? "true" : undefined}
                  onClick={() => go(index, index > activeRef.current ? 1 : -1, true)}
                >
                  <span />
                </button>
              ))}
            </div>
            <p
              aria-hidden="true"
              className={`${styles.coupleHint} ${guided ? styles.coupleHintGone : ""}`}
              style={fonts.heading}
            >
              <svg viewBox="0 0 8 12" focusable="false">
                <path d="M6 1 L2 6 L6 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{own.couple.swipe}</span>
              <svg viewBox="0 0 8 12" focusable="false">
                <path d="M2 1 L6 6 L2 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
          </div>
        ) : null}
      </div>
    </SheeshPage>
  );
}
