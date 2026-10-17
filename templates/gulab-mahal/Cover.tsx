"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
} from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import GoldFlower from "@/components/invite/covers/GoldFlower";
import { initialOf, initialsOf } from "@/components/invite/covers/initials";
import { ART, PETAL_ASPECT, ROSE_ASPECT } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { fontFamilyOf } from "@/lib/fontPairs";

/**
 * Gulab Mahal's opening: the rose blooms.
 *
 * ONLY THE DRAWING. The tap, the tick on Android, the guard against a second
 * tap, the wait for the pictures and the fonts, the loader, the sound and
 * what a guest who asked for less motion gets are all CoverShell's: this is
 * handed a phase and draws it. Under reduced motion the shell never hands
 * over "opening", so the rose stays as it is while the whole cover crossfades
 * to the card in 300ms.
 *
 * THE 2.6 SECONDS, timed from the moment the phase leaves "closed", every
 * part one Web Animations API animation of transform and opacity, started
 * together and run by the compositor:
 *
 *   0 to 520        the rose breathes once: up to 106% and back
 *   300 to 1050     six small petals open out from behind it
 *   560 to 1330     then eight medium ones
 *   820 to 1620     then ten large ones, blush and ivory in turn
 *   1050 to 1550    as the outer ring opens, the rose fades into an ivory
 *                   plate with the couple's initials in rose gold
 *   1650 to 2550    every petal drifts outward and down and fades, and the
 *                   plate with them
 *   1700 to 2450    the cover's blush ground fades. The card was let go under
 *                   it at 1700 (`revealAt` in config.ts), so page 2 is what
 *                   shows through between the petals, never a blank frame
 *
 * EVERY PETAL IS ON THE PAGE FROM THE START, behind the rose, where it cannot
 * be seen, and at full size: so each is decoded and painted, at the size it
 * opens to, before the tap, and nothing is added or painted again as the
 * bloom begins. The rose, the glow, the plate and the ground are each their
 * own layer from the start for the same reason (`will-change` in the
 * stylesheet), and none is ever drawn larger than it was painted. Each points outward along
 * its own angle and grows as it moves out, with a little tilt of its own from
 * the table below (not a dice roll, so every opening is the same flower).
 */

const DURATION = 2600;
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";
const SOFT = "cubic-bezier(0.22, 1, 0.36, 1)";
const DRIFT = "cubic-bezier(0.45, 0.05, 0.7, 0.55)";
const GLIDE = "cubic-bezier(0.45, 0.05, 0.2, 1)";

interface Ring {
  /** Which petal picture, by index into ART.petals; "alt" takes 2 and 3 in turn. */
  petal: number | "alt";
  count: number;
  /** Where its petals settle, from the rose's centre, in rose widths. */
  radius: number;
  /** A petal's width, in rose widths. */
  size: number;
  /** Turned this far, so no petal sits in line with one of the ring inside it. */
  offset: number;
  /** When it starts opening, in ms from the tap, and for how long. */
  at: number;
  run: number;
}

const RINGS: readonly Ring[] = [
  { petal: 0, count: 6, radius: 0.5, size: 0.27, offset: 30, at: 300, run: 750 },
  { petal: 1, count: 8, radius: 0.7, size: 0.32, offset: 22.5, at: 560, run: 770 },
  { petal: "alt", count: 10, radius: 0.9, size: 0.38, offset: 0, at: 820, run: 800 },
];

/* A tilt for each petal, in degrees, and how much later than its ring it leaves: a written table. */
const TILT = [7, -9, 4, -5, 11, -3, 8, -10, 2, -7, 6, -4, 9, -11, 3, -6, 10, -2, 5, -8, 12, -1, 7, -9];
const LAG = [0, 40, 15, 55, 25, 5, 45, 20, 60, 10, 35, 50, 0, 30, 15, 45, 25, 55, 5, 40, 20, 35, 10, 50];

interface Petal {
  src: string;
  /** Its angle round the rose, degrees clockwise from straight up. */
  angle: number;
  radius: number;
  size: number;
  aspect: number;
  tilt: number;
  at: number;
  run: number;
  ring: number;
}

const PETALS: readonly Petal[] = RINGS.flatMap((ring, ringIndex) =>
  Array.from({ length: ring.count }, (_, index) => {
    const n = RINGS.slice(0, ringIndex).reduce((sum, r) => sum + r.count, 0) + index;
    const picture = ring.petal === "alt" ? 2 + (index % 2) : ring.petal;

    return {
      src: ART.petals[picture],
      angle: ring.offset + (360 / ring.count) * index,
      radius: ring.radius,
      size: ring.size,
      aspect: PETAL_ASPECT[picture],
      tilt: TILT[n % TILT.length],
      at: ring.at + LAG[n % LAG.length] * 0.5,
      run: ring.run,
      ring: ringIndex,
    };
  }),
);

/** One petal's transform: the same list of functions in every keyframe, so each part interpolates on its own. */
function petalTransform(
  petal: Petal,
  rose: number,
  {
    out,
    tilt,
    scale,
    fallX = 0,
    fallY = 0,
  }: { out: number; tilt: number; scale: number; fallX?: number; fallY?: number },
): string {
  return `translate3d(${fallX.toFixed(1)}px, ${fallY.toFixed(1)}px, 0) rotate(${petal.angle}deg) translateY(${(
    -out * rose
  ).toFixed(1)}px) rotate(${tilt}deg) scale(${scale})`;
}

export default function GulabMahalCover({
  phase,
  pair,
  title,
  prompt,
  namesFont,
  headingFont,
}: CoverVisualState): ReactElement {
  const opening = phase !== "closed";
  const bloomRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const roseRef = useRef<HTMLImageElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const petalRefs = useRef<(HTMLImageElement | null)[]>([]);
  const startedRef = useRef(false);
  /* The cover is lettered in the card's language, which the prompt is already in. */
  const hindi = /[ऀ-ॿ]/.test(prompt);
  /* Lora's italic for an English prompt; Devanagari has no italic and is set upright in the pair's serif. */
  const promptFont: CSSProperties = hindi
    ? headingFont
    : { fontFamily: fontFamilyOf("--font-lora", "Georgia, serif"), fontStyle: "italic" };

  useEffect(() => {
    if (!opening || startedRef.current) {
      return;
    }

    const bloom = bloomRef.current;

    if (bloom === null) {
      return;
    }

    startedRef.current = true;
    /* The rose's width, read once at the tap: every distance is a share of it. */
    const rose = bloom.offsetWidth;
    const at = (ms: number): number => Math.min(1, Math.max(0, ms / DURATION));
    const timing: KeyframeAnimationOptions = { duration: DURATION, fill: "forwards" };
    const animations: (Animation | undefined)[] = [];

    animations.push(
      roseRef.current?.animate(
        [
          { offset: 0, transform: "scale(1)", opacity: 1, easing: "ease-in-out" },
          { offset: at(260), transform: "scale(1.06)", opacity: 1, easing: "ease-in-out" },
          { offset: at(520), transform: "scale(1)", opacity: 1 },
          { offset: at(1050), transform: "scale(1)", opacity: 1, easing: "ease-in-out" },
          { offset: at(1550), transform: "scale(0.9)", opacity: 0 },
          { offset: 1, transform: "scale(0.9)", opacity: 0 },
        ],
        timing,
      ),
      /* The glow brightens with the breath and fades with the ground: opacity only, so it is never painted again. */
      glowRef.current?.animate(
        [
          { offset: 0, opacity: 0.8, easing: "ease-out" },
          { offset: at(420), opacity: 1 },
          { offset: at(1700), opacity: 0.9, easing: GLIDE },
          { offset: at(2400), opacity: 0 },
          { offset: 1, opacity: 0 },
        ],
        timing,
      ),
      /* Never larger than it is painted: it springs up to its own size and fades where it is. */
      plateRef.current?.animate(
        [
          { offset: 0, transform: "scale(0.84)", opacity: 0.01 },
          { offset: at(1100), transform: "scale(0.84)", opacity: 0.01, easing: SPRING },
          { offset: at(1600), transform: "scale(1)", opacity: 1 },
          { offset: at(1820), transform: "scale(1)", opacity: 1, easing: GLIDE },
          { offset: at(2450), transform: "scale(1)", opacity: 0 },
          { offset: 1, transform: "scale(1)", opacity: 0 },
        ],
        timing,
      ),
      groundRef.current?.animate(
        [
          { offset: 0, opacity: 1 },
          { offset: at(1700), opacity: 1, easing: "ease-in-out" },
          { offset: at(2450), opacity: 0 },
          { offset: 1, opacity: 0 },
        ],
        timing,
      ),
    );

    PETALS.forEach((petal, index) => {
      const element = petalRefs.current[index];

      if (element === null || element === undefined) {
        return;
      }

      /* Out along its own angle, and down: the drift that carries it off the card. */
      const away = petal.radius + 0.35 + petal.ring * 0.08;
      const fallY = rose * (0.55 + 0.1 * (index % 3));
      const leave = 1650 + LAG[index % LAG.length] * 1.6;

      animations.push(
        element.animate(
          [
            { offset: 0, transform: petalTransform(petal, rose, { out: 0.05, tilt: 0, scale: 0.3 }) },
            {
              offset: at(petal.at),
              transform: petalTransform(petal, rose, { out: 0.05, tilt: 0, scale: 0.3 }),
              easing: SOFT,
            },
            {
              offset: at(petal.at + petal.run),
              transform: petalTransform(petal, rose, { out: petal.radius, tilt: petal.tilt, scale: 1 }),
            },
            {
              offset: at(leave),
              transform: petalTransform(petal, rose, { out: petal.radius, tilt: petal.tilt, scale: 1 }),
              opacity: 1,
              easing: DRIFT,
            },
            {
              offset: 1,
              transform: petalTransform(petal, rose, {
                out: away,
                tilt: petal.tilt * 3,
                scale: 0.92,
                fallY,
              }),
              opacity: 0,
            },
          ],
          timing,
        ),
      );
    });

    /*
      Kept on their last frame until the shell takes the cover down: the
      animations fill forwards, and are left to go with the elements.
    */
    return () => {
      for (const animation of animations) {
        animation?.cancel();
      }
    };
  }, [opening]);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {/* The cover's own ground, which it fades itself; see CoverVisualState. */}
      <div ref={groundRef} className={styles.coverGround} />

      <div
        ref={bloomRef}
        className={styles.bloom}
        style={{ aspectRatio: String(ROSE_ASPECT) } as CSSProperties}
      >
        <span ref={glowRef} className={styles.bloomGlow} />

        {PETALS.map((petal, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={index}
            ref={(element) => {
              petalRefs.current[index] = element;
            }}
            src={petal.src}
            alt=""
            draggable={false}
            className={styles.bloomPetal}
            style={
              {
                "--w": `${(petal.size * 100).toFixed(2)}%`,
                "--h-ratio": String(1 / petal.aspect),
                /*
                  Full size at rest, hidden behind the rose, so it is painted
                  at the largest it will be while the cover sits still: the
                  first frame of its opening takes it down to 30%, out of
                  sight, and nothing has to be painted again as it grows.
                */
                transform: `translate3d(0px, 0px, 0) rotate(${petal.angle}deg) translateY(calc(var(--rose) * -0.05)) rotate(0deg) scale(1)`,
              } as CSSProperties
            }
          />
        ))}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={roseRef}
          src={ART.rose}
          alt=""
          draggable={false}
          className={styles.bloomRose}
        />

        {/* The ivory plate the rose becomes, with the couple's initials engraved in rose gold. */}
        <div ref={plateRef} className={styles.plate}>
          <Monogram pair={pair} title={title} namesFont={namesFont} headingFont={headingFont} />
        </div>
      </div>

      {/* Under the rose, where a thumb already is. */}
      <p
        className={`${styles.coverPrompt} ${opening ? "" : styles.coverPromptIdle}`}
        style={{
          ...promptFont,
          opacity: opening ? 0 : undefined,
          transition: opening ? "opacity 220ms ease-out" : undefined,
        }}
      >
        {prompt}
      </p>
    </div>
  );
}

/**
 * The couple's initials, as the plate carries them: the first, a small "&",
 * the second, in the card's script. One name, or a title, gives up to two
 * letters together; nobody named yet gives a small flower drawn in code.
 */
function Monogram({
  pair,
  title,
  namesFont,
  headingFont,
}: {
  pair?: readonly [string, string];
  title?: string;
  namesFont: CSSProperties;
  headingFont: CSSProperties;
}): ReactElement {
  if (pair !== undefined) {
    return (
      <span className={styles.monogram} style={namesFont}>
        <span>{initialOf(pair[0])}</span>
        <span className={styles.monogramAnd} style={headingFont}>
          &amp;
        </span>
        <span>{initialOf(pair[1])}</span>
      </span>
    );
  }

  const letters = initialsOf(title);

  return letters.length > 0 ? (
    <span className={styles.monogram} style={namesFont}>
      {letters}
    </span>
  ) : (
    <GoldFlower hi="#d39aa2" body="#b76e79" lo="#8e4b57" className="w-[46%]" />
  );
}
