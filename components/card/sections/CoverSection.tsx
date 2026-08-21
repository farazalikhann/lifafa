"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CardFlourish } from "@/components/card/decor/DecorLayer";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  placeholderOpacity,
  resolve,
  resolveCoverNames,
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Observer settings for the scroll cue's sentinel.
 *
 * The sentinel sits at the very bottom of the cover, so a plain "is it on
 * screen" test would be true before the guest has scrolled at all — the cover
 * is only 60–100svh tall and its own foot is already in view. Insetting the
 * root's bottom edge by 70% narrows the trigger to the top third of the
 * screen, which the sentinel can only reach once the guest has genuinely
 * pulled the cover up and away.
 */
const CUE_SENTINEL_OPTIONS: IntersectionObserverInit = {
  threshold: 0,
  rootMargin: "0px 0px -70% 0px",
};

/**
 * One name, set in the card's display face at the cover's hero size.
 *
 * Pulled out because the pair layout draws it twice and the single-line layout
 * once, and the three have to be the same size to the pixel — a first name a
 * shade larger than a second one would read as a ranking.
 *
 * `break-words` is the whole defence against a long unbroken token — the canvas
 * clips its overflow, and at this size one 60 character word is nearly three
 * times the width of the card. Everything else wraps at spaces inside the
 * container's own width, so no max-width is needed.
 */
function HeroName({
  text,
  isPlaceholder,
}: {
  text: string;
  isPlaceholder: boolean;
}): ReactElement {
  return (
    <p
      className="text-[2.4375rem] leading-[1.05] font-semibold tracking-[-0.015em] wrap-anywhere text-balance sm:text-[2.75rem]"
      style={{
        opacity: placeholderOpacity(isPlaceholder, "primary"),
        fontFamily: "var(--card-heading)",
        fontWeight: "var(--card-heading-weight)" as unknown as number,
      }}
    >
      {text}
    </p>
  );
}

export default function CoverSection({
  draft,
  theme,
  minHeight,
  pad,
  occasionId,
}: {
  draft: EventDraft;
  theme: Theme;
  /**
   * Which occasion this is, and so whether the cover joins two names.
   *
   * A birthday has one person and a corporate invitation has none, so neither
   * sets a pair over three lines however the draft happens to be filled in.
   * Resolved through `resolveCoverNames` rather than branched on here, so the
   * card, the page title and the share image cannot disagree about it.
   */
  occasionId: OccasionId;
  minHeight: string;
  /**
   * Inset for the section's content, top and bottom, in px.
   *
   * Not decoration: the hanging ornaments are pinned to the top of the screen,
   * so whichever section is filling the screen has them over its own first
   * line. The canvas resolves this from `hangingDepth` and hands every section
   * the same number, so no section's content can begin inside the band.
   *
   * Applied to both edges so the content stays optically centred rather than
   * being pushed low, and inline rather than as a class because it is a
   * measurement the canvas computes, not a constant. Border-box sizing means it
   * never adds to `minHeight` — the section still fills its viewport exactly.
   */
  pad: number;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  /*
    The cue has done its job the moment the guest starts scrolling, so it is
    retired rather than left sitting on the card forever. useInView latches, so
    once the sentinel has been reached the cue stays gone for the rest of the
    visit — it does not blink back on when the guest scrolls up to re-read the
    cover.
  */
  const { ref: sentinelRef, isInView: hasScrolledPast } = useInView<HTMLDivElement>(
    CUE_SENTINEL_OPTIONS,
    /*
      false, unlike every reveal on the card. A reveal defaults to visible so
      that markup which never runs JavaScript is still readable; this observer
      answers "has the guest scrolled past the cover yet?", and defaulting that
      to yes would ship a server-rendered cue that was already retired before
      the guest had done anything at all.
    */
    false,
  );

  /*
    useInView reports "in view" outright under reduced motion — it never arms
    an observer there — which would retire the cue before the guest had seen
    it. Reduced motion means no fade, not no cue, so the cue simply stays.
  */
  const prefersReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const cueRetired = !prefersReducedMotion && hasScrolledPast;

  const names = resolveCoverNames(draft, occasionId);
  const title = resolve(draft.eventTitle, "Event title");

  /*
    Where the stagger picks up after the names. A pair spends three steps, a
    single line one, and everything below counts on from there — hard coding
    the title at step 1 would have it arrive on top of the second name.
  */
  const stepAfterNames = names.kind === "pair" ? 3 : 1;

  /*
    Reveal lives on the wrapper, placeholder dimming on the text inside it.
    Nested opacity multiplies, so a placeholder still starts fully hidden —
    putting both on one element would let the inline value win and the line
    would never fade in.
  */
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: pad,
        paddingBottom: pad,
        gap: `calc(1.5rem * var(--card-gap-scale, 1))`,
      }}
    >
      {names.kind === "pair" ? (
        /*
          Three lines, one unit. The gap here is deliberately far tighter than
          the section's own — the joining word belongs to the names, not to the
          run of cover lines, and at the section's spacing it would read as a
          third statement rather than as the hinge between two names.
        */
        <div className="flex flex-col items-center gap-1">
          <div className={reveal} style={lineDelay(0)}>
            <HeroName text={names.first} isPlaceholder={false} />
          </div>

          <div className={reveal} style={lineDelay(1)}>
            {/*
              Set at roughly 45% of the hero size and in the accent, so it
              carries the eye from one name to the other without competing
              with either. Lower cased in CSS rather than on the value, so a
              host who types "Weds" still gets the card's own voice back.
            */}
            <p
              className="text-[1.1rem] leading-none tracking-[0.22em] break-words lowercase sm:text-[1.2rem]"
              style={{ color: theme.accent }}
            >
              {names.joiner}
            </p>
          </div>

          <div className={reveal} style={lineDelay(2)}>
            <HeroName text={names.second} isPlaceholder={false} />
          </div>
        </div>
      ) : (
        <div className={reveal} style={lineDelay(0)}>
          <HeroName text={names.text} isPlaceholder={names.isPlaceholder} />
        </div>
      )}

      <div className={reveal} style={lineDelay(stepAfterNames)}>
        <p
          className="text-[0.84rem] tracking-[0.28em] break-words uppercase text-balance"
          style={{
            color: theme.textMuted,
            opacity: placeholderOpacity(title.isPlaceholder, "muted"),
          }}
        >
          {title.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(stepAfterNames + 1)}>
        <CardFlourish accent={theme.accent} />
      </div>

      {/*
        Scroll cue — this is the section that has to teach the gesture.

        Its visible state is the same `revealClass` the rest of the card uses,
        driven by one boolean rather than by stacking an `opacity-0` class on
        top of an `opacity-100` one: two utilities of equal specificity are
        settled by stylesheet order, not by the order they appear in the class
        attribute, so the override would be a coin toss. Retiring it therefore
        runs the reveal backwards — fades out and drifts down — which is the
        same motion vocabulary as everything else on the card.

        The stagger delay is dropped on the way out: 240ms of nothing happening
        after the guest has already started scrolling reads as a stuck cue.
      */}
      <div
        className={`mt-2 flex flex-col items-center gap-2 ${REVEAL_BASE} ${revealClass(
          isInView && !cueRetired,
        )}`}
        /* Transparent is not enough — a retired cue must also stop being read out. */
        aria-hidden={cueRetired}
        style={cueRetired ? undefined : lineDelay(stepAfterNames + 2)}
      >
        <span
          className="text-[0.765rem] tracking-[0.3em] uppercase"
          style={{ color: theme.textMuted }}
        >
          Scroll
        </span>
        <span
          aria-hidden="true"
          className="h-9 w-px animate-[lifafa-cue_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            backgroundImage: `linear-gradient(to bottom, ${theme.accent}, transparent)`,
          }}
        />
      </div>

      {/*
        Zero-height marker, not a scroll listener: the guest's position is read
        once by the observer when it crosses, rather than on every frame of
        every scroll. Positioned out of flow so it adds neither height nor a
        flex gap — the cover's spacing is identical with and without it.
      */}
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px"
      />
    </section>
  );
}
