import type { ReactElement } from "react";
import Image from "next/image";
import DemoPhone, { Tap } from "@/components/landing/demos/DemoPhone";
import styles from "./CoverDemo.module.css";

/**
 * A guest taps the seal and the envelope gives up the card.
 *
 * The envelope seal cover — the one every new card starts with, see
 * DEFAULT_COVER_ANIMATION in lib/coverAnimations.ts — drawn on the same
 * 400 × 300 grid as components/invite/covers/EnvelopeSealCover.tsx, in the
 * paper tones lib/coverPalette.ts works out for the Rose theme. The same
 * stages in the same order: the seal pops, the flap swings over towards the
 * guest, the letter rises, the envelope falls away, and the card is there.
 *
 * THE CARD IS A REAL ONE: the dua page from the showcase, a screenshot of a
 * card made in the editor, so what the envelope opens onto is an invitation
 * rather than a drawing of one. Its cream ground is close to the Rose theme's,
 * which is why the paper above still reads as the same card's envelope.
 *
 * The real cover changes which side of the letter the flap is on by stepping
 * its z-index the instant it is edge on. That is not transform or opacity, so
 * here there are two flaps, one in front of the letter and one behind it, and
 * the hand-off between them is an opacity switch on the frame where the flap
 * is a line and neither can be seen.
 */

/*
  The Rose theme's card, and the cover's paper worked out from it. The ground
  is also the screen's colour, set as --screen in the stylesheet.
*/
const GROUND = "#f7f1e8";
const TEXT = "#2b1d1f";
const ACCENT = "#b23e56";
/* What reads on the accent: the card's own ground. */
const ON_ACCENT = GROUND;
const PAPER_LIFT = "#ebe4dc";
const PAPER_DEEP = "#cec7c0";
const EDGE = "#b2a9a4";
/* PAPER moved three quarters of the way to PAPER_LIFT, as the cover does. */
const SIDE_PANEL = "#e8e1d9";
/* The accent mixed 28% towards ON_ACCENT. */
const SEAL_RIM = "#c5707f";

/** The flap's triangle, drawn point down; the back flap is the same shape turned over. */
function FlapShape({ fill }: { fill: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 320 108"
      preserveAspectRatio="none"
      overflow="visible"
      className={styles.fill}
    >
      <path
        d="M0 0 L320 0 L160 108 Z"
        fill={fill}
        stroke={EDGE}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CoverDemo(): ReactElement {
  return (
    <DemoPhone className={styles.stage}>
      {/*
        The card, underneath everything, waiting to be uncovered: Bismillah,
        Assalamu Alaikum and the dua. No alt text, because the whole demo is
        hidden from assistive technology and the caption beside it carries the
        meaning. Sized for the phone's screen, which is at most 176px wide.
      */}
      <div className={styles.card}>
        <Image
          src="/showcase/card-1.jpg"
          alt=""
          fill
          sizes="(min-width: 64rem) 176px, 136px"
          className={styles.photo}
        />
      </div>

      {/* What the cover prints under the envelope. */}
      <div className={styles.words}>
        <p className={styles.title}>Aarav &amp; Meera</p>
        <p className={styles.prompt}>Tap seal to open</p>
      </div>

      <div className={styles.envelope}>
        <span className={styles.shadow} />

        {/* The inside of the envelope, only ever seen once the flap is up. */}
        <div className={`${styles.layer} ${styles.back}`}>
          <svg viewBox="0 0 400 300" className={styles.fill}>
            <rect
              x={40}
              y={70}
              width={320}
              height={180}
              rx={10}
              fill={PAPER_DEEP}
              stroke={EDGE}
              strokeWidth={1.5}
            />
          </svg>
        </div>

        {/* The flap once it is over: behind the letter, inside face out. */}
        <div className={`${styles.layer} ${styles.backFlapLayer}`}>
          <div className={`${styles.flap} ${styles.flapBack}`}>
            <FlapShape fill={PAPER_LIFT} />
          </div>
        </div>

        {/* The letter: the card itself, in the card's own colours. */}
        <div className={styles.letter}>
          <div className={styles.letterRise}>
            <svg viewBox="0 0 276 160" className={styles.fill}>
              <rect
                x={0}
                y={0}
                width={276}
                height={160}
                rx={4}
                fill={GROUND}
                stroke={EDGE}
                strokeWidth={1.2}
              />
              <rect
                x={10}
                y={10}
                width={256}
                height={140}
                rx={2}
                fill="none"
                stroke={ACCENT}
                strokeWidth={1}
                opacity={0.7}
              />
              <text
                x={138}
                y={52}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={22}
                letterSpacing={2}
                fill={TEXT}
                opacity={0.8}
                className={styles.monogram}
              >
                AM
              </text>
              <g opacity={0.8}>
                <path d="M96 84 H128 M148 84 H180" stroke={ACCENT} strokeWidth={1} />
                <path d="M138 78 L144 84 L138 90 L132 84 Z" fill={ACCENT} />
              </g>
            </svg>
          </div>
        </div>

        {/* The side panels and the pocket, in front of the letter. */}
        <div className={`${styles.layer} ${styles.pocket}`}>
          <svg viewBox="0 0 400 300" className={styles.fill}>
            <path
              d="M40 70 L200 178 L40 250 Z"
              fill={SIDE_PANEL}
              stroke={EDGE}
              strokeWidth={1}
              strokeLinejoin="round"
              strokeOpacity={0.6}
            />
            <path
              d="M360 70 L200 178 L360 250 Z"
              fill={SIDE_PANEL}
              stroke={EDGE}
              strokeWidth={1}
              strokeLinejoin="round"
              strokeOpacity={0.6}
            />
            <path
              d="M40 250 L200 142 L360 250 Z"
              fill={PAPER_LIFT}
              stroke={EDGE}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            <rect
              x={40}
              y={70}
              width={320}
              height={180}
              rx={10}
              fill="none"
              stroke={EDGE}
              strokeWidth={1.5}
            />
          </svg>
        </div>

        {/* The flap while it is shut, and on its way up to edge on. */}
        <div className={`${styles.flap} ${styles.flapFront}`}>
          <FlapShape fill={PAPER_DEEP} />
        </div>

        {/* The wax seal, on the flap's point. */}
        <div className={styles.seal}>
          <div className={styles.sealBreath}>
            <svg viewBox="0 0 60 60" className={styles.fill}>
              <circle
                cx={30}
                cy={30}
                r={27}
                fill={ACCENT}
                stroke={SEAL_RIM}
                strokeWidth={2}
              />
              <circle
                cx={30}
                cy={30}
                r={21}
                fill="none"
                stroke={ON_ACCENT}
                strokeWidth={1}
                opacity={0.55}
              />
              <text
                x={30}
                y={30}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={18}
                letterSpacing={1}
                fill={ON_ACCENT}
                opacity={0.75}
                className={styles.monogram}
              >
                AM
              </text>
            </svg>
          </div>
        </div>

        <Tap className={styles.tapSeal} />
      </div>
    </DemoPhone>
  );
}
