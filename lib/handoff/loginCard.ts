"use server";

import { peekDraftHandoff } from "@/lib/handoff/peek";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * What the sign-in page needs to know about a handed-over card, asked for
 * once the page is up (components/auth/SavedCardPreview.tsx): whether it is
 * still waiting, and the card itself for its still picture. The page does not
 * wait on this before it is sent, so its buttons come first on a slow line.
 *
 * Read only, like lib/handoff/peek.ts. The id is the card's only key, as on
 * /login and /create. No phone numbers: the picture does not need them.
 */
export type LoginCardRead =
  | { status: "saved"; draft: EventDraft; config: CardConfig }
  | { status: "adopted" | "missing" | "unknown" };

export async function loginCardFor(id: unknown): Promise<LoginCardRead> {
  const peek = await peekDraftHandoff(id);

  return peek.status === "saved"
    ? { status: "saved", draft: { ...peek.card.draft, contacts: [] }, config: peek.card.config }
    : { status: peek.status };
}
