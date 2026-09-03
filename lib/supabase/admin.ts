import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/*
  ────────────────────────────────────────────────────────────────────────────
  GUARD — runs the moment this module is evaluated, before anything is exported.

  The service role key bypasses Row Level Security completely. A client holding
  it can read every host's guest list, every phone number, and rewrite any row,
  because Postgres never applies a single policy to it. So the one rule this
  file exists to enforce is that it never runs anywhere a browser can see.

  `typeof window` is the check because it is the one difference that survives
  bundling: if this module is ever pulled into a Client Component, the import
  graph drags it into the browser bundle and this line throws on load — loudly,
  at the top of the module, rather than quietly leaking a key at the first
  query. A build that boots is a build where nothing client-side imports it.

  This is the backstop, not the only defence. See the note below on why the key
  cannot reach the bundle in the first place.
  ────────────────────────────────────────────────────────────────────────────
*/
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/admin.ts was imported into client code. This module holds a key that bypasses Row Level Security and must only ever run on the server.",
  );
}

/**
 * The service role client.
 *
 * WHY THE KEY CANNOT REACH THE BROWSER BUNDLE, in three independent layers:
 *
 *  1. The variable is named SUPABASE_SECRET_KEY, with no NEXT_PUBLIC_ prefix.
 *     Next inlines exactly and only `NEXT_PUBLIC_*` into client bundles; every
 *     other `process.env` lookup compiles to undefined on the client. The name
 *     is the protection, so never rename this to NEXT_PUBLIC_ anything.
 *  2. The key is read inside the factory rather than at module scope, so it is
 *     never captured in a module-level constant that a bundler could fold into
 *     output.
 *  3. The guard above throws if the module is evaluated in a browser at all.
 *
 * USE THIS ONLY where RLS genuinely has to be stepped around and the caller has
 * already established who is asking — a webhook confirming a payment, say. For
 * anything acting on behalf of a signed-in host, use lib/supabase/server.ts:
 * going through RLS with the host's own session is what makes a mistake fail
 * closed instead of exposing another host's guests.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (url === undefined || url.length === 0) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }

  /*
    Reports the variable by name and never by value — a thrown message ends up
    in server logs, and a log line is exactly the wrong place for this key.
  */
  if (secretKey === undefined || secretKey.length === 0) {
    throw new Error(
      "SUPABASE_SECRET_KEY is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  return createSupabaseClient<Database>(url, secretKey, {
    auth: {
      /*
        No session to persist and none to refresh: this client is not acting as
        a user, and writing its credentials into any store is how a service key
        escapes the process it was meant to stay inside.
      */
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
