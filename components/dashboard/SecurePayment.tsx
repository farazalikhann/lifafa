import type { ReactElement } from "react";

/**
 * "Secure payment by Razorpay", with the three ways most hosts pay: UPI, a
 * card and net banking. Under the publish button, where the decision is made.
 *
 * The marks are plain drawings in currentColor, not the networks' logos: no
 * brand artwork to license or keep current, nothing fetched, and the line stays
 * one height whatever loads. It is a fixed 16px tall, so it never moves the
 * button above it.
 */
export default function SecurePayment({ className = "" }: { className?: string }): ReactElement {
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--lifafa-muted)] ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <LockIcon />
        Secure payment by Razorpay
      </span>
      <span className="inline-flex items-center gap-1.5" aria-label="UPI, cards and net banking accepted">
        <UpiIcon />
        <CardIcon />
        <BankIcon />
      </span>
    </p>
  );
}

const ICON = "h-4 w-auto shrink-0";

function LockIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" strokeLinecap="round" />
    </svg>
  );
}

/** A small tag with "UPI" in it. */
function UpiIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 28 16" className={ICON}>
      <rect x="0.75" y="0.75" width="26.5" height="14.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text x="14" y="11.4" textAnchor="middle" fontSize="8.5" fontWeight="700" fontFamily="system-ui, sans-serif" fill="currentColor">
        UPI
      </text>
    </svg>
  );
}

/** A card: its outline, the magnetic stripe and a line of digits. */
function CardIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 22 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="0.75" y="0.75" width="20.5" height="14.5" rx="2.5" />
      <path d="M1 5.25h20" strokeWidth="2.5" />
      <path d="M4 11h5" strokeLinecap="round" />
    </svg>
  );
}

/** A bank: a pediment over three columns on a step. */
function BankIcon(): ReactElement {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M1.5 5.5 9 1.5l7.5 4z" />
      <path d="M3.5 7v5.5M9 7v5.5M14.5 7v5.5" strokeLinecap="round" />
      <path d="M1.5 14.5h15" strokeLinecap="round" />
    </svg>
  );
}
