import { PHASE_PRODUCTION_BUILD } from "next/constants";
import type { NextConfig } from "next";

/**
 * The two keys the browser needs, and why this file is the place that checks.
 *
 * Both are read from client code (lib/supabase/client.ts), so Next inlines them
 * while webpack runs: `process.env.NEXT_PUBLIC_SUPABASE_URL` is replaced by a
 * string literal in the bundle, and the environment is never consulted again.
 * Setting them on the server afterwards changes nothing — the value a browser
 * sees was decided at build time and shipped.
 *
 * Which means a build without them does not fail. It succeeds. The lookup falls
 * through to webpack's `process` shim, whose `env` is an empty object, and the
 * bundle carries `undefined` where the URL should be. The deployment goes
 * green, /create serves its HTML, and then the first effect in hooks/useUser.ts
 * calls createClient(), throws "NEXT_PUBLIC_SUPABASE_URL is not set", and the
 * host is left with "Application error: a client-side exception has occurred".
 * Nothing in the build log, and nothing on the server, reports a problem.
 *
 * That is what shipped to lifafa-seven.vercel.app. next.config.ts is evaluated
 * before webpack starts and is the last point where a build missing these can
 * still be stopped, so it is stopped here — loudly, and while there is still a
 * log for someone to read.
 */
const REQUIRED_BROWSER_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export default function nextConfig(phase: string): NextConfig {
  /*
    Production builds only.

    `next dev` is deliberately left alone, so a fresh clone still opens the
    editor before .env.local exists. `next start` is not a build: by then the
    values are either already inlined or already absent, and there is nothing
    left for a check to save.
  */
  if (phase === PHASE_PRODUCTION_BUILD) {
    const missing = REQUIRED_BROWSER_ENV.filter(
      (name) => (process.env[name] ?? "").length === 0,
    );

    if (missing.length > 0) {
      throw new Error(
        [
          `Cannot build: ${missing.join(" and ")} ${
            missing.length === 1 ? "is" : "are"
          } not set.`,
          "",
          "These are inlined into the browser bundle at build time, so a build",
          "without them completes and then fails in every visitor's browser.",
          "",
          "On Vercel: Project Settings -> Environment Variables, set for the",
          "environment being deployed and available to the Build step.",
          "Locally: copy .env.example to .env.local and fill it in.",
        ].join("\n"),
      );
    }
  }

  return {};
}
