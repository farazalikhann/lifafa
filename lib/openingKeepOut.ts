/**
 * Where the words of a card's opening screen are, for the layers that fly
 * and fall over it: "You are invited", the calligraphy, the sacred line and
 * the line saying where it is from. Nothing floating is to be seen over them.
 *
 * HOW A PIECE IS KEPT OFF THEM. It fades to nothing while it is over their
 * box, and back when it is clear: opacity alone, 200ms (`lifafa-veil` in
 * globals.css). Not a change of path. A butterfly's flight is planned seconds
 * ahead and handed to the compositor, and a leaf's or a petal's is a keyframe
 * loop; a fade asks nothing of either.
 *
 * WHAT IS MEASURED, AND WHEN. The words' box is read from the layout once
 * the layer mounts and again when the card or the opening changes size: the
 * ink of each line of text, and the calligraphy's own box, joined into one
 * and kept in the card's own px. Never on a scroll and never in a frame.
 *
 * The pieces live on a band pinned to the screen, and the words scroll with
 * the card under it. So where the box is on the band is arithmetic: the
 * card's box less how far the band has been carried down the card, which is
 * the scroll offset, taken from the scroller as its scroll event arrives and
 * from nothing else. One pass over the pieces per frame of scrolling at most.
 */

/** Left, top, right, bottom, in the band's own px. */
export type KeepOutBox = readonly [number, number, number, number];

/** Marks the opening's block of words; set by CardCanvas. */
export const OPENING_TEXT_ATTRIBUTE = "data-opening-text";

/** A little air round the words' own ink, in px, inside which nothing floating is drawn either. */
const KEEP_OUT_MARGIN = 4;

/**
 * How often the pieces a keyframe loop moves are looked at, in ms, and how
 * long the fade is: a piece is taken off the words that far ahead of itself.
 */
const LOOP_CHECK_MS = 250;
const VEIL_MS = 200;

export interface KeepOutWatch {
  /** The words' box on the band as it stands, margin and all, or null while they are off it. */
  box: () => KeepOutBox | null;
  /** The band's width and height, as last laid out. */
  width: () => number;
  height: () => number;
  stop: () => void;
}

function scrollerOf(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node !== null; node = node.parentElement) {
    const overflow = getComputedStyle(node).overflowY;

    if ((overflow === "auto" || overflow === "scroll") && node !== document.documentElement) {
      return node;
    }
  }

  return null;
}

/**
 * Watches the opening's words for a pinned band. `onMove` is called when
 * their box may have moved on the band: on a resize, and once a frame while
 * the card scrolls. Not for the first measure, which is done by the time this
 * returns: the caller has the watch then, and makes its first pass itself.
 */
export function watchOpeningText(band: HTMLElement, onMove: () => void): KeepOutWatch {
  /* The band is in a layer, and the layer in the card. */
  const card = band.parentElement?.parentElement ?? null;
  let words: KeepOutBox | null = null;
  let bandWidth = 0;
  let bandHeight = 0;
  let cardHeight = 0;
  /* How far down the scroller's content the card starts. */
  let cardStart = 0;
  let scroller: HTMLElement | null = null;
  let scrolled = 0;
  let frame = 0;
  let live = true;
  let started = false;

  const readScroll = (): void => {
    scrolled = scroller === null ? window.scrollY : scroller.scrollTop;
  };

  const measure = (): void => {
    if (!live || card === null) {
      return;
    }

    bandWidth = band.offsetWidth;
    bandHeight = band.offsetHeight;
    cardHeight = card.offsetHeight;
    words = null;

    const block = card.querySelector<HTMLElement>(`[${OPENING_TEXT_ATTRIBUTE}]`);
    const cardBox = card.getBoundingClientRect();
    /* A card drawn scaled in a frame: its rectangles are scaled and its own px are not. */
    const scale = card.offsetWidth > 0 ? cardBox.width / card.offsetWidth || 1 : 1;

    scroller = scrollerOf(card);
    readScroll();
    cardStart =
      (cardBox.top - (scroller === null ? 0 : scroller.getBoundingClientRect().top)) / scale +
      scrolled;

    if (block !== null) {
      const range = document.createRange();
      let left = Infinity;
      let top = Infinity;
      let right = -Infinity;
      let bottom = -Infinity;

      for (const child of Array.from(block.children)) {
        /* The painting's room is not words; what flies is meant to be seen over it. */
        if (child.classList.contains("lifafa-scene-slot")) {
          continue;
        }

        /*
          The ink of each run of text, which is narrower than the line it is
          centred in; the calligraphy has no text, and is its own box.
        */
        const boxes: DOMRect[] = [];
        const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);

        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          if ((node.textContent ?? "").trim().length > 0) {
            range.selectNodeContents(node);
            boxes.push(range.getBoundingClientRect());
          }
        }

        if (boxes.length === 0) {
          boxes.push(child.getBoundingClientRect());
        }

        for (const box of boxes) {
          if (box.width < 1 || box.height < 1) {
            continue;
          }

          left = Math.min(left, box.left);
          top = Math.min(top, box.top);
          right = Math.max(right, box.right);
          bottom = Math.max(bottom, box.bottom);
        }
      }

      if (right > left && bottom > top) {
        words = [
          (left - cardBox.left) / scale - KEEP_OUT_MARGIN,
          (top - cardBox.top) / scale - KEEP_OUT_MARGIN,
          (right - cardBox.left) / scale + KEEP_OUT_MARGIN,
          (bottom - cardBox.top) / scale + KEEP_OUT_MARGIN,
        ];
      }
    }

    if (started) {
      onMove();
    }
  };

  /* One pass a frame, however many scroll events the frame brings. */
  const onScroll = (): void => {
    readScroll();

    if (words === null || frame !== 0) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = 0;

      if (live) {
        onMove();
      }
    });
  };

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
  const passiveCapture: AddEventListenerOptions = { passive: true, capture: true };

  if (card !== null) {
    observer?.observe(card);
    const block = card.querySelector<HTMLElement>(`[${OPENING_TEXT_ATTRIBUTE}]`);

    if (block !== null) {
      observer?.observe(block);
    }
  }

  observer?.observe(band);
  window.addEventListener("resize", measure, { passive: true });
  /* Capture, so a scroll inside the editor's preview frame is heard too. */
  window.addEventListener("scroll", onScroll, passiveCapture);
  void document.fonts?.ready.then(measure);
  measure();
  started = true;

  return {
    box: () => {
      if (words === null) {
        return null;
      }

      /* The band is pinned: it is carried down the card by the scroll, between the card's two ends. */
      const carried = Math.min(
        Math.max(scrolled - cardStart, 0),
        Math.max(cardHeight - bandHeight, 0),
      );
      const top = words[1] - carried;
      const bottom = words[3] - carried;

      return bottom <= 0 || top >= bandHeight ? null : [words[0], top, words[2], bottom];
    },
    width: () => bandWidth,
    height: () => bandHeight,
    stop: () => {
      live = false;
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll, passiveCapture);
      window.cancelAnimationFrame(frame);
    },
  };
}

/** Whether a box centred on (x, y), reaching `reachX` and `reachY` each way, touches the words. */
export function overWords(
  box: KeepOutBox | null,
  x: number,
  y: number,
  reachX: number,
  reachY: number,
): boolean {
  return (
    box !== null &&
    x + reachX > box[0] &&
    x - reachX < box[2] &&
    y + reachY > box[1] &&
    y - reachY < box[3]
  );
}

/**
 * Marks a piece the compositor moves by a keyframe loop, which no script
 * moves: where it starts on the band and how far it is ever drawn from there,
 * so where it can be is arithmetic. `top` null is a petal that falls the
 * height of the band (`lifafa-petal-fall` in globals.css): how far down it
 * has come is asked of its own animation, which answers without laying
 * anything out.
 */
export const LOOP_PIECE_ATTRIBUTE = "data-loop-piece";

export function loopPiece(
  /** Where it starts, as percentages of the band. */
  left: number,
  top: number | null,
  /** How far it is ever drawn from there, in px: to the left, up, to the right and down. */
  reach: readonly [number, number, number, number],
): string {
  return [left, top ?? "fall", ...reach].join("|");
}

/** The fall's two ends, as shares of the band's height; the keyframes' own. */
const FALL_FROM = -0.12;
const FALL_TO = 1.08;

/**
 * Fades each loop piece under `band` out while it is over the words, and
 * back when it is not.
 */
function veilLoopPieces(band: HTMLElement, watch: KeepOutWatch): void {
  const box = watch.box();
  const width = watch.width();
  const height = watch.height();

  for (const node of band.querySelectorAll<HTMLElement>(`[${LOOP_PIECE_ATTRIBUTE}]`)) {
    if (box === null) {
      node.style.opacity = "";
      continue;
    }

    const [left, top, toLeft, up, toRight, down] = (
      node.getAttribute(LOOP_PIECE_ATTRIBUTE) ?? ""
    ).split("|");
    const x = (Number(left) / 100) * width;
    let hidden = x + Number(toRight) > box[0] && x - Number(toLeft) < box[2];

    if (hidden && top === "fall") {
      const timing = node.getAnimations?.()[0]?.effect?.getComputedTiming();
      const progress = timing?.progress;

      /* Unknown is over the words: a petal not drawn is better than one on a name. */
      if (typeof progress === "number" && typeof timing?.duration === "number") {
        const y = (FALL_FROM + (FALL_TO - FALL_FROM) * progress) * height;
        /* How far it falls before the next look and the fade after it. */
        const ahead =
          (((FALL_TO - FALL_FROM) * height) / timing.duration) * (LOOP_CHECK_MS + VEIL_MS);

        hidden = y + Number(down) + ahead > box[1] && y - Number(up) < box[3];
      }
    } else if (hidden) {
      const y = (Number(top) / 100) * height;

      hidden = y + Number(down) > box[1] && y - Number(up) < box[3];
    }

    node.style.opacity = hidden ? "0" : "";
  }
}

/**
 * Keeps the loop pieces under `band` off the opening's words for as long as
 * the returned function is not called: looked at when the words move on the
 * band, and four times a second for the petals, which fall past them.
 * Nothing while the tab is hidden.
 */
export function keepLoopPiecesOffWords(band: HTMLElement): () => void {
  const pass = (): void => {
    if (document.visibilityState === "visible") {
      veilLoopPieces(band, watch);
    }
  };
  const watch = watchOpeningText(band, pass);
  const timer = window.setInterval(pass, LOOP_CHECK_MS);

  pass();

  return () => {
    window.clearInterval(timer);
    watch.stop();

    for (const node of band.querySelectorAll<HTMLElement>(`[${LOOP_PIECE_ATTRIBUTE}]`)) {
      node.style.opacity = "";
    }
  };
}
