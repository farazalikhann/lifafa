"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { RevealGateContext } from "@/hooks/useRevealGate";
import { getCoverAnimation } from "@/lib/coverAnimations";
import type { CoverAnimationOption } from "@/types/coverAnimation";

/** Set when a guest has asked, at the OS level, not to be shown effects. */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Where the cover is in its one journey.
 *
 * "closed" is what a guest lands on, "opening" is the animation playing, and
 * "open" is the card. It only ever runs forwards: there is no way back to a
 * sealed envelope once it has been torn.
 */
export type CoverPhase = "closed" | "opening" | "open";

/** What the cover layer hands its visual, so the visual owns no state of its own. */
export interface CoverVisualState {
  phase: CoverPhase;
  option: CoverAnimationOption;
  /** True when the guest has asked for no motion; the visual should draw a still frame. */
  reducedMotion: boolean;
  /**
   * The same title the cover prints, passed on so a visual can letter it into
   * the drawing — initials on a wax seal, a monogram on a curtain. Undefined
   * when the host has not named anyone, and a visual must still draw without it.
   */
  title?: string;
}

/**
 * The closed cover a guest taps before the invitation itself.
 *
 * Structure and state only at this point. Every animation id behaves the same
 * way here — a cream panel that goes away when tapped — because the phases and
 * the timing are what the visuals will hang off, and those are worth settling
 * before anything moves.
 *
 * The visual arrives through `renderVisual` rather than being chosen in here.
 * A render prop keeps this component free of any one animation's markup, hands
 * the visual a typed snapshot instead of a scattering of stringly attributes,
 * and leaves nothing behind in the DOM when no visual is passed. The layer also
 * carries `data-phase` and `data-animation`, so a visual that would rather be
 * driven by CSS alone can key off an ancestor selector and skip the prop.
 */
export default function CoverShell({
  animationId,
  title,
  renderVisual,
  children,
}: {
  /** The raw value off the saved card. Unknown, null and undefined all mean "no cover". */
  animationId: string | null | undefined;
  /** The couple, or whatever names the event, shown on the closed cover. */
  title?: string;
  renderVisual?: (state: CoverVisualState) => ReactNode;
  children: ReactNode;
}): ReactElement {
  const option = getCoverAnimation(animationId);
  const hasCover = option.id !== "none";

  /*
    Seeded rather than corrected in an effect. A card saved with no animation
    has no cover at any point in its life, and starting it "closed" would flash
    a panel over the invitation for one frame before an effect took it away.
  */
  const [phase, setPhase] = useState<CoverPhase>(hasCover ? "closed" : "open");

  /*
    Read through the shared hook, which serves `false` on the server and during
    hydration and only then swaps in the real match. Nothing here touches
    `window` in a render that hydration compares, so there is no mismatch.
  */
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);

  /*
    Reduced motion means no cover at all, not a still one.

    A guest who has asked their device for less movement has asked to be taken
    to the content. An envelope that no longer animates but still has to be
    tapped through is not a gentler flourish, it is a stile: the motion is gone
    and only the obstacle is left. So the whole layer is skipped and the card is
    what they land on.

    Declared here, above the effects, because the scroll lock is keyed to it.

    A consequence worth knowing: `reducedMotion` is therefore always false by
    the time a visual is rendered, and the reduced-motion branches inside the
    four cover visuals are unreachable while this holds. They are left in place
    because they are what those files would need the day this policy is revisited.
  */
  const covered = phase !== "open" && !reducedMotion;

  /** The pending hand-off from "opening" to "open", so a skip can cancel it. */
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleOpen = useCallback((): void => {
    /*
      The whole double tap guard. A second tap during "opening" would queue a
      second timeout, and an impatient guest could stack several; the phase
      itself is the lock, so there is no separate flag to keep in step.
    */
    setPhase((current) => {
      if (current !== "closed") {
        return current;
      }

      if (reducedMotion || option.durationMs <= 0) {
        return "open";
      }

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        setPhase("open");
      }, option.durationMs);

      return "opening";
    });
  }, [option.durationMs, reducedMotion]);

  const handleSkip = useCallback((): void => {
    clearTimer();
    setPhase("open");
  }, [clearTimer]);

  /** A timer outliving the component would call setState on a dead tree. */
  useEffect(() => clearTimer, [clearTimer]);

  /*
    The cover is a full viewport layer, so the page behind it must not scroll:
    on a phone a stray drag scrolls an invitation the guest cannot see yet. The
    previous value is put back rather than cleared, so this never overwrites a
    lock some other component set.
  */
  useEffect(() => {
    if (!covered) {
      return;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [covered]);

  const visual = renderVisual?.({ phase, option, reducedMotion, title });

  return (
    <>
      {/*
        The card stays mounted underneath the whole time, rather than waiting
        for "open". A reveal has to have something to reveal: curtains that
        part onto an empty page, then pop a card in afterwards, are not a
        reveal. `inert` is what makes that safe — while the cover is up the
        card takes no focus, no clicks and no screen reader cursor, so the only
        thing a guest can reach is the way in. `display: contents` keeps the
        wrapper out of the layout, so the card sits exactly where it would
        without a cover around it.

        A boolean `inert`, which is what React 19 wants: it is handled with the
        other boolean DOM attributes, and the empty string React 18 needed would
        now log a warning and be read as false.

        The gate beside it is what stops the card's scroll reveals from arming
        while it is down here out of sight. See hooks/useRevealGate.ts.
      */}
      <RevealGateContext value={!covered}>
        <div className="contents" inert={covered}>
          {children}
        </div>
      </RevealGateContext>

      {/*
        Unmounted at "open", not hidden. A cover left in the tree keeps its
        button in the tab order and its title in the accessibility tree, both
        sitting in front of an invitation the guest has already opened.
      */}
      {covered ? (
        <div
          data-phase={phase}
          data-animation={option.id}
          className="fixed inset-0 z-50 flex min-h-dvh w-full flex-col items-center justify-center bg-[var(--lifafa-cream)]"
        >
          {visual}

          <button
            type="button"
            onClick={handleOpen}
            disabled={phase !== "closed"}
            aria-label={
              title ? `${option.openPromptText}: ${title}` : option.openPromptText
            }
            /*
              A visual owns the middle of the screen, so the words move out from
              under it and sit low. With no visual there is nothing to clear and
              they take the centre, which is where a plain cover wants them.
            */
            className={`relative flex h-full w-full flex-1 cursor-pointer flex-col items-center gap-4 px-6 text-center focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[var(--lifafa-ink)] disabled:cursor-default ${
              visual === null || visual === undefined
                ? "justify-center"
                : "justify-end pb-[12vh]"
            }`}
          >
            {title ? (
              <span className="text-2xl text-[var(--lifafa-ink)] sm:text-3xl">
                {title}
              </span>
            ) : null}
            <span className="text-sm tracking-wide text-[var(--lifafa-muted)]">
              {option.openPromptText}
            </span>
          </button>

          {/*
            Present from the first frame, not revealed once the animation
            starts.

            It reads as a second way in, and that is exactly what it is for. The
            guest it exists for is the one who has opened this card already —
            checking the venue, showing somebody the date — and asking them to
            tap an envelope and then sit through it again every time is how a
            flourish turns into a toll. Offering it only mid-animation helps
            nobody: by then they have already paid.
          */}
          {covered ? (
            <button
              type="button"
              onClick={handleSkip}
              className="absolute bottom-6 right-6 rounded-full px-3 py-1.5 text-xs text-[var(--lifafa-muted)] underline underline-offset-4 hover:text-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-ink)]"
            >
              Skip
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
