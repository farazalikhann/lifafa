"use client";

import { useEffect, useRef, type CSSProperties, type ReactElement } from "react";
import { useCardStill } from "@/hooks/useCardStill";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cardCopy } from "@/lib/cardLanguage";
import { coupleOf, familyBlocks, type FamilyBlock } from "@/lib/cardSections";
import { ART, COUPLE_GLINTS, JHAROKHA, JHAROKHA_ASPECT } from "@/templates/sheesh-mahal/art";
import { useNamesAlike, type NameBox } from "@/templates/sheesh-mahal/fit";
import Foil from "@/templates/sheesh-mahal/Foil";
import Glints from "@/templates/sheesh-mahal/Glints";
import SheeshPage from "@/templates/sheesh-mahal/Page";
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
/* The bride's shutters after the groom's. */
const SECOND_AFTER = 300;
/* After a tap has closed them, before they open again. */
const REOPEN_AFTER = 120;

const pc = (share: number): string => `${(share * 100).toFixed(2)}%`;

interface Shutters {
  left: HTMLDivElement | null;
  right: HTMLDivElement | null;
  /** Mid-swing: a tap waits for it. */
  busy: boolean;
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

/** One jharokha: the frame in front, its shutters behind it, and the ivory panel with the words behind them. */
function Jharokha({
  person,
  order,
  language,
  fonts,
  register,
  shutters,
  open,
  onTap,
}: {
  person: FamilyBlock;
  order: number;
  language: CardLanguage;
  fonts: SheeshFonts;
  register: NameBox;
  shutters: Shutters;
  /** Open from the start: reduced motion, and the printed copy. */
  open: boolean;
  onTap: () => void;
}): ReactElement {
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
          style={{ color: INDIGO_INK, "--sm-delay": `${order * 150}ms` } as CSSProperties}
        >
          {person.name !== null ? (
            <h3
              ref={(element) => {
                register.name = element;
              }}
              data-name={person.name}
              className={styles.jhName}
              style={{ ...fonts.names, lineHeight: scriptLeading(language) }}
            >
              <Foil text={person.name} />
            </h3>
          ) : null}
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
        </div>
      </div>
      <div
        aria-hidden="true"
        className={styles.jhShutters}
        style={{ top: pc(doors.top), bottom: pc(1 - doors.bottom), left: pc(doors.left), right: pc(1 - doors.right) }}
      >
        {(
          [
            ["left", 1, ART.doorLeft],
            ["right", -1, ART.doorRight],
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
      <img src={ART.jharokhaFrame} alt="" loading="lazy" decoding="async" draggable={false} className={styles.jhFrame} />
    </div>
  );
}

/**
 * Page 4: the couple, in two jharokhas on the night.
 *
 * The groom's above and the bride's below, each about 40% of the page's
 * height, a small gold "&" in script between them; one alone in the middle
 * for a card for one. Who is who, and in what order, is the card's own:
 * `coupleOf` for a couple, the groom first, as the form asks for them, and
 * `familyBlocks` for anyone else with parents or a town written.
 *
 * EACH JHAROKHA, back to front: an ivory panel a little larger than the
 * window, with the name in gold foil script and then "Son of" or "Daughter
 * of", the parents and the town in deep indigo, fitted inside the window's
 * safe area (JHAROKHA.text) by the rules of Gulab Mahal's tags (fit.ts): the
 * two names at one size, broken only between words, the rest stepped down to
 * fit. A missing line is left out and the rest stays centred. Then the
 * shutters, the cover's two door halves as a pair a little wider than the
 * window, and the frame in front of everything, which hides their outer
 * edges as the cover's wall hides its doors.
 *
 * THE SHUTTERS are shut when the page comes in, and open once the walk into
 * the room has finished (usePageRest), never during it: the groom's swing
 * open in 3D about their outer edges, and 300ms later the bride's. A tap on a
 * jharokha closes its shutters and opens them again, once; a tap while they
 * are moving is let go. Transforms alone, and no layer is kept for them
 * between swings. Under reduced motion they are open from the start and the
 * words simply fade in.
 *
 * A few slow glints on the night either side (Glints.tsx): the tilt changes
 * only how bright they are.
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
  const own = sheeshCopy(language);
  const still = useCardStill();
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const openFromStart = still || reducedMotion;
  const people = (coupleOf(draft, occasionId) ?? familyBlocks(draft)).slice(0, 2);
  const stackRef = useRef<HTMLDivElement>(null);
  const parts = useRef<NameBox[]>([
    { box: null, words: null, name: null },
    { box: null, words: null, name: null },
  ]);
  const shutters = useRef<Shutters[]>([
    { left: null, right: null, busy: false },
    { left: null, right: null, busy: false },
  ]);
  /* Whether the shutters have been opened on this visit, and the second's wait. */
  const opened = useRef(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useNamesAlike(
    parts,
    `${people.map((person) => `${person.name ?? ""}|${person.parents ?? ""}|${person.city ?? ""}`).join("||")}|${language}`,
  );

  const openOne = (index: number): void => {
    const one = shutters.current[index];

    if (one.left === null) {
      return;
    }

    one.busy = true;
    void swing(one, true, OPEN_MS, SOFT).finally(() => {
      one.busy = false;
    });
  };

  usePageRest(stackRef, {
    onRest: () => {
      if (opened.current || openFromStart) {
        return;
      }

      opened.current = true;
      openOne(0);
      pending.current = setTimeout(() => {
        pending.current = null;
        openOne(1);
      }, SECOND_AFTER);
    },
  });

  useEffect(
    () => () => {
      if (pending.current !== null) {
        clearTimeout(pending.current);
      }
    },
    [],
  );

  if (people.length === 0) {
    return null;
  }

  /* A tap: closed, and open again, once; not before they have first opened, nor mid-swing. */
  const replay = (index: number): void => {
    const one = shutters.current[index];

    if (openFromStart || !opened.current || one.busy || one.left === null) {
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

  return (
    <SheeshPage
      label={own.pages.couple}
      images={[ART.jharokhaFrame, ART.doorLeft, ART.doorRight]}
      overlay={<Glints glints={COUPLE_GLINTS} listen followPage />}
    >
      <div
        ref={stackRef}
        className={styles.couple}
        style={{ "--jh-aspect": String(JHAROKHA_ASPECT) } as CSSProperties}
      >
        {people.map((person, index) => (
          <div key={person.key} className={styles.jharokhaPlace}>
            {index === 1 ? (
              <span aria-hidden="true" className={`${styles.coupleAnd} ${styles.lineUp}`} style={fonts.names}>
                &amp;
              </span>
            ) : null}
            <Jharokha
              person={person}
              order={index}
              language={language}
              fonts={fonts}
              register={parts.current[index]}
              shutters={shutters.current[index]}
              open={openFromStart}
              onTap={() => replay(index)}
            />
          </div>
        ))}
      </div>
    </SheeshPage>
  );
}
