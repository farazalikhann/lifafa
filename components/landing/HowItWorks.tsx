import type { ReactElement } from "react";
import { BrushField, BrushWash } from "@/components/landing/Brush";
import {
  CARD,
  EYEBROW,
  SECTION_HEADING,
  SECTION_X,
  SECTION_Y,
} from "@/components/landing/styles";

interface Step {
  title: string;
  copy: string;
  /** A painted still life, 300px wide: about 2x the size it is shown at. */
  art: { src: string; width: number; height: number };
}

const STEPS: readonly Step[] = [
  {
    title: "Choose a design",
    copy: "Pick from the Premium and Traditions designs. Open any of them as a live demo first.",
    art: { src: "/landing/steps/step-1-choose.webp", width: 300, height: 299 },
  },
  {
    title: "Add your details",
    copy: "Names, date, venue and every function, in English or Hindi. The card fills in as you type.",
    art: { src: "/landing/steps/step-2-details.webp", width: 300, height: 288 },
  },
  {
    title: "Share one link and track replies",
    copy: "Send it on WhatsApp. Every reply comes to your dashboard, and guests install nothing.",
    art: { src: "/landing/steps/step-3-share.webp", width: 300, height: 299 },
  },
];

/** Three steps from a design to a headcount. A server component. */
export default function HowItWorks(): ReactElement {
  return (
    <section aria-labelledby="how-heading" className={`${SECTION_X} ${SECTION_Y} isolate`}>
      <BrushField>
        <BrushWash
          tone="blush"
          opacity={0.15}
          className="top-[-4rem] right-[-18%] aspect-square w-[75vw] max-w-[28rem] lg:right-[-4%]"
        />
      </BrushField>
      <div className="mx-auto max-w-[70rem]">
        <div className="text-center">
          <p className={EYEBROW}>How it works</p>
          <h2 id="how-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Ready in an evening
          </h2>
        </div>

        <ol role="list" className="mt-10 grid list-none gap-4 sm:gap-5 lg:mt-14 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className={`${CARD} lifafa-hover-shadow flex flex-col p-6 lg:p-8`}>
              {/* Sized by its own width and height, so the card never jumps when it loads. */}
              <img
                src={step.art.src}
                alt=""
                width={step.art.width}
                height={step.art.height}
                loading="lazy"
                decoding="async"
                className="h-32 w-auto self-start lg:h-[8.75rem]"
              />
              <div className="mt-5 min-w-0">
                <p className={EYEBROW}>Step {index + 1}</p>
                <h3 className="mt-2 font-[family-name:var(--paper-display)] text-xl leading-snug font-semibold text-[var(--paper-ink)] lg:text-2xl">
                  {step.title}
                </h3>
                <p className="mt-2 text-base leading-[1.6] text-[var(--paper-muted)]">
                  {step.copy}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
