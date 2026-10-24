import type { ReactElement } from "react";
import Link from "next/link";
import LinkPending from "@/components/landing/LinkPending";
import ScrollCue from "@/components/landing/ScrollCue";
import StepDiagram from "@/components/landing/StepDiagram";
import { PRIMARY_BUTTON } from "@/components/landing/styles";
import { NEW_CARD_HREF } from "@/lib/wizardSteps";

/** The id of the demo section, which the scroll cue leads to. */
export const DEMO_SECTION_ID = "demo";

/**
 * Lifafa's mark: an envelope, its flap closed under a round seal. Drawn in
 * the page's marigold and rose, so there is no picture to wait for.
 */
function EnvelopeMark(): ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      fill="none"
      className="h-[clamp(2.75rem,12vw,4.5rem)] w-[clamp(2.75rem,12vw,4.5rem)] shrink-0"
    >
      <rect
        x="6"
        y="16"
        width="52"
        height="36"
        rx="4"
        stroke="var(--lifafa-marigold)"
        strokeWidth="2.5"
      />
      <path
        d="M7.5 18.5 L32 37 L56.5 18.5"
        stroke="var(--lifafa-marigold)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 50.5 L25 36 M56.5 50.5 L39 36"
        stroke="var(--lifafa-marigold)"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="32" cy="37" r="7.5" fill="var(--lifafa-rose)" />
      <circle
        cx="32"
        cy="37"
        r="4.5"
        stroke="var(--lifafa-marigold)"
        strokeOpacity="0.8"
        strokeWidth="1.2"
      />
    </svg>
  );
}

/**
 * The first screen: the name, what it is in one line, how a card is made in
 * four steps, the way in, and a pointer down to the demo.
 *
 * A SERVER COMPONENT around two small client ones (the diagram and the cue).
 * Every word and the button are in the HTML, so the screen is whole with the
 * first paint and its largest element is the name, in the brand serif that is
 * already preloaded: no picture stands between a visitor and the first
 * screen.
 *
 * At least the height of the screen, under the fixed header, with its parts
 * spread down it; on a short phone it simply grows.
 */
export default function Hero(): ReactElement {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[100svh] flex-col items-center overflow-x-clip px-5 pt-[4.5rem] pb-6 text-center sm:px-8 lg:pt-28 lg:pb-10"
    >
      {/* A warm glow behind the name, drawn in CSS. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 -z-10 aspect-square w-[min(150vw,64rem)] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,rgba(232,163,61,0.16),rgba(196,86,107,0.07)_55%,transparent)]"
      />

      {/* Full width, so the diagram is as wide as it may be and not as wide as the name. */}
      <div className="flex w-full flex-1 flex-col items-center justify-evenly gap-6 lg:gap-10">
        <div className="flex flex-col items-center">
          <h1
            id="hero-heading"
            className="flex items-center gap-[0.18em] font-[family-name:var(--font-display)] text-[clamp(4rem,21vw,8.5rem)] leading-none font-semibold tracking-[-0.035em] text-[var(--lifafa-cream)]"
          >
            <EnvelopeMark />
            Lifafa
          </h1>
          <p className="mt-3 max-w-[26ch] text-[1.0625rem] leading-relaxed text-balance text-[var(--lifafa-cream-soft)] sm:text-xl">
            Wedding invitations that also tell you who is coming.
          </p>
        </div>

        <StepDiagram />

        <div className="flex flex-col items-center gap-4">
          <Link href={NEW_CARD_HREF} className={PRIMARY_BUTTON}>
            <LinkPending>Create your card</LinkPending>
          </Link>
          <ScrollCue targetId={DEMO_SECTION_ID} />
        </div>
      </div>
    </section>
  );
}
