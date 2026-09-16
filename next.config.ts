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
 * That is what shipped to production. next.config.ts is evaluated
 * before webpack starts and is the last point where a build missing these can
 * still be stopped, so it is stopped here — loudly, and while there is still a
 * log for someone to read.
 */
const REQUIRED_BROWSER_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

/**
 * This deployment's public Vercel host, for lib/siteUrl.ts to build links on.
 *
 * Vercel describes each deployment in system variables that the server can
 * read and the browser cannot, since only NEXT_PUBLIC_ names reach client code.
 * So the host is picked here, while the build still has them, and passed on
 * through `env` below. Next inlines `env` into the server and browser bundles
 * alike, which is what keeps a server render and its hydration on one link.
 *
 * Production takes the project's production domain and never VERCEL_URL.
 * VERCEL_URL is the per-deployment address, and on this project it answers
 * with a redirect to Vercel's sign in page: Deployment Protection covers every
 * address except the production domain. An invite built on it would show a
 * guest a Vercel login. A preview takes its branch address, which is protected
 * too, but a preview is only opened by the host testing it.
 *
 * The same choice Next itself makes for metadataBase when none is given, in
 * next/dist/lib/metadata/resolvers/resolve-url.js. Empty off Vercel.
 */
function vercelHost(): string {
  switch (process.env.VERCEL_ENV) {
    case "production":
      return process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "";
    case "preview":
      return process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL ?? "";
    default:
      return "";
  }
}

/** Whether a NEXT_PUBLIC_SITE_URL value names an http(s) address. */
function isSiteAddress(value: string): boolean {
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
    ? value
    : `https://${value}`;

  try {
    const { protocol } = new URL(withScheme);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

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

    /*
      Inlined like the keys above, so a value that is not an address would not
      fail here either. lib/siteUrl.ts would quietly skip it, and every invite
      link would be built on the fallback instead of the domain it names —
      which, since the fallback is now the live domain rather than the request's
      own host, is a failure that looks entirely healthy in production and shows
      up only on a preview deploy or a dev server.
    */
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();

    if (siteUrl.length > 0 && !isSiteAddress(siteUrl)) {
      throw new Error(
        [
          `Cannot build: NEXT_PUBLIC_SITE_URL is "${siteUrl}", which is not a web address.`,
          "",
          "Set it to the site's origin, for example https://example.com, or",
          "remove it to use this deployment's Vercel address.",
        ].join("\n"),
      );
    }

    /* Said in the build log, so which address a deployment uses is never a guess. */
    console.log(
      `[lifafa] Invite links: ${
        siteUrl.length > 0
          ? `${siteUrl} (NEXT_PUBLIC_SITE_URL)`
          : vercelHost().length > 0
            ? `https://${vercelHost()} (Vercel, ${process.env.VERCEL_ENV})`
            : "https://getlifafa.co.in (the fallback in lib/siteUrl.ts — nothing configured)"
      }`,
    );
  }

  return {
    env: {
      LIFAFA_VERCEL_HOST: vercelHost(),
    },
  };
}
