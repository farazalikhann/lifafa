"use client";

import type { ReactElement } from "react";
import SavedCardPreview, { type SavedCardStatus } from "@/components/auth/SavedCardPreview";
import SignInForm from "@/components/auth/SignInForm";
import WhatsAppLink from "@/components/legal/WhatsAppLink";
import { clarityEvent } from "@/lib/clarity";

/**
 * The sign-in page for a visitor with a card waiting (app/login/page.tsx):
 * their card, why to sign in, Google, "Continue with email", two lines of
 * reassurance and a way to ask for help.
 */
export default function CardLogin({
  status,
  handoff,
  placeholder,
  redirectTo,
  initialError,
}: {
  status: SavedCardStatus;
  /** The handed-over card's id, when there is one. */
  handoff: string | null;
  /** The chosen design's gallery picture, shown until the card arrives (SavedCardPreview). */
  placeholder: string | null;
  redirectTo: string;
  initialError: string | null;
}): ReactElement {
  return (
    <div className="flex flex-col">
      <SavedCardPreview
        status={status}
        handoff={handoff}
        placeholder={placeholder}
        onShown={(shown) => {
          if (shown === "card") {
            clarityEvent("login_view_with_card");
          }
        }}
      />

      <div className="mt-6">
        <SignInForm redirectTo={redirectTo} initialError={initialError} withEmail />
      </div>

      <ul className="mt-5 flex flex-col gap-1.5 text-[0.8125rem] leading-snug text-[var(--lifafa-muted)]">
        {[
          "Free to design. Pay only when you are ready to share.",
          "We never post anything. Your card stays private until you share it.",
        ].map((line) => (
          <li key={line} className="flex items-start gap-2">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-px size-4 shrink-0 text-[var(--lifafa-marigold)]">
              <path d="M5 10.5l3 3L15 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {line}
          </li>
        ))}
      </ul>

      <p className="mt-4 text-center text-[0.8125rem] text-[var(--lifafa-muted)]">
        Need help?{" "}
        <WhatsAppLink className="min-h-11 font-medium text-[var(--lifafa-marigold)] underline underline-offset-4" />
      </p>
    </div>
  );
}
