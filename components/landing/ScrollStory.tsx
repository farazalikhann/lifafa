"use client";

import type { ReactElement } from "react";
import CheckinDemo from "@/components/landing/demos/CheckinDemo";
import CoverDemo from "@/components/landing/demos/CoverDemo";
import DashboardDemo from "@/components/landing/demos/DashboardDemo";
import RsvpDemo from "@/components/landing/demos/RsvpDemo";
import { useInView } from "@/hooks/useInView";
import { useNearViewport } from "@/hooks/useNearViewport";

type Accent = "marigold" | "rose";

interface StoryPanelData {
  id: string;
  accent: Accent;
  /**
   * The whole of what the panel says. Every demo is hidden from assistive
   * technology, so this line alone has to explain what its demo shows.
   */
  text: string;
  /**
   * A line drawing fills a square the panel sizes for it. A demo is a phone
   * that reserves its own box — see components/landing/demos/DemoPhone.tsx.
   */
  kind: "drawing" | "demo";
  illustration: ReactElement;
}

/** Full class strings so Tailwind can see them at build time. */
const ACCENT_TEXT: Record<Accent, string> = {
  marigold: "text-[var(--lifafa-marigold)]",
  rose: "text-[var(--lifafa-rose)]",
};

/**
 * Shared frame for the hand drawn line art. Every path uses currentColor, so
 * the panel's accent class colours the whole drawing.
 *
 * `idle` is the slow breathing loop for the drawing as a whole. It lives on the
 * <svg> rather than on the panel wrapper so it cannot fight the wrapper's
 * scale-in transition.
 *
 * One panel still has a drawing: making a card is the step with no screen worth
 * showing at this size. The other four show the product itself, as demos.
 */
function Illustration({
  children,
  idle,
}: {
  children: ReactElement;
  idle: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 240 240"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-full w-full motion-reduce:animate-none ${idle}`}
    >
      {children}
    </svg>
  );
}

/* 1 — An envelope opening with a card sliding out. */
function EnvelopeArt(): ReactElement {
  return (
    <Illustration idle="animate-[lifafa-float_7s_ease-in-out_infinite]">
      <g>
        {/* opened flap, folded back behind the card */}
        <path d="M32 114 Q120 82 208 114" opacity={0.75} />
        {/* the invitation card, easing up out of the envelope */}
        <g className="animate-[lifafa-slip_5s_ease-in-out_infinite] motion-reduce:animate-none">
          <path d="M75 46 Q74 41 79 41 L161 43 Q166 43 165 48 L162 148 L78 146 Z" />
          <path d="M95 74 L146 75" />
          <path d="M95 95 L133 96" />
          <path d="M95 116 L140 117" />
        </g>
        {/* envelope body */}
        <path d="M31 116 Q31 110 37 110 L203 112 Q209 112 209 118 L207 198 Q207 204 201 204 L37 202 Q31 202 31 196 Z" />
        {/* front fold of the pocket */}
        <path d="M32 202 L119 150 L208 200" />
        {/* small celebratory marks */}
        <path
          d="M48 62 L48 76 M41 69 L55 69"
          className="animate-[lifafa-twinkle_3.2s_ease-in-out_infinite] motion-reduce:animate-none"
        />
        <path
          d="M191 78 L191 88 M186 83 L196 83"
          className="animate-[lifafa-twinkle_3.2s_ease-in-out_infinite] [animation-delay:1.1s] motion-reduce:animate-none"
        />
      </g>
    </Illustration>
  );
}

const PANELS: readonly StoryPanelData[] = [
  {
    id: "create",
    accent: "marigold",
    text: "Create your invitation in minutes.",
    kind: "drawing",
    illustration: <EnvelopeArt />,
  },
  {
    id: "share",
    accent: "rose",
    text: "Share one link on WhatsApp. Guests tap it open, and never sign up.",
    kind: "demo",
    illustration: <CoverDemo />,
  },
  {
    id: "replies",
    accent: "marigold",
    text: "Every guest replies yes, no or maybe. Each yes adds to your headcount.",
    kind: "demo",
    illustration: <RsvpDemo />,
  },
  {
    id: "headcount",
    accent: "rose",
    text: "Your headcount, always up to date when you open it. Stop wasting catering budget.",
    kind: "demo",
    illustration: <DashboardDemo />,
  },
  {
    id: "checkin",
    accent: "marigold",
    text: "Scan guests in on the event day.",
    kind: "demo",
    illustration: <CheckinDemo />,
  },
];

function StoryPanel({
  panel,
  index,
}: {
  panel: StoryPanelData;
  index: number;
}): ReactElement {
  /*
    The observer watches the content, not the panel. A panel is a full viewport
    tall with its content centred in it, so watching the panel meant the reveal
    fired against its empty top edge — the drawing and the line played their
    entrance half a screen below the fold and were already finished, sitting
    still, by the time the visitor scrolled far enough to see them. Watching the
    content itself starts the entrance when the content actually arrives.
  */
  const { ref: contentRef, isInView } = useInView<HTMLDivElement>();
  const { ref: panelRef, isNear } = useNearViewport<HTMLElement>();

  // Even panels read illustration -> caption, odd panels mirror it. Below the
  // lg breakpoint both collapse to the same stacked, centred column.
  const mirrored = index % 2 === 1;

  return (
    /*
      relative only so the panel paints after the hero does. The hero's rose
      bloom deliberately hangs past its own bottom edge into this first panel;
      a positioned element later in the document paints over one earlier, so
      the drawing and the caption sit on top of the colour rather than under a
      wash of it. The panel has no background, so the bloom still shows through.
    */
    <section
      ref={panelRef}
      className="relative flex min-h-[100svh] items-center justify-center px-6 py-16"
    >
      <div
        ref={contentRef}
        className={[
          "flex flex-col items-center gap-8 lg:gap-14",
          mirrored ? "lg:flex-row-reverse" : "lg:flex-row",
        ].join(" ")}
      >
        <div
          className={[
            "shrink-0",
            /*
              A drawing is sized, coloured and parked here. A demo sizes itself
              and starts and stops on its own observer, which is stricter than
              this one: on screen, not merely near it.
            */
            panel.kind === "drawing"
              ? [
                  "h-[150px] w-[150px] lg:h-[200px] lg:w-[200px]",
                  ACCENT_TEXT[panel.accent],
                  isNear ? "" : "lifafa-parked",
                ].join(" ")
              : "",
            /*
              transform-gpu gives the drawing a layer of its own, so its idle
              loop repaints on its own small surface instead of dirtying the
              panel behind it every frame.
            */
            "transform-gpu transition-[opacity,transform] duration-700 ease-out",
            "motion-reduce:transition-none",
            isInView
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0",
          ].join(" ")}
        >
          {panel.illustration}
        </div>

        <p
          className={[
            "max-w-[22ch] text-center text-balance lg:max-w-[25ch]",
            "font-[family-name:var(--font-display)] font-medium tracking-[-0.01em]",
            "text-3xl leading-[1.2] text-[var(--lifafa-cream)] lg:text-4xl",
            mirrored ? "lg:text-right" : "lg:text-left",
            /*
              A beat behind the drawing. The two arriving together read as one
              block sliding; staggered, the caption reads as an answer to the
              picture.
            */
            "transform-gpu transition-[opacity,transform] duration-700 delay-150 ease-out",
            "motion-reduce:transition-none motion-reduce:delay-0",
            isInView ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          ].join(" ")}
        >
          {panel.text}
        </p>
      </div>
    </section>
  );
}

export default function ScrollStory() {
  return (
    <div>
      {PANELS.map((panel, index) => (
        <StoryPanel key={panel.id} panel={panel} index={index} />
      ))}
    </div>
  );
}
