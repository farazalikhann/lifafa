import type { ReactElement, ReactNode } from "react";

/**
 * The feature list's line icons, drawn here so they match the page: a 24px
 * grid, a 1.5px emerald line with round ends, and one small gold detail each.
 * No fills. Decorative: the heading beside each icon says what it is.
 */

export type FeatureIconName =
  | "rsvp"
  | "headcount"
  | "pass"
  | "languages"
  | "traditions"
  | "edit";

/** The one gold touch in an icon. */
function Gold({ children }: { children: ReactNode }): ReactElement {
  return <g className="text-[var(--paper-gold)]">{children}</g>;
}

const ICONS: Record<FeatureIconName, ReactElement> = {
  /* An envelope with its corner left open for a check. */
  rsvp: (
    <>
      <path d="M20.5 12.5V7.5A1.5 1.5 0 0 0 19 6H5a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 5 18h8" />
      <path d="m4 7 8 5.5L20 7" />
      <Gold>
        <path d="m15.75 18.25 1.75 1.75 3.75-4" />
      </Gold>
    </>
  ),

  /* Three guests, the middle one in front, and a small count above them. */
  headcount: (
    <>
      <circle cx="12" cy="9.25" r="2.75" />
      <path d="M7 20v-.75a5 5 0 0 1 10 0V20" />
      <circle cx="5.5" cy="12" r="2" />
      <path d="M2 20v-.5A3.5 3.5 0 0 1 5.5 16c.6 0 1.15.15 1.65.4" />
      <circle cx="18.5" cy="12" r="2" />
      <path d="M22 20v-.5a3.5 3.5 0 0 0-3.5-3.5c-.6 0-1.15.15-1.65.4" />
      <Gold>
        <circle cx="19" cy="4.5" r="3" />
        <path d="M18.6 3.9 19.2 3.5v2.25" />
      </Gold>
    </>
  ),

  /* A ticket with a torn line, and a QR corner on its stub. */
  pass: (
    <>
      <path d="M3 8A1.5 1.5 0 0 1 4.5 6.5h15A1.5 1.5 0 0 1 21 8v2.25a1.75 1.75 0 0 0 0 3.5V16a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16v-2.25a1.75 1.75 0 0 0 0-3.5Z" />
      <path d="M8.5 7v.5m0 2v1m0 2v1m0 2v.5" />
      <Gold>
        <rect x="12.25" y="9.25" width="5.5" height="5.5" rx="1" />
        <path d="M15 12h.01" />
      </Gold>
    </>
  ),

  /* Two speech cards, English behind and Hindi in front. */
  languages: (
    <>
      <path d="M10 12.5H7.5L5 15v-2.5H4A1.5 1.5 0 0 1 2.5 11V5A1.5 1.5 0 0 1 4 3.5h8.5A1.5 1.5 0 0 1 14 5v4.5" />
      <path d="M11.5 9.5H20a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5h-1V21l-2.5-2.5h-5A1.5 1.5 0 0 1 10 17v-6a1.5 1.5 0 0 1 1.5-1.5Z" />
      {/* "A" */}
      <path d="m5.5 10 1.75-4.25L9 10m-2.95-1.3h2.4" />
      <Gold>
        {/* "अ": the head line, the bowl, its tie and the stem. */}
        <path d="M12.75 11.75h6.5M13.2 13c.95-.55 2.3-.35 2.3.6 0 .65-.6 1-1.3 1 .8 0 1.55.4 1.55 1.15 0 .95-1.4 1.3-2.65.65M15.75 14.6H18M18.25 11.75v5.25" />
      </Gold>
    </>
  ),

  /* A diya, its flame and a few small rays. */
  traditions: (
    <>
      <path d="M12 6c1.5 1.8 2.15 3.05 2.15 4.1a2.15 2.15 0 0 1-4.3 0C9.85 9.05 10.5 7.8 12 6Z" />
      <path d="M3.5 14h17c-.6 3.4-4 5.75-8.5 5.75S4.1 17.4 3.5 14Z" />
      <path d="M20.5 14 22 12.5" />
      <Gold>
        <path d="M12 2.25v1.25M6.75 5.25l.9.9M17.25 5.25l-.9.9M5 10h1.25M17.75 10H19" />
      </Gold>
    </>
  ),

  /* A pen, and a small turning arrow: changed after it went out. */
  edit: (
    <>
      <path d="m4 20 1-4L15.5 5.5a2.12 2.12 0 0 1 3 3L8 19Z" />
      <path d="m13.5 7.5 3 3" />
      <Gold>
        <path d="M21.25 17.5a3.5 3.5 0 1 1-3.5-3.5c.98 0 1.92.39 2.62 1.07l.88.49" />
        <path d="M21.25 13.6v1.95H19.3" />
      </Gold>
    </>
  ),
};

/** One feature icon at 28px. Hidden from screen readers. */
export default function FeatureIcon({
  name,
  className = "",
}: {
  name: FeatureIconName;
  className?: string;
}): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-[var(--paper-emerald)] ${className}`}
    >
      {ICONS[name]}
    </svg>
  );
}
