"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";

type Accent = "marigold" | "rose";

interface StoryPanelData {
  id: string;
  accent: Accent;
  text: string;
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
 * scale-in transition. Each panel uses a slightly different duration so the
 * five illustrations never fall into step with one another.
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

/* 2 — A phone with a share arrow and a chat bubble. */
function ShareArt(): ReactElement {
  return (
    <Illustration idle="animate-[lifafa-float_8s_ease-in-out_infinite]">
      <g>
        {/* phone */}
        <path d="M62 56 Q62 40 78 40 L132 41 Q148 41 148 57 L146 188 Q146 204 130 204 L76 203 Q60 203 60 187 Z" />
        <path d="M92 57 L116 57" opacity={0.7} />
        <path d="M92 186 L116 186" opacity={0.7} />
        {/* chat bubble on the screen, bobbing gently */}
        <g className="animate-[lifafa-float_4.5s_ease-in-out_infinite] motion-reduce:animate-none">
          <path d="M79 92 Q79 82 89 82 L120 83 Q130 83 130 93 L129 118 Q129 128 119 128 L101 127 L88 140 L90 127 Q79 126 79 117 Z" />
          <path d="M92 100 L117 101" opacity={0.8} />
          <path d="M92 112 L108 113" opacity={0.8} />
        </g>
        {/* share arrow leaving the phone — dots travel up the path */}
        <path
          d="M154 128 Q192 126 196 84"
          strokeDasharray="1 9"
          className="animate-[lifafa-flow_2.6s_linear_infinite] motion-reduce:animate-none"
        />
        <path
          d="M185 94 L196 78 L207 92"
          className="animate-[lifafa-pulse_2.6s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none"
        />
      </g>
    </Illustration>
  );
}

/* 3 — Three guests carrying tick, cross and question badges. */
function RepliesArt(): ReactElement {
  return (
    <Illustration idle="animate-[lifafa-float_7.5s_ease-in-out_infinite]">
      <g>
        {/* guest one — yes */}
        <path d="M52 70 Q73 70 73 90 Q73 110 52 110 Q31 110 31 90 Q31 70 52 70 Z" />
        <path d="M20 168 Q22 128 52 128 Q82 128 84 168" />
        <g className="animate-[lifafa-pulse_3.6s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none">
          <circle cx={84} cy={140} r={16} />
          <path d="M77 140 L82 146 L92 134" />
        </g>

        {/* guest two — no */}
        <path d="M116 70 Q137 70 137 90 Q137 110 116 110 Q95 110 95 90 Q95 70 116 70 Z" />
        <path d="M84 168 Q86 128 116 128 Q146 128 148 168" />
        <g className="animate-[lifafa-pulse_3.6s_ease-in-out_infinite] [animation-delay:1.2s] [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none">
          <circle cx={148} cy={140} r={16} />
          <path d="M142 134 L154 146 M154 134 L142 146" />
        </g>

        {/* guest three — maybe */}
        <path d="M180 70 Q201 70 201 90 Q201 110 180 110 Q159 110 159 90 Q159 70 180 70 Z" />
        <path d="M148 168 Q150 128 180 128 Q210 128 212 168" />
        <g className="animate-[lifafa-pulse_3.6s_ease-in-out_infinite] [animation-delay:2.4s] [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none">
          <circle cx={212} cy={140} r={16} />
          <path d="M206 136 Q206 130 212 130 Q218 130 218 136 Q218 140 212 143 L212 146" />
          <path d="M212 152 L212 152.5" strokeWidth={3.2} />
        </g>

        {/* ground line */}
        <path d="M24 190 L216 190" opacity={0.45} />
      </g>
    </Illustration>
  );
}

/* 4 — A dinner plate with a rising tally beside it. */
function HeadcountArt(): ReactElement {
  return (
    <Illustration idle="animate-[lifafa-float_8.5s_ease-in-out_infinite]">
      <g>
        {/* plate */}
        <path d="M98 88 Q152 88 152 142 Q152 196 98 196 Q44 196 44 142 Q44 88 98 88 Z" />
        <path
          d="M98 108 Q132 108 132 142 Q132 176 98 176 Q64 176 64 142 Q64 108 98 108 Z"
          className="animate-[lifafa-twinkle_5s_ease-in-out_infinite] motion-reduce:animate-none"
        />
        {/* fork */}
        <path d="M18 76 L18 100 M26 76 L26 100 M34 76 L34 100" />
        <path d="M26 100 Q14 104 16 116 L20 196" />
        {/* rising tally — bars tick up one after another */}
        <path d="M166 196 L222 196" opacity={0.45} />
        <path
          d="M174 196 L174 168"
          className="animate-[lifafa-grow_3.4s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:bottom] motion-reduce:animate-none"
        />
        <path
          d="M192 196 L192 142"
          className="animate-[lifafa-grow_3.4s_ease-in-out_infinite] [animation-delay:0.35s] [transform-box:fill-box] [transform-origin:bottom] motion-reduce:animate-none"
        />
        <path
          d="M210 196 L210 114"
          className="animate-[lifafa-grow_3.4s_ease-in-out_infinite] [animation-delay:0.7s] [transform-box:fill-box] [transform-origin:bottom] motion-reduce:animate-none"
        />
        {/* trend arrow */}
        <path
          d="M168 108 L192 84 L214 60"
          strokeDasharray="1 9"
          className="animate-[lifafa-flow_2.8s_linear_infinite] motion-reduce:animate-none"
        />
        <path
          d="M199 58 L216 56 L214 73"
          className="animate-[lifafa-pulse_2.8s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none"
        />
      </g>
    </Illustration>
  );
}

/* 5 — A QR code being scanned in a doorway arch. */
function CheckInArt(): ReactElement {
  return (
    <Illustration idle="animate-[lifafa-float_7.2s_ease-in-out_infinite]">
      <g>
        {/* doorway arch */}
        <path d="M50 206 L50 106 Q50 34 120 34 Q190 34 190 106 L190 206" />
        <path d="M26 206 L214 206" opacity={0.5} />
        {/* qr code */}
        <path d="M90 102 L108 102 L108 120 L90 120 Z" />
        <path d="M96 108 L102 108 L102 114 L96 114 Z" strokeWidth={2} />
        <path d="M132 102 L150 102 L150 120 L132 120 Z" />
        <path d="M138 108 L144 108 L144 114 L138 114 Z" strokeWidth={2} />
        <path d="M90 140 L108 140 L108 158 L90 158 Z" />
        <path d="M96 146 L102 146 L102 152 L96 152 Z" strokeWidth={2} />
        <path
          d="M132 140 L142 140 M132 150 L132 158 M142 150 L150 150 M148 158 L150 158"
          className="animate-[lifafa-twinkle_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
        />
        {/* scanner brackets */}
        <g className="animate-[lifafa-pulse_4s_ease-in-out_infinite] [transform-box:fill-box] [transform-origin:center] motion-reduce:animate-none">
          <path d="M72 108 L72 90 L90 90" />
          <path d="M150 90 L168 90 L168 108" />
          <path d="M72 152 L72 170 L90 170" />
          <path d="M150 170 L168 170 L168 152" />
        </g>
        {/* scan beam sweeping the code */}
        <path
          d="M66 130 L174 130"
          strokeDasharray="10 8"
          className="animate-[lifafa-beam_3.4s_ease-in-out_infinite] motion-reduce:animate-none"
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
    illustration: <EnvelopeArt />,
  },
  {
    id: "share",
    accent: "rose",
    text: "Share one link on WhatsApp. Guests never sign up.",
    illustration: <ShareArt />,
  },
  {
    id: "replies",
    accent: "marigold",
    text: "Every guest replies yes, no or maybe.",
    illustration: <RepliesArt />,
  },
  {
    id: "headcount",
    accent: "rose",
    text: "See your live headcount and stop wasting catering budget.",
    illustration: <HeadcountArt />,
  },
  {
    id: "checkin",
    accent: "marigold",
    text: "Scan guests in on the event day.",
    illustration: <CheckInArt />,
  },
];

function StoryPanel({
  panel,
  index,
}: {
  panel: StoryPanelData;
  index: number;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>();

  // Even panels read illustration -> caption, odd panels mirror it. Below the
  // lg breakpoint both collapse to the same stacked, centred column.
  const mirrored = index % 2 === 1;

  return (
    <section
      ref={ref}
      className={[
        "flex min-h-[100svh] items-center justify-center px-6 py-16",
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      ].join(" ")}
    >
      <div
        className={[
          "flex flex-col items-center gap-8 lg:gap-14",
          mirrored ? "lg:flex-row-reverse" : "lg:flex-row",
        ].join(" ")}
      >
        <div
          className={[
            "h-[150px] w-[150px] shrink-0 lg:h-[200px] lg:w-[200px]",
            "transition-transform duration-700 ease-out motion-reduce:transition-none",
            ACCENT_TEXT[panel.accent],
            isInView ? "scale-100" : "scale-95",
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
