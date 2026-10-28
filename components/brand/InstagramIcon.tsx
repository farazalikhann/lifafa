import type { ReactElement } from "react";

/**
 * Instagram as a line icon, drawn like the landing page's feature icons: a
 * 24px grid, a 1.5px line with round ends, no fills. It takes the colour of
 * the text around it. Decorative: the link it sits in names itself.
 */
export default function InstagramIcon({
  size = 20,
  className = "",
}: {
  size?: number;
  className?: string;
}): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.25 6.75h.01" />
    </svg>
  );
}
