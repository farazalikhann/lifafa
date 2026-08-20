import type { ReactElement } from "react";
import type { Theme } from "@/lib/themes";
import type { GuestReply } from "@/types/guest";

/** First word only, so "Priya Deshpande" greets as "Priya". */
function firstName(name: string): string {
  const [first] = name.trim().split(/\s+/);
  return first ?? "";
}

function headline(status: GuestReply, name: string): string {
  const first = firstName(name);

  if (status === "accepted") {
    return first.length > 0 ? `See you there, ${first}.` : "See you there.";
  }

  return status === "declined"
    ? "Thank you for letting us know."
    : "We have noted your reply.";
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
}: {
  status: GuestReply;
  partySize: number;
  name: string;
  theme: Theme;
  onChangeReply: () => void;
}): ReactElement {
  return (
    <section className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-5 px-6 py-14 text-center">
      <ConfirmMark status={status} accent={theme.accent} />

      <h2
        className="font-[family-name:var(--font-display)] text-2xl font-semibold text-balance"
        style={{ color: theme.textPrimary }}
      >
        {headline(status, name)}
      </h2>

      {status === "accepted" ? (
        <p className="text-sm" style={{ color: theme.textPrimary }}>
          {partySize === 1 ? "Just you" : `You and ${partySize - 1} others`}
        </p>
      ) : null}

      <p className="text-sm" style={{ color: theme.textMuted }}>
        Your reply has been sent to the hosts.
      </p>

      <button
        type="button"
        onClick={onChangeReply}
        className="mt-2 min-h-11 rounded px-2 text-sm font-medium underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ color: theme.accent, outlineColor: theme.accent }}
      >
        Change my reply
      </button>

      <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
        Demo mode: replies are not stored yet.
      </p>
    </section>
  );
}
