import type { ReactElement } from "react";
import type { CeremonyKind } from "@/lib/ceremonies";

/**
 * The drawing on each timeline medallion: objects of the ceremony, never
 * people, hands or animals. Line art on a 24 unit grid in currentColor, with a
 * soft fill at low opacity so it holds up on a light paper and a dark one.
 */
const DRAWINGS: Record<CeremonyKind, ReactElement> = {
  /* A bowl of turmeric paste, heaped, with a spoon resting in it. */
  haldi: (
    <>
      <path d="M3.5 12.5h17a8.5 7 0 0 1-17 0Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M3.5 12.5h17a8.5 7 0 0 1-17 0Z" />
      <path d="M6.5 12.5c1.2-2.6 3.3-3.8 5.5-3.8s4.3 1.2 5.5 3.8" fill="currentColor" fillOpacity="0.45" />
      <path d="M15 9.2l4.5-5" />
      <path d="M9 20.5h6" />
    </>
  ),
  /* A henna cone, drawing a trail of dots. */
  mehndi: (
    <>
      <path d="M15.5 3.5l5 5-9 9-5-5Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M15.5 3.5l5 5-9 9-5-5Z" />
      <path d="M6.5 12.5 3.5 20.5l8-3" />
      <path d="M17 7l-1-1" />
      <circle cx="6" cy="6" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="9" cy="4.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="9" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  /* A crescent and a star. */
  nikah: (
    <>
      <path
        d="M14.5 4.2a8 8 0 1 0 5.3 12.6A6.5 6.5 0 1 1 14.5 4.2Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path d="M14.5 4.2a8 8 0 1 0 5.3 12.6A6.5 6.5 0 1 1 14.5 4.2Z" />
      <path
        d="M17.5 6.2l.8 1.7 1.8.2-1.4 1.2.4 1.8-1.6-.9-1.6.9.4-1.8-1.4-1.2 1.8-.2Z"
        fill="currentColor"
      />
    </>
  ),
  /* Two beamed notes and a single one. */
  sangeet: (
    <>
      <path d="M9 17.5V6l9-2v11" />
      <path d="M9 9l9-2" />
      <ellipse cx="6.8" cy="17.5" rx="2.4" ry="1.9" fill="currentColor" fillOpacity="0.5" />
      <ellipse cx="15.8" cy="15" rx="2.4" ry="1.9" fill="currentColor" fillOpacity="0.5" />
      <path d="M4 7.5v5" />
      <ellipse cx="3.2" cy="12.7" rx="1.3" ry="1" fill="currentColor" />
    </>
  ),
  /*
    A chandelier: hung from a ring, a bowl of arms carrying five candles, and
    crystal drops hanging from the rim.
  */
  feast: (
    <>
      <circle cx="12" cy="2.6" r="1.1" />
      <path d="M12 3.7v4.3" />
      <path d="M3.5 11.5c.6 3 3.9 4.5 8.5 4.5s7.9-1.5 8.5-4.5Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M3.5 11.5c.6 3 3.9 4.5 8.5 4.5s7.9-1.5 8.5-4.5Z" />
      <path d="M5 11.5V9.8M8.5 11.5V9.2M12 11.5V8.6M15.5 11.5V9.2M19 11.5V9.8" />
      <path
        d="M5 7.4c.5.6.5 1.2 0 1.7-.5-.5-.5-1.1 0-1.7ZM8.5 6.8c.5.6.5 1.2 0 1.7-.5-.5-.5-1.1 0-1.7ZM12 6.2c.5.6.5 1.2 0 1.7-.5-.5-.5-1.1 0-1.7ZM15.5 6.8c.5.6.5 1.2 0 1.7-.5-.5-.5-1.1 0-1.7ZM19 7.4c.5.6.5 1.2 0 1.7-.5-.5-.5-1.1 0-1.7Z"
        fill="currentColor"
        strokeWidth={0.8}
      />
      <path d="M7 15.2v2.3M12 16v3M17 15.2v2.3" />
      <path d="M7 17.5l.9 1.2-.9 1.2-.9-1.2ZM12 19l1 1.4-1 1.4-1-1.4ZM17 17.5l.9 1.2-.9 1.2-.9-1.2Z" fill="currentColor" strokeWidth={0.8} />
    </>
  ),
  /* Two rings, linked, a small stone on one. */
  engagement: (
    <>
      <circle cx="9" cy="14" r="5.2" fill="currentColor" fillOpacity="0.12" />
      <circle cx="9" cy="14" r="5.2" />
      <circle cx="15" cy="14" r="5.2" />
      <path d="M13.5 5.2 15 3.5l1.5 1.7L15 7.2Z" fill="currentColor" />
      <path d="M15 7.2v1.6" />
    </>
  ),
  /* A dhol: a barrel drum on its side, laced, with its two sticks. */
  baraat: (
    <>
      <rect x="4" y="9" width="16" height="9" rx="2" fill="currentColor" fillOpacity="0.16" />
      <ellipse cx="4" cy="13.5" rx="1.6" ry="4.5" />
      <ellipse cx="20" cy="13.5" rx="1.6" ry="4.5" />
      <path d="M4 9h16M4 18h16" />
      <path d="M6.5 9l2.5 9 2.5-9 2.5 9 2.5-9 1.5 5" />
      <path d="M8 7l-3-4M16 7l3-4" />
    </>
  ),
  /* A diya: a shallow lamp with its flame. */
  diya: (
    <>
      <path d="M3.5 13.5c1.5 3.4 4.8 5 8.5 5s7-1.6 8.5-5Z" fill="currentColor" fillOpacity="0.2" />
      <path d="M3.5 13.5c1.5 3.4 4.8 5 8.5 5s7-1.6 8.5-5Z" />
      <path d="M2.5 13.5h19" />
      <path
        d="M12 4c2 2.2 2.6 4 2.6 5.3a2.6 2.6 0 0 1-5.2 0C9.4 8 10 6.2 12 4Z"
        fill="currentColor"
        fillOpacity="0.55"
      />
      <path d="M12 11.9v1.6" />
    </>
  ),
};

export default function CeremonyIcon({
  kind,
  size,
}: {
  kind: CeremonyKind;
  /** A CSS length; the medallion sizes it off the card's own scale. */
  size: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {DRAWINGS[kind]}
    </svg>
  );
}
