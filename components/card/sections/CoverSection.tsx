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
  revealClass,
} from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

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

export default function CoverSection({
  draft,
  theme,
  minHeight,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
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

  const hosts = resolve(draft.hostNames, "Your names");
  const title = resolve(draft.eventTitle, "Event title");

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
      className="relative flex flex-col items-center justify-center px-7 py-16 text-center"
      style={{
        minHeight,
        gap: `calc(1.5rem * var(--card-gap-scale, 1))`,
      }}
    >
      <div className={reveal} style={lineDelay(0)}>
        {/*
          `break-words` is the whole defence against a long unbroken token —
          the canvas clips its overflow, and at this size one 60 character word
          is nearly three times the width of the card. Everything else wraps at
          spaces inside the container's own width, so no max-width is needed.
        */}
        <p
          className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.015em] break-words text-balance sm:text-[2.25rem]"
          style={{
            opacity: placeholderOpacity(hosts.isPlaceholder, "primary"),
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
        >
          {hosts.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(1)}>
        <p
          className="text-[0.6875rem] tracking-[0.28em] break-words uppercase text-balance"
          style={{
            color: theme.textMuted,
            opacity: placeholderOpacity(title.isPlaceholder, "muted"),
          }}
        >
          {title.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(2)}>
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
        className={`mt-6 flex flex-col items-center gap-2 ${REVEAL_BASE} ${revealClass(
          isInView && !cueRetired,
        )}`}
        /* Transparent is not enough — a retired cue must also stop being read out. */
        aria-hidden={cueRetired}
        style={cueRetired ? undefined : lineDelay(3)}
      >
        <span
          className="text-[0.625rem] tracking-[0.3em] uppercase"
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
