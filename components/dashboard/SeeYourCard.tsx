import type { ReactElement } from "react";

/**
 * "See your card", at the top of an unpaid card's dashboard.
 *
 * The button opens the card's own guest link in a new tab. The host is the one
 * person an unpaid card opens for (getGuestEvent in lib/db/inviteEvent.ts), so
 * it is the real card, cover and all, as guests will get it once it is paid.
 *
 * Beside it, the same link drawn small: the page itself in a frame, at a phone's
 * width and scaled down, so it is the cover as it is now, never a picture that
 * can fall behind the card. It cannot be clicked into, focused or read out; the
 * link around it opens the card like the button does.
 */

/* The phone the thumbnail is drawn at, and how far it is scaled down. */
const PHONE_WIDTH = 360;
const PHONE_HEIGHT = 640;
const SCALE = 0.25;

export default function SeeYourCard({
  inviteUrl,
}: {
  inviteUrl: string;
}): ReactElement {
  return (
    <section
      aria-label="See your card"
      className="flex items-center gap-4 rounded-2xl border border-[var(--lifafa-cream)]/15 bg-[var(--lifafa-cream)]/[0.04] p-4 sm:gap-6 sm:p-5"
    >
      <a
        href={inviteUrl}
        target="_blank"
        rel="noopener"
        aria-hidden="true"
        tabIndex={-1}
        className="relative block shrink-0 overflow-hidden rounded-xl border border-[var(--lifafa-cream)]/20 bg-black/30"
        style={{ width: PHONE_WIDTH * SCALE, height: PHONE_HEIGHT * SCALE }}
      >
        <iframe
          src={inviteUrl}
          title="Your card's cover"
          loading="lazy"
          tabIndex={-1}
          /* No navigating this page away; the card's own scripts still run. */
          sandbox="allow-scripts allow-same-origin"
          className="pointer-events-none absolute top-0 left-0 origin-top-left border-0"
          style={{
            width: PHONE_WIDTH,
            height: PHONE_HEIGHT,
            transform: `scale(${SCALE})`,
          }}
        />
      </a>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[var(--lifafa-cream)] px-6 text-lg font-semibold text-[var(--lifafa-ink,#111)] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:w-auto sm:self-start sm:px-10"
        >
          See your card
        </a>
        <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
          Opens your card exactly as your guests will see it.
        </p>
      </div>
    </section>
  );
}
