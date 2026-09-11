import type { Metadata } from "next";
import type { ReactElement } from "react";
import Link from "next/link";
import PassCheckin from "@/components/checkin/PassCheckin";
import { createClient } from "@/lib/supabase/server";

/* A pass address is a secret for the door, not a page for a search engine. */
export const metadata: Metadata = {
  title: "Guest check-in",
  robots: { index: false, follow: false },
};

/**
 * Where a guest's pass lands when a host scans it with their phone's own
 * camera rather than the scanner in the dashboard.
 *
 * HOST ONLY, AND IT SAYS SO WITHOUT GIVING ANYTHING AWAY. This server shell
 * only asks whether anyone is signed in. A visitor who is not — a guest who
 * scanned their own pass, a stranger with a photo of one — is asked to sign in
 * and told nothing about who the pass belongs to. Ownership is decided by the
 * server action the client component calls, which asks the session again
 * rather than trusting this page.
 *
 * NOT A GET THAT WRITES. The check-in happens in a server action the page
 * calls once it is on screen, never during this render, so a link preview, a
 * prefetch or a restored tab cannot mark somebody arrived by loading the
 * address.
 */
export default async function CheckinPassPage({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<ReactElement> {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return (
      <main className="mx-auto flex min-h-screen max-w-[520px] flex-col items-center justify-center gap-5 px-6 text-center">
        <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--lifafa-cream)]">
          Sign in to check this guest in
        </p>
        <p className="max-w-sm text-sm leading-relaxed text-[var(--lifafa-muted)]">
          Only the host of the invitation can check a guest in. If this is your
          own pass, keep it on your phone: it is scanned at the entrance.
        </p>
        <Link
          href={`/login?redirectTo=${encodeURIComponent(`/checkin/${token}`)}`}
          className="flex min-h-12 items-center justify-center rounded-xl bg-[var(--lifafa-marigold)] px-6 text-base font-semibold text-[var(--lifafa-ink)] transition-transform duration-150 hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
        >
          I am the host — sign in
        </Link>
      </main>
    );
  }

  return <PassCheckin token={token} />;
}
