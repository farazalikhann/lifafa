import type { ReactElement } from "react";
import FeatureIcon, { type FeatureIconName } from "@/components/landing/FeatureIcons";

/**
 * Under the quick start: what comes after "See my card", so a host sees the
 * rest is short and can wait. Words only, nothing to press: the checklist
 * after the card is where each of these is added.
 */
const NEXT: readonly { label: string; icon: FeatureIconName }[] = [
  { label: "Venue", icon: "venue" },
  { label: "Functions", icon: "traditions" },
  { label: "Family", icon: "headcount" },
  { label: "Message", icon: "rsvp" },
];

export default function QuickStartNext(): ReactElement {
  return (
    <div
      data-quick-start-next=""
      className="flex flex-col gap-2.5 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-3"
    >
      <p className="text-[0.8125rem] font-medium text-[var(--lifafa-muted)]">
        Next, in 1 minute (optional):
      </p>
      <ul className="flex flex-wrap gap-2">
        {NEXT.map((item) => (
          <li
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--lifafa-ink-raised)] py-1 pr-3 pl-2 text-[0.8125rem] text-[var(--lifafa-cream)]"
          >
            <FeatureIcon name={item.icon} className="size-[18px]" />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
