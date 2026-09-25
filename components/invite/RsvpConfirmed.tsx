import type { ReactElement, ReactNode } from "react";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { DISPLAY_FACE } from "@/lib/fontPairs";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { GuestReply } from "@/types/guest";

/** First word only, so "Priya Deshpande" greets as "Priya". */
function firstName(name: string): string {
  const [first] = name.trim().split(/\s+/);
  return first ?? "";
}

function headline(
  status: GuestReply,
  name: string,
  copy: CardCopy["confirmed"],
): string {
  if (status === "accepted") {
    return copy.accepted(firstName(name));
  }

  return status === "declined" ? copy.declined : copy.maybe;
}

/**
 * Hand drawn confirmation marks — one family of three, so no reply reads as
 * harsher than another: a tick, a soft dash, and a resting ellipsis.
 */
function ConfirmMark({
  status,
  accent,
}: {
  status: GuestReply;
  accent: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 64 64"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke={accent}
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-16 w-16"
    >
      <path d="M32 6 Q58 6 58 32 Q58 58 32 58 Q6 58 6 32 Q6 6 32 6 Z" />
      {status === "accepted" ? (
        <path d="M20 33 Q26 37 29 43 Q36 27 45 21" />
      ) : null}
      {status === "declined" ? <path d="M22 32 H42" /> : null}
      {status === "maybe" ? (
        <>
          <circle cx={23} cy={32} r={1.8} fill={accent} stroke="none" />
          <circle cx={32} cy={32} r={1.8} fill={accent} stroke="none" />
          <circle cx={41} cy={32} r={1.8} fill={accent} stroke="none" />
        </>
      ) : null}
    </svg>
  );
}

export default function RsvpConfirmed({
  status,
  partySize,
  name,
  theme,
  onChangeReply,
  language,
  pass = null,
}: {
  status: GuestReply;
  partySize: number;
  name: string;
  theme: Theme;
  onChangeReply: () => void;
  /** The card's language, which the confirmation is written in. */
  language: CardLanguage;
  /** The guest's check-in pass, or null when there is none to show. */
  pass?: ReactNode;
}): ReactElement {
  const copy = cardCopy(language).confirmed;

  return (
    <section className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-5 px-6 py-14 text-center">
      <ConfirmMark status={status} accent={theme.accent} />

      <h2
        className="text-2xl font-semibold text-balance"
        style={{
          color: theme.textPrimary,
          fontFamily: theme.displayFontFamily ?? DISPLAY_FACE,
          fontWeight: theme.displayFontWeight,
        }}
      >
        {headline(status, name, copy)}
      </h2>

      {status === "accepted" ? (
        <p className="text-sm" style={{ color: theme.textPrimary }}>
          {copy.party(partySize)}
        </p>
      ) : null}

      <p className="text-sm" style={{ color: theme.textMuted }}>
        {copy.sent}
      </p>

      {pass}

      <button
        type="button"
        onClick={onChangeReply}
        className="mt-2 min-h-11 rounded px-2 text-sm font-medium underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ color: theme.accent, outlineColor: theme.accent }}
      >
        {copy.change}
      </button>
    </section>
  );
}
