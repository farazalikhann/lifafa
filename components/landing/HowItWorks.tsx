import type { ReactElement } from "react";
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
  icon: string;
}

const STEPS: readonly Step[] = [
  {
    title: "Choose a design",
    copy: "Pick from the Premium and Traditions designs. Open any of them as a live demo first.",
    icon: "/landing/icons/love-letter.webp",
  },
  {
    title: "Add your details",
    copy: "Names, date, venue and every function, in English or Hindi. The card fills in as you type.",
    icon: "/landing/icons/memo.webp",
  },
  {
    title: "Share one link and track replies",
    copy: "Send it on WhatsApp. Every reply comes to your dashboard, and guests install nothing.",
    icon: "/landing/icons/mobile-phone-with-arrow.webp",
  },
];

/** Three steps from a design to a headcount. A server component. */
export default function HowItWorks(): ReactElement {
  return (
    <section aria-labelledby="how-heading" className={`${SECTION_X} ${SECTION_Y}`}>
      <div className="mx-auto max-w-[70rem]">
        <div className="text-center">
          <p className={EYEBROW}>How it works</p>
          <h2 id="how-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Ready in an evening
          </h2>
        </div>

        <ol role="list" className="mt-10 grid list-none gap-4 sm:gap-5 lg:mt-14 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className={`${CARD} flex gap-5 p-6 lg:flex-col lg:p-8`}>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--paper-blush)]/55">
                <img
                  src={step.icon}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <div className="min-w-0">
                <p className="font-[family-name:var(--paper-display)] text-sm font-semibold text-[var(--paper-gold-ink)]">
                  Step {index + 1}
                </p>
                <h3 className="mt-1 font-[family-name:var(--paper-display)] text-xl leading-snug font-semibold text-[var(--paper-ink)] lg:text-2xl">
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
