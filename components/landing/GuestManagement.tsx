import type { ReactElement } from "react";
import { EYEBROW, SECTION_HEADING } from "@/components/landing/styles";

interface Feature {
  heading: string;
  copy: string;
  icon: ReactElement;
}

/** Line icons in the page's marigold, coloured by `currentColor`. */
function Icon({ children }: { children: ReactElement }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 shrink-0 text-[var(--lifafa-marigold)]"
    >
      {children}
    </svg>
  );
}

/*
  The three things a host is paying for beyond the card itself. "Up-to-date"
  and not "live": the dashboard counts every reply when it is opened, and
  does not change while it is open.
*/
const FEATURES: readonly Feature[] = [
  {
    heading: "Guests reply",
    copy: "Coming, not coming or maybe, with how many people are in their party.",
    icon: (
      <Icon>
        <g>
          <path d="M4 6 Q4 4 6 4 L18 4 Q20 4 20 6 L20 14 Q20 16 18 16 L10 16 L6 20 L6.5 16 Q4 16 4 14 Z" />
          <path d="M8.5 10.2 L10.6 12.2 L15.5 7.8" />
        </g>
      </Icon>
    ),
  },
  {
    heading: "A headcount for your caterer",
    copy: "Your dashboard adds up every reply into one up-to-date number.",
    icon: (
      <Icon>
        <g>
          <path d="M4 20 L20 20" />
          <path d="M7 20 L7 13" />
          <path d="M12 20 L12 8" />
          <path d="M17 20 L17 4" />
        </g>
      </Icon>
    ),
  },
  {
    heading: "QR check-in at the venue",
    copy: "Guests who are coming get a pass, and you scan it at the entrance.",
    icon: (
      <Icon>
        <g>
          <path d="M4 4 L10 4 L10 10 L4 10 Z" />
          <path d="M14 4 L20 4 L20 10 L14 10 Z" />
          <path d="M4 14 L10 14 L10 20 L4 20 Z" />
          <path d="M14 14 L16 14 M20 14 L20 16 M14 18 L14 20 L16 20 M18 18 L20 20 M17 17 L17 17.01" />
        </g>
      </Icon>
    ),
  },
];

/** What the invitation does after it is sent, in a row of three. No script. */
export default function GuestManagement(): ReactElement {
  return (
    <section
      aria-labelledby="guests-heading"
      className="border-t border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]/50 px-5 py-16 sm:px-8 sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className={EYEBROW}>Guest management</p>
          <h2 id="guests-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Know exactly who is coming
          </h2>
        </div>

        <ul
          role="list"
          className="mx-auto mt-10 grid max-w-md list-none gap-4 sm:max-w-none sm:grid-cols-3 sm:gap-5"
        >
          {FEATURES.map((feature) => (
            <li
              key={feature.heading}
              className="flex gap-4 rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)] p-5 sm:flex-col sm:gap-3"
            >
              {feature.icon}
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[var(--lifafa-cream)]">
                  {feature.heading}
                </h3>
                <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--lifafa-muted)]">
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
