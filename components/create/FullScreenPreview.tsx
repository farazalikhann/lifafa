"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import CardCanvas from "@/components/card/CardCanvas";
import Watermark from "@/components/card/Watermark";
import CoverShell from "@/components/invite/CoverShell";
import CoverVisual from "@/components/invite/covers/CoverVisual";
import { useRevealGate } from "@/hooks/useRevealGate";
import { PREVIEW_INVITE } from "@/lib/calendar";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { getCoverAnimation } from "@/lib/coverAnimations";
import type { Motif } from "@/lib/motifs";
import { getPalette } from "@/lib/palettes";
import type { Theme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { EventDraft } from "@/types/event";

type DeviceId = "phone" | "desktop";

interface Device {
  id: DeviceId;
  label: string;
  /** Card width in CSS pixels, capped by the screen on anything narrower. */
  width: number;
}

const DEVICES: readonly Device[] = [
  { id: "phone", label: "Phone", width: 390 },
  { id: "desktop", label: "Desktop", width: 480 },
];

/**
 * Everything that can hold focus inside the overlay.
 *
 * Queried live on each Tab rather than captured on open, because the device
 * toggle re-renders and the card's own content can change under it — a stale
 * list would trap focus on a node that is no longer in the document.
 *
 * Anything under an `inert` ancestor is dropped, which matters from the moment
 * a cover can be up: the card and the device toggles are still laid out behind
 * it and still match the selector, but the browser will not focus them, so
 * leaving them in the list would let the trap wrap onto a node that quietly
 * refuses focus and leave Tab doing nothing at all.
 */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function focusableWithin(root: HTMLElement): readonly HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      element.offsetParent !== null && element.closest("[inert]") === null,
  );
}

/**
 * Whether this browser will put an element into fullscreen at all.
 *
 * Three separate things have to be true and none of them implies the others.
 * `requestFullscreen` is simply absent on iPhone Safari, which offers it on
 * <video> and nothing else. `document.fullscreenEnabled` is the permission
 * answer rather than the support answer — it is false inside an iframe that was
 * not given `allowfullscreen`, where the method exists and always rejects. And
 * `exitFullscreen` is checked separately at the other end so the cleanup path
 * cannot throw on a browser that let us in and then took the method away.
 *
 * Everything here degrades to the same place: the overlay stays exactly what it
 * was before any of this, a `fixed inset-0` panel over the page. The address
 * bar stays visible, and because nothing in the card is measured in `vh` the
 * layout is identical either way — the card's own bands are `dvh`, which is the
 * viewport as it actually is, and its sections are `svh`, which is the viewport
 * at its smallest. Neither can overflow behind browser chrome.
 */
function canRequestFullscreen(
  element: HTMLElement | null,
): element is HTMLElement {
  return (
    element !== null &&
    typeof element.requestFullscreen === "function" &&
    document.fullscreenEnabled === true
  );
}

function devicePillClass(isSelected: boolean): string {
  return [
    "min-h-11 rounded-full border px-4 text-[0.8125rem] font-medium transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]",
    isSelected
      ? "border-transparent bg-[var(--lifafa-ink-raised)] text-[var(--lifafa-cream)] ring-2 ring-[var(--lifafa-marigold)]"
      : "border-[var(--lifafa-hairline)] text-[var(--lifafa-muted)] hover:text-[var(--lifafa-cream)]",
  ].join(" ");
}

/**
 * The cover's reveal gate, reported back out of the cover.
 *
 * CoverShell keeps its phase to itself and offers no callback, but it does
 * publish the gate to everything it wraps: false while the cover is still up,
 * true the moment it has opened. Reading that from a child which draws nothing
 * is how the preview learns the cover has finished, without CoverShell needing
 * to know a preview exists.
 *
 * Reports the key of the cover instance rather than a bare `true`, so that a
 * remounted cover cannot be mistaken for one that has already opened: the
 * parent compares the key it was handed against the key it is rendering now,
 * and the two differ from the very first render after a replay.
 */
function CoverReveal({
  coverKey,
  onRevealed,
}: {
  coverKey: string;
  onRevealed: (key: string) => void;
}): null {
  const isRevealed = useRevealGate();

  useEffect(() => {
    if (isRevealed) {
      onRevealed(coverKey);
    }
  }, [isRevealed, coverKey, onRevealed]);

  return null;
}

/**
 * The invitation with nothing of the editor around it.
 *
 * The phone frame on /create is an honest preview of the proportions but not of
 * the experience: it is 380px of a 1440px screen, with a form beside it. This
 * gives the host the other half of the answer — the card alone, at the width a
 * guest's device will give it, scrolled the way a guest will scroll it.
 *
 * Watermarked, because the point of showing the finished thing is to sell it.
 * The mark is drawn over the card rather than into it, so nothing about the
 * invitation itself changes when payment removes it.
 *
 * Rendered into `document.body` through a portal, not in place. Its trigger
 * lives inside the editor's `lg:sticky` preview column, and a sticky box opens
 * a stacking context even with no z-index of its own — so an overlay rendered
 * there would have its z-50 sealed inside a layer sitting below the page's own
 * sticky header, and "above everything" would quietly stop being true at `lg`.
 * The portal only ever runs on the client: nothing mounts this until a click.
 */
export default function FullScreenPreview({
  draft,
  theme,
  config,
  motifs,
  coverAnimation,
  triggerRef,
  onClose,
}: {
  draft: EventDraft;
  theme: Theme;
  config: CardConfig;
  motifs: readonly Motif[];
  /**
   * The cover the host has selected *right now*, straight from the editor's
   * own state rather than from a saved row: nothing here has been written to
   * the database yet, and a preview that waited for a save would be answering
   * a question the host has already moved on from.
   */
  coverAnimation: CoverAnimationId;
  /** Focus returns here on close, so the host lands where they left. */
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}): ReactElement {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [deviceId, setDeviceId] = useState<DeviceId>("phone");
  /*
    Tracked rather than assumed. Nothing reads it for layout — the overlay is
    `fixed inset-0` and looks the same either way — but the close button's label
    does, so a host who has already left fullscreen by a system gesture is not
    offered a control that would do nothing.
  */
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  /*
    Bumped by Replay, and half of the cover's key. Remounting the shell is the
    only way back to a closed cover: it runs its phases forwards once and has
    no reset, and giving it one would put a control that exists for the host
    inside the component a guest uses.
  */
  const [replayCount, setReplayCount] = useState<number>(0);
  /*
    The key of the cover instance that has finished opening, or null. Held as a
    key rather than as a boolean so that a change of key reads as "not opened
    yet" in the very render that changes it, with no frame where Replay lingers
    over a cover that has already gone back to its resting state.
  */
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const titleId = useId();

  const device = DEVICES.find((entry) => entry.id === deviceId) ?? DEVICES[0];
  const palette = getPalette(config.style.paletteId);

  const coverOption = getCoverAnimation(coverAnimation);
  const hasCover = coverOption.id !== "none";
  /*
    The selection and the counter together. Replay bumps the counter; the id is
    in the key so that picking a different animation while the preview is open
    also resets the cover to its resting state and plays the new choice.
  */
  const coverKey = `${coverOption.id}:${replayCount}`;
  const isRevealed = revealedKey === coverKey;
  const isCovered = hasCover && !isRevealed;

  /* The same line the guest's cover prints. See InviteExperience. */
  const names = resolveCoverNames(draft, config.occasionId);
  const coverTitle =
    names.kind === "line" && names.isPlaceholder
      ? undefined
      : coverNameLine(names);

  /*
    onClose comes from the parent and is not guaranteed to be stable, so the
    key handler reads it through a ref instead of closing over it. Otherwise
    the document listener would be torn down and rebuilt on every render of
    the editor — once per keystroke in the form behind this overlay.
  */
  const onCloseRef = useRef<() => void>(onClose);
  onCloseRef.current = onClose;

  const handleClose = useCallback((): void => {
    onCloseRef.current();
  }, []);

  const handleReplay = useCallback((): void => {
    setReplayCount((count) => count + 1);

    /*
      This control unmounts on its own click — the cover is closed again, so
      there is nothing left to replay — and focus would be dropped on <body>
      for the trap to catch on the next Tab. Handed somewhere real instead.
    */
    closeButtonRef.current?.focus();
  }, []);

  /*
    Scroll lock — on the document element, where it used to be on <body>.

    CoverShell locks `body.style.overflow` for exactly as long as its cover is
    up, saving and restoring the previous value the same way this did, and the
    two cannot share one property. Nested on <body> they clobber each other in
    both directions. A child's effects run before its parent's, so this one
    would capture the *cover's* "hidden" as the value to put back, and closing
    the preview after the cover had opened would leave /create frozen with
    nothing on screen to unfreeze it. The other way round, the cover's own
    restore when it opens would drop this lock halfway through the preview's
    life and let the editor scroll about behind the overlay.

    The viewport takes its overflow from <html> unless <html> is `visible`, so
    locking here is exactly as effective and touches nothing the cover owns.
    Order between the two stops mattering: each puts back the property it saved.

    The cleanup restores whatever the page had before, and it runs on unmount
    as well as on close — so an overlay torn down while still open (a route
    change, an error boundary) cannot leave the page behind it frozen.
  */
  useEffect(() => {
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    return () => {
      root.style.overflow = previousOverflow;
    };
  }, []);

  /*
    Native fullscreen, so the address bar goes away on Android Chrome.

    THE HOST ONLY. This runs in the editor's preview and nowhere near the guest
    invite page: a guest who opened a link never asked to lose their browser
    chrome, and taking it would be hostile. The host asked for "full screen" by
    name, which is the difference.

    The request can fail and that is a normal outcome, not an error. It needs a
    recent user gesture and this effect runs a frame after the click that
    mounted the overlay, so a strict browser can decline; some decline for
    reasons of their own. Every path is caught and the overlay simply carries on
    windowed — there is no fallback UI to show, because the windowed overlay
    already is the fallback.

    `fullscreenchange` is what keeps the flag honest. A guest leaving fullscreen
    with Escape, a swipe, or the system back gesture never tells this component
    anything; without the listener the flag would still say fullscreen and the
    exit on close would be a no-op against a browser that had already left.

    The cleanup exits, and it runs on unmount as well as on close, so an overlay
    torn down some other way — a route change, an error boundary — cannot leave
    the browser stuck in fullscreen with nothing on screen to get out of it.
  */
  useEffect(() => {
    const overlay = overlayRef.current;
    let active = true;

    if (canRequestFullscreen(overlay)) {
      /*
        Promise rejection is the documented way this says no, so it is handled
        rather than left to become an unhandled rejection in the console.
      */
      overlay.requestFullscreen().then(
        () => {
          if (active) {
            setIsFullscreen(true);
          }
        },
        () => {
          /* Declined — windowed is a perfectly good preview. */
        },
      );
    }

    const syncFullscreen = (): void => {
      setIsFullscreen(document.fullscreenElement !== null);
    };

    document.addEventListener("fullscreenchange", syncFullscreen);

    return () => {
      active = false;
      document.removeEventListener("fullscreenchange", syncFullscreen);

      /*
        Only ours. If something else on the page is the fullscreen element,
        exiting would be closing a door this component never opened.
      */
      if (
        document.fullscreenElement !== null &&
        document.fullscreenElement === overlay &&
        typeof document.exitFullscreen === "function"
      ) {
        document.exitFullscreen().catch(() => {
          /* Already on the way out, or refused. Nothing left to do. */
        });
      }
    };
  }, []);

  /*
    Focus in on open, and back to the trigger on the way out. The return is a
    cleanup rather than a line in the close handler, so it happens however the
    overlay goes away.
  */
  useEffect(() => {
    closeButtonRef.current?.focus();

    return () => {
      triggerRef.current?.focus();
    };
  }, [triggerRef]);

  /*
    Escape to close, and Tab kept inside.

    Listening on the document rather than on the overlay covers the case an
    overlay-scoped listener would miss: a tap on the card is a tap on something
    unfocusable, which leaves focus on <body> — outside the overlay, where no
    keydown of ours would ever fire again. When a key does arrive from outside,
    focus is pulled back in rather than allowed to walk the page behind.
  */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const overlay = overlayRef.current;

      if (overlay === null) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();

        /*
          In fullscreen the browser claims Escape for itself and leaves
          fullscreen without dispatching a key event here at all, so the first
          press is the browser's and this only ever sees the second. Exiting
          explicitly covers the browsers that do deliver the key: leave
          fullscreen first, then close, so the overlay never unmounts out from
          under a fullscreen element.
        */
        if (
          document.fullscreenElement !== null &&
          typeof document.exitFullscreen === "function"
        ) {
          document.exitFullscreen().catch(() => {
            /* Nothing to do — the close below happens either way. */
          });
        }

        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = focusableWithin(overlay);

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!(active instanceof HTMLElement) || !overlay.contains(active)) {
        event.preventDefault();
        first.focus();
        return;
      }

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--lifafa-ink)]"
    >
      <h2 id={titleId} className="sr-only">
        Full screen preview of your invitation
      </h2>

      {/*
        The device toggles, and only where they answer something. Below lg the
        screen already is the phone, so a Phone/Desktop pair there is a row of
        chrome asking a question nobody at that width has — and the vertical
        space it costs is space the card is not getting.
      */}
      {/*
        `inert` while the cover is up, because the cover is drawn over this bar
        and an element that is merely painted over is still in the tab order.
        The bar stays mounted rather than being dropped: rendering it back in
        when the cover opens would push the card down a bar's height at the
        exact moment the host is watching the reveal land.
      */}
      <header
        inert={isCovered}
        className="hidden shrink-0 items-center gap-3 border-b border-[var(--lifafa-hairline)] px-3 py-2 sm:px-5 lg:flex"
      >
        <div className="flex items-center gap-2">
          {DEVICES.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={option.id === deviceId}
              onClick={() => setDeviceId(option.id)}
              className={devicePillClass(option.id === deviceId)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      {/*
        Floated over the card rather than seated in a bar, which is what lets
        the card have the whole viewport below lg with no chrome above or below
        it. Kept after the header in the DOM so Tab still reaches the device
        pills first at lg, where the two are visible together.

        The translucent backdrop is not decoration: this sits over the card, and
        the card can be cream or near-black depending on the palette, so the
        button has to carry its own contrast rather than borrow the card's.

        The overlay is `fixed` with a z-index of its own, so it opens a stacking
        context and every z-index below is scoped inside it. 60 clears the
        watermark's layers (20 for the tiled pattern, 30 for the pill) as 40
        used to, and now clears the cover at 50 as well — a cover is a full
        viewport panel, and under it this button would be painted over with the
        Escape key left as the only way out of the preview.
      */}
      <button
        ref={closeButtonRef}
        type="button"
        aria-label={isFullscreen ? "Exit full screen preview" : "Close preview"}
        onClick={handleClose}
        className="absolute top-3 right-3 z-[60] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/70 text-[var(--lifafa-cream)] backdrop-blur transition-colors duration-150 hover:bg-[var(--lifafa-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      {/*
        Replay, and it is the editor's control and nowhere near a guest.

        A cover runs forwards once by design: a guest tears an envelope open and
        that is the end of it. A host is deciding whether they like the thing,
        and until now seeing it a second time meant closing the preview and
        opening it again. Remounting the shell under a new key is the whole
        mechanism — the cover comes back seeded at "closed", with no state of
        its own that had to be reset, and CoverShell is untouched.

        Only once the cover has opened. Before the tap there is nothing to
        replay, and while the animation is playing the shell already offers
        Skip. Never at all under "No animation", where there is no cover.

        Low emphasis on purpose: it sits beside the close button in the same
        floating row, in the editor's muted text rather than the card's colours.
      */}
      {hasCover && isRevealed ? (
        <button
          type="button"
          onClick={handleReplay}
          className="absolute top-3 right-16 z-40 flex h-11 shrink-0 items-center rounded-full border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)]/70 px-4 text-[0.8125rem] font-medium text-[var(--lifafa-muted)] backdrop-blur transition-colors duration-150 hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          Replay
        </button>
      ) : null}

      {/*
        The cover, wrapped exactly the way the guest's page wraps it — same
        shell, same visual, same title line — so that "exactly what your guests
        will see" covers how the card arrives and not only what it says.

        The id comes from the editor's live state and not from a saved row, so
        the host sees the choice they have just made without saving anything.
        The key is what makes it replayable and what resets it when they change
        their mind, and CoverReveal beside the card is what tells this component
        the cover has finished. See the notes on both, above.

        `display: contents` on the shell's own wrapper is why the scroller
        inside still behaves as a flex item of this column.
      */}
      <CoverShell
        key={coverKey}
        animationId={coverAnimation}
        title={coverTitle}
        renderVisual={(state) => <CoverVisual {...state} />}
      >
        {/*
          min-h-0 is what lets this shrink inside the column: without it the flex
          item takes its content height, the card runs off the bottom of the
          screen and the footer goes with it.
        */}
        <div className="lifafa-no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/*
            No bottom clearance for the watermark pill any more, and dropping it
            is what stops the border frame breaking at the end of the scroll.

            The clearance existed because a card used to be able to finish its last
            line right at its own foot, underneath the pill. That has not been true
            since sections became a full screen tall with symmetric padding: the
            last line now sits about 300px above the card's foot, and the pill —
            3.5rem off the bottom of the screen — lands in that padding with
            nothing behind it.

            What the clearance did do was end the card 112px above the bottom of
            the scroller, and the frame is pinned *inside* the card. So at the very
            bottom of the scroll the sticky band ran out of containing block, the
            bottom rail rode up, and the frame came apart with a band of bare
            background beneath it. Letting the card fill the scroller fixes the
            frame and removes 112px of dead space at the same time.
          */}
          <div
            className="relative mx-auto w-full"
            style={{
              maxWidth: `${device.width}px`,
              backgroundColor: palette.background,
            }}
          >
            {/*
              CardCanvas caps itself at 420px, the width of the editor's frame.
              Desktop is wider than that, so the cap is lifted and the width comes
              from this wrapper instead — which is also what keeps a 390px phone
              preview inside a 360px screen.
            */}
            <div className="[&>*]:max-w-none">
              <CardCanvas
                draft={draft}
                theme={theme}
                config={config}
                motifs={motifs}
                sizing="viewport"
                /* No code minted yet — the host sees the buttons, not a live link. */
                invite={PREVIEW_INVITE}
                /* "Exactly what your guests will see" has to include the doing. */
                audience="guest"
              />
            </div>

            <Watermark
              show
              accent={config.style.accentOverride ?? palette.accent}
              surface={palette.surface}
            />
          </div>
        </div>

        {/* Draws nothing. Reads the shell's gate and reports it out. */}
        <CoverReveal coverKey={coverKey} onRevealed={setRevealedKey} />
      </CoverShell>

      {/*
        Dropped below lg along with the header, for the same reason: the card is
        meant to have the screen to itself there. The line is not lost — it now
        sits under the trigger on the editor page, which is where the host reads
        it before they open this.
      */}
      <footer className="hidden shrink-0 border-t border-[var(--lifafa-hairline)] px-4 py-3 text-center text-xs text-[var(--lifafa-muted)] lg:block">
        This is exactly what your guests will see.
      </footer>
    </div>,
    document.body,
  );
}
