import type { ReactElement } from "react";
import { BrushField, BrushWash } from "@/components/landing/Brush";
import FeatureIcon, { type FeatureIconName } from "@/components/landing/FeatureIcons";
import {
  EYEBROW,
  SECTION_HEADING,
  SECTION_X,
  SECTION_Y,
} from "@/components/landing/styles";

interface Feature {
  title: string;
  copy: string;
  icon: FeatureIconName;
}

/* Each of these is in the product today; see the terms page for the limits. */
const FEATURES: readonly Feature[] = [
  {
    title: "RSVP in a tap",
    copy: "Guests reply coming, not coming or maybe, with how many people are in their party.",
    icon: "rsvp",
  },
  {
    title: "Live headcount",
    copy: "Your dashboard adds up every reply into one number for the caterer.",
    icon: "headcount",
  },
  {
    title: "Guest pass and QR check-in",
    copy: "Guests who are coming get a pass, and you scan it at the entrance.",
    icon: "pass",
  },
  {
    title: "Hindi and English",
    copy: "Write in one language, add the other with built in translate, and guests switch with a tap.",
    icon: "languages",
  },
  {
    title: "Every tradition and event",
    copy: "Hindu, Muslim, Sikh, Christian, Jain and Buddhist designs, for weddings and every function.",
    icon: "traditions",
  },
  {
    title: "Edit after sharing",
    copy: "Fix a time or a venue and every guest sees it on the same link.",
    icon: "edit",
  },
];

/** What an invitation does after it is sent, in a grid of six. A server component. */
export default function Features(): ReactElement {
  return (
    <section aria-labelledby="features-heading" className={`${SECTION_X} ${SECTION_Y} isolate`}>
      <BrushField>
        <BrushWash
          tone="gold"
          opacity={0.15}
          className="bottom-[-4rem] left-[-20%] aspect-square w-[75vw] max-w-[28rem] lg:left-[-4%]"
        />
      </BrushField>
      <div className="mx-auto max-w-[70rem]">
        <div className="text-center">
          <p className={EYEBROW}>Features</p>
          <h2 id="features-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Everything after the invitation
          </h2>
        </div>

        <ul
          role="list"
          className="mt-10 grid list-none gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-y-12"
        >
          {FEATURES.map((feature) => (
            <li key={feature.title} className="group flex gap-4">
              {/* A paper coin with a gold rim; on hover the rim warms and the icon lifts. */}
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[var(--paper-hairline)] bg-[var(--paper-card)] transition-colors duration-200 group-hover:border-[var(--paper-gold)]">
                <FeatureIcon
                  name={feature.icon}
                  className="transition-transform duration-200 ease-out group-hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-y-0"
                />
              </span>
              <div className="min-w-0">
                <h3 className="font-[family-name:var(--paper-display)] text-xl leading-snug font-semibold text-[var(--paper-ink)]">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-base leading-[1.6] text-[var(--paper-muted)]">
                  {feature.copy}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
