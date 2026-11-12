import { createAdminClient } from "@/lib/supabase/admin";
import { isHandoffId } from "@/lib/handoff/link";
import { hasCardOutline, toPendingCard, type PendingCard } from "@/lib/pendingCard";

/**
 * Whether the card a /login link names is really waiting on the server, and
 * the card itself, so the sign-in page can show it (app/login/page.tsx).
 *
 * READ ONLY. The card is not moved, adopted or removed here: that is
 * adoptDraftHandoff's, once sign in brings the visitor back to /create
 * (lib/handoff/actions.ts). Server code only: it reads the private bucket.
 *
 * Never holds the page up: the page is drawn and usable without it, and asks
 * for the card once it is up (components/auth/SavedCardPreview.tsx). An
 * answer that has not come within PEEK_MS is "unknown", and the page asks
 * again. PEEK_MS was 1.5 seconds, which a cold read of the bucket could take
 * on its own (0.7 to 1.4 seconds were measured), and the card was then never
 * shown at all.
 */

const BUCKET = "draft-handoffs";
/** As in lib/handoff/actions.ts. */
const TTL_MS = 24 * 60 * 60 * 1000;
const PEEK_MS = 6000;

export type HandoffPeek =
  /** Waiting to be saved to the account. */
  | { status: "saved"; card: PendingCard }
  /** Already saved to an account: the receipt is there, the card is in the account. */
  | { status: "adopted" }
  /** No such card, or past its day. */
  | { status: "missing" }
  /** Storage did not answer in time. */
  | { status: "unknown" };

async function readJson(path: string): Promise<unknown> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(path);

  if (error !== null || data === null) {
    return null;
  }

  try {
    return JSON.parse(await data.text()) as unknown;
  } catch {
    return null;
  }
}

async function peek(id: string): Promise<HandoffPeek> {
  const [stored, receipt] = await Promise.all([
    readJson(`${id}.json`),
    readJson(`adopted/${id}.json`),
  ]);

  if (
    typeof stored === "object" &&
    stored !== null &&
    "savedAt" in stored &&
    typeof stored.savedAt === "number" &&
    Date.now() - stored.savedAt <= TTL_MS &&
    "card" in stored &&
    hasCardOutline(stored.card)
  ) {
    return { status: "saved", card: toPendingCard(stored.card) };
  }

  return receipt !== null ? { status: "adopted" } : { status: "missing" };
}

export async function peekDraftHandoff(id: unknown): Promise<HandoffPeek> {
  if (!isHandoffId(id)) {
    return { status: "missing" };
  }

  try {
    return await Promise.race([
      peek(id),
      new Promise<HandoffPeek>((resolve) => setTimeout(() => resolve({ status: "unknown" }), PEEK_MS)),
    ]);
  } catch (cause: unknown) {
    console.error("[handoff] peek failed:", cause);
    return { status: "unknown" };
  }
}
