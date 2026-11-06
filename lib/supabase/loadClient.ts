import type { createClient } from "@/lib/supabase/client";

/**
 * The browser client (lib/supabase/client.ts), fetched the first time it is
 * asked for rather than with the page.
 *
 * It is the largest thing a page would otherwise download before it can be
 * used, and most pages only need it a moment later: to ask who is signed in
 * (hooks/useUser.ts) or at the press of a button. Asked for twice, it is
 * fetched once; the client itself is shared, as createBrowserClient keeps one.
 */
/**
 * Starts fetching the client without waiting for it: for a page that will
 * need it at the press of a button, so the press does not wait on a
 * download. /create calls it as a design opens, well before "Save and
 * continue", whose handoff to Chrome must not be held up (Wizard.tsx).
 */
export function preloadClient(): void {
  void import("@/lib/supabase/client").catch(() => {
    /* Fetched again when it is asked for. */
  });
}

export async function loadClient(): Promise<ReturnType<typeof createClient>> {
  const { createClient: create } = await import("@/lib/supabase/client");

  return create();
}
