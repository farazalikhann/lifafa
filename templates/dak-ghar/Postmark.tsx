import type { ReactElement } from "react";
import { DAK_FONTS } from "@/templates/dak-ghar/shared";
import type { CardLanguage } from "@/types/card";

/*
  The arc the city is set round. Every postmark draws the same one, so they
  share an id: whichever the browser finds first is the same path.
*/
const ARC = "dg-postmark-arc";

/** "14.12.26", for a postmark's middle, from the ISO date; null without one. */
export function postmarkDate(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  return match === null ? null : `${match[3]}.${match[2]}.${match[1].slice(2)}`;
}

/**
 * A round postmark, drawn in code: two rings of ink with the city round the
 * top and the date in the middle, in `currentColor`. Decoration only.
 */
export default function Postmark({
  city,
  date,
  language,
  className,
}: {
  city: string;
  date: string | null;
  language: CardLanguage;
  className?: string;
}): ReactElement {
  const ring = language === "hi" ? city : city.toUpperCase();

  return (
    <svg viewBox="0 0 100 100" className={className} focusable="false" aria-hidden="true">
      <defs>
        <path id={ARC} d="M 18 52 A 32 32 0 0 1 82 52" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <text
        fill="currentColor"
        style={{
          ...DAK_FONTS.sans,
          fontWeight: 700,
          fontSize: language === "hi" ? 11 : 9.5,
          letterSpacing: language === "hi" ? 0 : 1.2,
        }}
      >
        <textPath href={`#${ARC}`} startOffset="50%" textAnchor="middle">
          {ring.length > 16 ? `${ring.slice(0, 15)}…` : ring}
        </textPath>
      </text>
      {date !== null ? (
        <text x="50" y="55" textAnchor="middle" fill="currentColor" style={{ ...DAK_FONTS.sans, fontWeight: 700, fontSize: 11 }}>
          {date}
        </text>
      ) : null}
      <path d="M 30 70 H 70" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
