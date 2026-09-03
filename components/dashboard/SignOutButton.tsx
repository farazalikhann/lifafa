"use client";

import type { ReactElement } from "react";
import { useUser } from "@/hooks/useUser";

/**
 * Sign out, in the dashboard's top bar.
 *
 * Only ever rendered inside /dashboard, which the middleware has already
 * guaranteed is signed in — so there is no signed-out branch to draw here.
 */
export default function SignOutButton(): ReactElement {
  const { signOut } = useUser();

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      className="min-h-11 shrink-0 rounded-full border border-[var(--lifafa-hairline)] px-4 text-[0.8125rem] font-medium whitespace-nowrap text-[var(--lifafa-muted)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] hover:text-[var(--lifafa-cream)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
    >
      Sign out
    </button>
  );
}
