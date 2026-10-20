import type { ReactElement } from "react";
import { EYEBROW, SECTION_HEADING, SECTION_LEAD } from "@/components/landing/styles";

interface Feature {
  heading: string;
  copy: string;
  icon: ReactElement;
}

/** Line icons in the step drawings' hand, coloured by `currentColor`. */
function Icon({ children }: { children: ReactElement }): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      role="presentation"
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

const FEATURES: readonly Feature[] = [
  {
    heading: "Replies from every guest",
    copy: "Each guest answers coming, not coming or maybe, and says how many people are in their party.",
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
    copy: "Open your dashboard any time for an up-to-date count of everyone who is coming.",
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
    copy: "Turn it on and guests who are coming get a pass. Scan it at the entrance to see who has arrived.",
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
  {
    heading: "English and Hindi",
    copy: "Write your invitation in one language and add the other. Guests switch between them with one tap.",
    icon: (
      <Icon>
        <g>
          <path d="M4 5 L12 5 M8 3 L8 5 M10.5 5 Q9.5 11 4.5 13.5 M6.5 8.5 Q8.5 11.5 12 12.5" />
          <path d="M12.5 21 L16.5 11 L20.5 21 M14 17.5 L19 17.5" />
        </g>
      </Icon>
    ),
  },
  {
    heading: "Add to Calendar and map",
    copy: "Guests save the date to their phone's calendar and open the venue in their maps app.",
    icon: (
      <Icon>
        <g>
          <path d="M5 6 Q4 6 4 7 L4 19 Q4 20 5 20 L19 20 Q20 20 20 19 L20 7 Q20 6 19 6 Z" />
          <path d="M4 10 L20 10 M8 4 L8 7 M16 4 L16 7" />
          <path d="M12 18 Q9 15 9 13.5 Q9 12 12 12 Q15 12 15 13.5 Q15 15 12 18 Z" />
        </g>
      </Icon>
    ),
  },
  {
    heading: "Your guest list to keep",
    copy: "Download every reply as a spreadsheet, ready to share with family or your caterer.",
    icon: (
      <Icon>
        <g>
          <path d="M12 4 L12 15 M7.5 10.5 L12 15 L16.5 10.5" />
          <path d="M5 17 L5 20 L19 20 L19 17" />
        </g>
      </Icon>
    ),
  },
];

/** One reply figure on the mock dashboard. */
function Tile({
  count,
  label,
  tone,
}: {
  count: number;
  label: string;
  tone: string;
}): ReactElement {
  return (
    <div className="min-w-0 rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink)] px-2 py-3 text-center">
      <p className={`font-[family-name:var(--font-display)] text-2xl leading-none font-semibold ${tone}`}>
        {count}
      </p>
      <p className="mt-1.5 text-[0.6875rem] leading-tight text-[var(--lifafa-muted)]">
        {label}
      </p>
    </div>
  );
}

/**
 * The host's dashboard as a picture made of HTML: the figures it shows and
 * the words it uses, for an invented wedding. The figures add up: twenty
 * replies coming, with fifty-two people in their parties between them.
 */
function DashboardMock(): ReactElement {
  return (
    <figure className="mx-auto w-full max-w-[22rem]">
      <div
        role="img"
        aria-label="An example dashboard: 52 guests expected, 20 replies coming, 5 not coming, 4 maybe, and 38 of 52 checked in at the venue."
        className="rounded-3xl border border-[var(--lifafa-marigold)]/30 bg-[var(--lifafa-ink-raised)] p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]"
      >
        <div aria-hidden="true">
          <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--lifafa-cream)]">
            Aarav and Meera
          </p>
          <p className="text-xs text-[var(--lifafa-muted)]">
            12 December, Jaipur
          </p>

          <div className="mt-5 rounded-2xl bg-[var(--lifafa-ink)] px-4 py-4">
            <p className="text-[0.6875rem] font-semibold tracking-[0.18em] text-[var(--lifafa-muted)] uppercase">
              Expected headcount
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-5xl leading-none font-semibold text-[var(--lifafa-cream)]">
              52
            </p>
            <p className="mt-1.5 text-xs text-[var(--lifafa-muted)]">
              guests, counting everyone in each party
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Tile count={20} label="Coming" tone="text-[#7fc29b]" />
            <Tile count={5} label="Not coming" tone="text-[var(--lifafa-rose)]" />
            <Tile count={4} label="Maybe" tone="text-[var(--lifafa-marigold)]" />
          </div>

          <div className="mt-3 rounded-2xl bg-[var(--lifafa-ink)] px-4 py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold text-[var(--lifafa-cream)]">
                Checked in at the venue
              </p>
              <p className="text-xs text-[var(--lifafa-muted)]">38 of 52</p>
            </div>
            <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-[var(--lifafa-hairline)]">
              <div className="h-full w-[73%] rounded-full bg-[var(--lifafa-marigold)]" />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-3 text-center text-xs text-[var(--lifafa-muted)]">
        An example of your dashboard, with invented names.
      </figcaption>
    </figure>
  );
}

/**
 * Why a host pays: knowing who is coming. The dashboard's figures beside the
 * features that fill them. A server component, with no script and no picture.
 */
export default function GuestManagement(): ReactElement {
  return (
    <section
      aria-labelledby="guests-heading"
      className="px-5 py-16 sm:px-8 sm:py-24"
    >
      {/*
        The figures straight after the heading on a phone, before the list
        that explains them; beside both from `lg`.
      */}
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-x-16">
        <div className="text-center lg:col-start-2 lg:text-left">
          <p className={EYEBROW}>Guest management</p>
          <h2 id="guests-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Know exactly who is coming
          </h2>
          <p className={`mx-auto mt-4 max-w-[42ch] lg:mx-0 ${SECTION_LEAD}`}>
            Every reply lands on your dashboard, so planning the food, the
            seating and the welcome is no longer guesswork.
          </p>
        </div>

        <div className="lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-center">
          <DashboardMock />
        </div>

        <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:col-start-2">
          {FEATURES.map((feature) => (
            <li key={feature.heading} className="flex gap-3.5">
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
