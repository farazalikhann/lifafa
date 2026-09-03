import type { ReactElement } from "react";
import Link from "next/link";
import InviteExperience from "@/components/invite/InviteExperience";
import { getEventByInviteCode } from "@/lib/db/events";

/**
 * A guest opening their link.
 *
 * A server component: the event is read here, through the one anonymous path
 * the schema allows, and only the reply interaction crosses to the client.
 * Nothing on this route asks anyone to sign in.
 */

/** Shown for an unknown code, and for a read that failed. */
function InviteNotFound({ reason }: { reason: string }): ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[var(--lifafa-ink)] px-6 text-center">
      <p className="font-[family-name:var(--font-display)] text-2xl font-semibold text-balance text-[var(--lifafa-cream)]">
        This invitation could not be found.
      </p>
      <p className="max-w-[34ch] text-sm leading-relaxed text-[var(--lifafa-muted)]">
        {reason}
      </p>
      <Link
        href="/"
        className="mt-2 min-h-11 rounded px-2 text-sm font-medium text-[var(--lifafa-marigold)] underline decoration-transparent underline-offset-4 transition-colors duration-200 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]"
      >
        Go to Lifafa
      </Link>
    </main>
  );
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): Promise<ReactElement> {
  const { inviteCode } = await params;
  const result = await getEventByInviteCode(inviteCode);

  /*
    A failed read and an unknown code are shown the same way. A guest can do
    nothing about either, and the difference is only meaningful in the server
    log — where dbFailure has already written it.
  */
  if (!result.ok) {
    return (
      <InviteNotFound reason="Something went wrong opening this invitation. Please try the link again in a moment." />
    );
  }

  if (result.data === null) {
    return (
      <InviteNotFound reason="The link may have been mistyped, or this invitation may have been removed by the host." />
    );
  }

  return <InviteExperience event={result.data} />;
}
