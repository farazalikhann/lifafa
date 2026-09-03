import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * The browser client.
 *
 * Carries the anon key and nothing else. That key is public by design — it ships
 * in the JavaScript bundle and anyone can read it — so it is not a secret and is
 * not what protects the data. Row Level Security is: every request made with
 * this client arrives at Postgres as either `anon` or an authenticated user, and
 * the policies in supabase/migrations/0001_initial.sql decide what that role can
 * see. If a policy is wrong, this key is the thing that exploits it.
 *
 * Never import lib/supabase/admin.ts from anything this file can reach.
 */

function readEnv(name: string, value: string | undefined): string {
  if (value === undefined || value.length === 0) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and fill it in.`,
    );
  }

  return value;
}

export function createClient() {
  return createBrowserClient<Database>(
    /*
      Inlined by name rather than read off a variable: Next replaces
      `process.env.NEXT_PUBLIC_*` at build time only when it can see the whole
      expression literally, and a dynamic lookup would compile to undefined.
    */
    readEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    readEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  );
}
