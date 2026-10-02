"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { scratchFrameArt } from "@/lib/cardDecor";
import { cardRem } from "@/lib/cardScale";
import type { ScratchFrame } from "@/types/card";

/**
 * A frame of roses with something set inside its opening.
 *
 * The frame the card's scratch panel is drawn in (FramedScratch), and on its
 * own the frame round the date and the countdown, which wear one whether or
 * not anything is hidden behind them.
 *
 * THE FRAME DECIDES THE SIZE, not what is in it. A frame is a picture with
 * one shape, so the stage is as large as the frame is drawn, and its content
 * is set inside the largest upright box the opening holds with air round it
 * (`words` in lib/cardDecor.ts) and brought down a size if it would not fit.
 * So nothing set in a frame can reach its flowers, whatever the date, the
 * language or the screen.
 *
 * Back to front: the content; whatever the caller lays over it (`between` —
 * the foil and the dust of a scratch panel); and the frame's picture on top.
 */
export default function FrameStage({
  frame,
  stageRef,
  settle = false,
  locked = false,
  between,
  children,
}: {
  frame: ScratchFrame;
  /** The stage itself, for a caller that draws over it. */
  stageRef?: Ref<HTMLDivElement>;
  /** Held a touch smaller, to come up to size when this goes false: a scratch panel's words as its foil goes. */
  settle?: boolean;
  /** The content cannot be selected: it is under something. */
  locked?: boolean;
  /** Drawn over the content and under the frame. */
  between?: ReactNode;
  children: ReactNode;
}): ReactElement {
  const art = scratchFrameArt(frame);
  const wordsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  /* How far the content is brought down to fit the opening. */
  const [fit, setFit] = useState<number>(1);

  /*
    Measured, because what is set in the frame is whatever the section hands
    over — a date, a venue and its address, a clock — and the opening is one
    size.
  */
  useEffect(() => {
    const box = wordsRef.current;
    const content = contentRef.current;

    if (box === null || content === null || typeof ResizeObserver !== "function") {
      return;
    }

    const measure = (): void => {
      const roomW = box.clientWidth;
      const roomH = box.clientHeight;

      if (roomW < 1 || roomH < 1 || content.offsetWidth < 1 || content.offsetHeight < 1) {
        return;
      }

      /*
        What the content really reaches to, not the box it was given: a row
        that will not wrap is laid out wider than its own box and runs out of
        it on both sides. A range over each run of text reports it as it is
        drawn — so through the scale already on it,
        which is divided back out. Taken as twice the further reach from the
        middle, since what overhangs need not overhang evenly. Across only:
        see the height, below.
      */
      const own = content.getBoundingClientRect();
      const scale = own.width / content.offsetWidth || 1;
      const midX = own.left + own.width / 2;
      const range = document.createRange();
      const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
      let reach = own.width / 2;

      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        /* A line kept for screen readers alone is not drawn, and has no reach to measure. */
        if (
          (node.textContent ?? "").trim().length === 0 ||
          node.parentElement?.closest(".sr-only") != null
        ) {
          continue;
        }

        range.selectNodeContents(node);
        const ink = range.getBoundingClientRect();

        if (ink.width >= 1) {
          reach = Math.max(reach, midX - ink.left, ink.right - midX);
        }
      }

      const needW = Math.max(content.offsetWidth, (2 * reach) / scale);
      /*
        Its height is its box's. Lines stack and their box grows with them,
        so there is nothing to find outside it — and a range would find
        things that are not there to be seen: a ticking digit on its way out
        above its slot, a line of text kept for screen readers alone.
      */
      const needH = content.offsetHeight;

      const next = Math.min(1, roomW / needW, roomH / needH);
      setFit((current) => (Math.abs(current - next) < 0.01 ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(content);

    /* A face that arrives late changes what the words measure without changing any box. */
    let live = true;
    void document.fonts?.ready.then(() => {
      if (live) {
        measure();
      }
    });

    return () => {
      live = false;
      observer.disconnect();
    };
  }, []);

  const pct = (value: number): string => `${(value * 100).toFixed(2)}%`;

  return (
    /*
      A width of its own, in the card's rem so it grows with the type it
      frames on a tablet or a laptop, and never more than the column:
      everything inside it is placed absolutely, so it has no content to take
      a width from, and inside a parent that shrinks to fit it would otherwise
      be nothing wide.
    */
    <div
      ref={stageRef}
      className="relative max-w-full"
      style={{ width: cardRem(art.width / 16), aspectRatio: String(art.aspect) }}
    >
      {/* The content, in the opening. In the document from the first paint, whatever is over it. */}
      <div
        ref={wordsRef}
        className={`absolute flex items-center justify-center ${locked ? "select-none" : ""}`}
        style={{
          left: pct(art.words.x),
          top: pct(art.words.y),
          width: pct(art.words.width),
          height: pct(art.words.height),
        }}
      >
        <div
          ref={contentRef}
          /*
            As wide as the opening, unless something in it will not wrap, in
            which case it is as wide as that needs, so the measurement above
            sees the whole of it and brings it down to fit rather than
            letting it run under the frame.
          */
          className="flex w-fit min-w-full shrink-0 flex-col items-center text-center transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
          style={{ transform: `scale(${(fit * (settle ? 0.92 : 1)).toFixed(3)})` }}
        >
          {children}
        </div>
      </div>

      {between}

      {/* The frame, on top, so its flowers overlap the edge of whatever is under it. */}
      <img
        src={art.src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
      />
    </div>
  );
}
