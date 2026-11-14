import type { ReactElement } from "react";

/**
 * "Start your card", over the gallery, for a host who has just signed in and
 * has no invitation yet and no card waiting in this browser: they are sent
 * here from the dashboard rather than shown an empty list
 * (app/dashboard/page.tsx). Drawn the same by the server's first screen
 * (GalleryFirstScreen) and by the wizard, so nothing moves when it takes over.
 */
export default function SignedInWelcome(): ReactElement {
  return (
    <p
      role="status"
      data-signed-in-welcome=""
      /* Spans both columns of the editor's grid; see ExistingInvitationsNotice. */
      className="rounded-2xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3 text-sm leading-relaxed text-[var(--lifafa-cream)] sm:px-5 lg:col-span-2"
    >
      <span className="font-semibold">Start your card.</span>{" "}
      <span className="text-[var(--lifafa-cream)]/85">
        You are signed in. Choose a design below to begin.
      </span>
    </p>
  );
}
