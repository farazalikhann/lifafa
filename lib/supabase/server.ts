import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * The server client, for server components, server actions and route handlers.
 *
 * Still the anon key — this is not an escalation. What it adds is the session:
 * Supabase stores the host's auth tokens in cookies, and reading them here is
 * what makes `auth.uid()` resolve to the signed-in host inside every RLS policy.
 * Without the cookie plumbing below, a server render would query as `anon` and a
 * host would see none of their own events.
 *
 * For the one job that genuinely needs to bypass RLS, see lib/supabase/admin.ts.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    url === undefined ||
    url.length === 0 ||
    anonKey === undefined ||
    anonKey.length === 0
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Copy .env.example to .env.local and fill it in.",
    );
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        /*
          A server component renders after the response headers are settled, so
          writing a cookie from one throws. That is expected rather than an
          error to surface: the refreshed token is written by middleware on the
          next request instead, and swallowing it here is what lets the same
          factory serve both a component that cannot write and a route handler
          that can.
        */
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* Called from a server component. Middleware refreshes the session. */
        }
      },
    },
  });
}
